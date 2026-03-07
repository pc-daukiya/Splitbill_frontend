import { useEffect, useState } from 'react';
import {
  connectWallet,
  disconnectWallet,
  restoreWalletSession,
} from '../services/algorand';
import peraWalletService from '../services/perawallet';

const shortenAddress = (address = '') => {
  if (!address) {
    return 'Not connected';
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

function WalletConnect({ address, onConnect, onDisconnect }) {
  const [accountAddress, setAccountAddress] = useState(address || '');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAccountAddress(address || '');
  }, [address]);

  useEffect(() => {
    let isMounted = true;

    // Use singleton's reconnect — ensures one shared WalletConnect bridge
    const restoreSession = async () => {
      try {
        const restoredAddress = await peraWalletService.reconnect();

        if (isMounted && restoredAddress) {
          setAccountAddress(restoredAddress);
          onConnect?.(restoredAddress);
        }
      } catch (restoreError) {
        if (isMounted) {
          setError('Unable to restore wallet session.');
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [onConnect]);

  const handleConnect = async () => {
    setIsBusy(true);
    setError('');

    try {
      const nextAddress = await connectWallet();
      setAccountAddress(nextAddress || '');
      onConnect?.(nextAddress || '');
    } catch (connectError) {
      setError(connectError.message || 'Unable to connect wallet.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setIsBusy(true);
    setError('');

    try {
      await disconnectWallet();
      setAccountAddress('');
      onDisconnect?.();
    } catch (disconnectError) {
      setError(disconnectError.message || 'Unable to disconnect wallet.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/30 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">
            Pera Wallet
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {accountAddress
              ? `Connected: ${shortenAddress(accountAddress)}`
              : 'Connect an Algorand Testnet account to settle balances.'}
          </p>
        </div>

        {accountAddress ? (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isBusy}
            className="inline-flex items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isBusy ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={isBusy}
            className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isBusy ? 'Connecting...' : 'Connect wallet'}
          </button>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-amber-300">{error}</p> : null}
    </div>
  );
}

export default WalletConnect;
