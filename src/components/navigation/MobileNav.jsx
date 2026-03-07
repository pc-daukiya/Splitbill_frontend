import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, X } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import WalletConnect from '../WalletConnect';

const linkStyle = (isActive) =>
  `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
      isActive ? 'text-cyan-400' : 'text-theme-subtext hover:text-theme-subtext'
  }`;

export default function MobileNav() {
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const { walletAddress, onWalletConnected, onWalletDisconnected } = useWallet();

  return (
    <>
      {isWalletOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div 
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsWalletOpen(false)} 
          />
          <div className="relative rounded-t-3xl border-t border-theme-border bg-theme-surface p-6 pb-12 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-theme-text">Wallet</h3>
              <button 
                onClick={() => setIsWalletOpen(false)}
                className="rounded-full bg-theme-bg p-2 text-theme-subtext transition hover:bg-theme-border hover:text-theme-subtext"
              >
                <X size={16} />
              </button>
            </div>
            <WalletConnect 
              address={walletAddress}
              onConnect={onWalletConnected}
              onDisconnect={onWalletDisconnected}
            />
          </div>
        </div>
      )}

      <nav 
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-theme-border bg-theme-surface/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => linkStyle(isActive)}
          onClick={() => setIsWalletOpen(false)}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <button 
          onClick={() => setIsWalletOpen(true)}
          className={linkStyle(isWalletOpen)}
        >
          <Wallet size={20} />
          <span>Wallet</span>
        </button>
      </nav>
    </>
  );
}
