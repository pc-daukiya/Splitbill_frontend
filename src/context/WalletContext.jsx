import { createContext, useContext } from 'react';

export const WalletContext = createContext({
  walletAddress: '',
  backendUserId: null,
  onWalletConnected: () => {},
  onWalletDisconnected: () => {},
});

export const useWallet = () => useContext(WalletContext);
