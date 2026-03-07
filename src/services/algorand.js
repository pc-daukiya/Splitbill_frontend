import algosdk from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';

const algodUrl = process.env.REACT_APP_ALGOD_URL || 'https://testnet-api.algonode.cloud';
const indexerUrl = process.env.REACT_APP_INDEXER_URL || 'https://testnet-idx.algonode.cloud';

const algodClient = new algosdk.Algodv2('', algodUrl, '');
const indexerClient = new algosdk.Indexer('', indexerUrl, '');
const peraWallet = new PeraWalletConnect({ shouldShowSignTxnToast: true });

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
  if (!sender) {
    throw new Error('Connect your wallet before settling a payment.');
  }

  if (!receiver) {
    throw new Error('Recipient wallet address is missing.');
  }

  if (!amount || Number(amount) <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const suggestedParams = await algodClient.getTransactionParams().do();
  const transaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver,
    amount: algosdk.algosToMicroalgos(Number(amount)),
    note: note ? new TextEncoder().encode(note) : undefined,
    suggestedParams,
  });

  let signedTransactions;
  try {
    signedTransactions = await peraWallet.signTransaction([
      {
        txn: transaction,
        signers: [sender],
      },
    ]);
  } catch (signError) {
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

  // algosdk v3: sendRawTransaction().do() returns { txid } (lowercase)
  const { txid: txId } = await algodClient.sendRawTransaction(signedTransactions).do();
  await algosdk.waitForConfirmation(algodClient, txId, 4);

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
    confirmed: Boolean(pending?.['confirmed-round'] || indexedTransaction?.confirmedRound),
    pending,
    indexedTransaction,
  };
};
