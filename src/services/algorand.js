import algosdk from 'algosdk';
import peraWalletService from './perawallet';
import { convertINRToAlgo } from './algoPrice';

// Algorand TestNet endpoints (never use MainNet here)
const algodUrl = process.env.REACT_APP_ALGOD_URL || 'https://testnet-api.algonode.cloud';
const indexerUrl = process.env.REACT_APP_INDEXER_URL || 'https://testnet-idx.algonode.cloud';

const algodClient = new algosdk.Algodv2('', algodUrl, '');
const indexerClient = new algosdk.Indexer('', indexerUrl, '');

// ─── Wallet helpers (delegate to the singleton) ──────────────────────────────

export const connectWallet = async () => {
  const accounts = await peraWalletService.connect();
  return accounts?.[0] || '';
};

export const restoreWalletSession = async () => {
  return peraWalletService.reconnect();
};

export const disconnectWallet = async () => {
  await peraWalletService.disconnect();
};

// ─── Payment ─────────────────────────────────────────────────────────────────

export const sendPayment = async ({ sender, receiver, amount, note }) => {
  console.log('[Algorand] sendPayment called', { sender, receiver, amount });
  console.log('[Algorand] Wallet accounts:', peraWalletService.accounts);

  if (!sender) {
    throw new Error('Connect your wallet before settling a payment.');
  }

  if (!receiver) {
    throw new Error('Recipient wallet address is missing.');
  }

  if (!amount || Number(amount) <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  // Fetch live ALGO/INR price and convert (DB stays in INR — conversion only for the txn)
  const { algoAmount, priceUsed } = await convertINRToAlgo(amount);
  console.log('[Algorand] INR entered:', amount, '₹');
  console.log('[Algorand] Current ALGO price INR: ₹' + priceUsed);
  console.log('[Algorand] Converted ALGO:', algoAmount, 'ALGO');

  console.log('[Algorand] Fetching transaction params from Testnet...');
  const suggestedParams = await algodClient.getTransactionParams().do();
  console.log('[Algorand] Transaction params received:', suggestedParams);

  // Convert ALGO → microALGO (algosdk v3: algosToMicroalgos was removed)
  const microAlgos = Math.round(algoAmount * 1_000_000);
  console.log('[Algorand] microAlgos to send:', microAlgos);

  // algosdk v3: uses `sender`/`receiver` (not `from`/`to`)
  const transaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver,
    amount: microAlgos,
    note: note ? new TextEncoder().encode(note) : new TextEncoder().encode('SplitBill Settlement'),
    suggestedParams,
  });

  console.log('[Algorand] Transaction built — requesting Pera Wallet signature...');
  console.log('[Algorand] Sender wallet:', sender);
  console.log('[Algorand] Receiver wallet:', receiver);
  console.log('[Algorand] Sending:', algoAmount.toFixed(6), 'ALGO (₹' + amount + ' @ ₹' + priceUsed + '/ALGO)');

  let signedTransactions;
  try {
    // Uses the singleton — sign() wraps with the correct [[...]] group format for v1.5.x
    signedTransactions = await peraWalletService.sign(transaction, sender);
  } catch (signError) {
    console.error('[Algorand] Signing error:', signError);
    if (
      signError?.data?.type === 'SIGN_TRANSACTIONS_CANCELLED' ||
      signError?.data?.type === 'CONNECT_MODAL_CLOSED' ||
      signError?.message?.toLowerCase().includes('cancelled') ||
      signError?.message?.toLowerCase().includes('rejected')
    ) {
      throw new Error('Transaction signing was cancelled.');
    }
    throw signError;
  }

  console.log('[Algorand] Transaction signed — broadcasting to Testnet...');

  // algosdk v3: sendRawTransaction().do() returns { txid } (lowercase d)
  const { txid: txId } = await algodClient.sendRawTransaction(signedTransactions).do();
  console.log('[Algorand] Broadcasted — txId:', txId, '— awaiting confirmation...');

  await algosdk.waitForConfirmation(algodClient, txId, 4);
  console.log('[Algorand] Transaction confirmed on Algorand TestNet:', txId);

  return txId;
};

export const checkTransaction = async (txId) => {
  if (!txId) {
    throw new Error('A transaction id is required.');
  }

  const [pendingResult, indexerResult] = await Promise.allSettled([
    algodClient.pendingTransactionInformation(txId).do(),
    indexerClient.lookupTransactionByID(txId).do(),
  ]);

  const pending = pendingResult.status === 'fulfilled' ? pendingResult.value : null;
  const indexedTransaction =
    indexerResult.status === 'fulfilled' ? indexerResult.value?.transaction || null : null;

  return {
    txId,
    // Indexer returns 'confirmed-round' (kebab); algod pending info uses confirmedRound (camelCase in v3)
    confirmed: Boolean(
      pending?.confirmedRound ||
      pending?.['confirmed-round'] ||
      indexedTransaction?.['confirmed-round'] ||
      indexedTransaction?.confirmedRound,
    ),
    pending,
    indexedTransaction,
  };
};
