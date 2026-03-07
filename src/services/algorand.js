import algosdk from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';

const algodUrl = process.env.REACT_APP_ALGOD_URL || 'https://testnet-api.algonode.cloud';
const indexerUrl = process.env.REACT_APP_INDEXER_URL || 'https://testnet-idx.algonode.cloud';

const algodClient = new algosdk.Algodv2('', algodUrl, '');
const indexerClient = new algosdk.Indexer('', indexerUrl, '');
// shouldShowSignTxnToast removed — prevents the mobile-only deep-link toast on desktop
const peraWallet = new PeraWalletConnect();

export const connectWallet = async () => {
  const accounts = await peraWallet.connect();
  return accounts?.[0] || '';
};

export const restoreWalletSession = async () => {
  const accounts = await peraWallet.reconnectSession();
  return accounts?.[0] || '';
};

export const disconnectWallet = async () => {
  await peraWallet.disconnect();
};

export const sendPayment = async ({ sender, receiver, amount, note }) => {
  console.log('[Algorand] sendPayment called', { sender, receiver, amount });

  if (!sender) {
    throw new Error('Connect your wallet before settling a payment.');
  }

  if (!receiver) {
    throw new Error('Recipient wallet address is missing.');
  }

  if (!amount || Number(amount) <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  console.log('[Algorand] Fetching transaction params from Testnet...');
  const suggestedParams = await algodClient.getTransactionParams().do();
  console.log('[Algorand] Transaction params received:', suggestedParams);

  // algosdk v3: algosToMicroalgos was removed — multiply manually
  const microAlgos = Math.round(Number(amount) * 1_000_000);
  console.log('[Algorand] Building transaction — microAlgos:', microAlgos);

  const transaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver,
    amount: microAlgos,
    note: note ? new TextEncoder().encode(note) : undefined,
    suggestedParams,
  });

  console.log('[Algorand] Transaction built, requesting Pera Wallet signature...');

  let signedTransactions;
  try {
    // @perawallet/connect v1: signTransaction expects SignerTransaction[][] (array of groups)
    signedTransactions = await peraWallet.signTransaction([[
      {
        txn: transaction,
        signers: [sender],
      },
    ]]);
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

  console.log('[Algorand] Transaction signed, broadcasting to Testnet...');

  // algosdk v3: sendRawTransaction().do() returns { txid } (lowercase)
  const { txid: txId } = await algodClient.sendRawTransaction(signedTransactions).do();
  console.log('[Algorand] Broadcasted — txId:', txId, '— awaiting confirmation...');

  await algosdk.waitForConfirmation(algodClient, txId, 4);
  console.log('[Algorand] Transaction confirmed on-chain:', txId);

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
