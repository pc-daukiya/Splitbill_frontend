import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useWallet } from '../context/WalletContext';
import WalletConnect from './WalletConnect';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/groups': 'Group Details',
};

function Navbar() {
  const { pathname } = useLocation();
  const { user } = useAuth0();
  const { walletAddress, onWalletConnected, onWalletDisconnected } = useWallet();

  const title =
    Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ||
    'SplitBill';

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-slate-800/60 bg-[#0B0F1A]/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      {/* Mobile logo — sidebar is hidden on mobile */}
      <Link to="/dashboard" className="flex items-center gap-2.5 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500 text-sm font-black text-slate-950">
          ₳
        </div>
        <span className="text-sm font-bold text-white">SplitBill</span>
      </Link>

      {/* Desktop page title */}
      <h2 className="hidden text-base font-semibold text-white md:block">{title}</h2>

      {/* Wallet connect — full on desktop, avatar only on mobile */}
      <div className="ml-auto hidden md:block">
        <WalletConnect
          address={walletAddress}
          onConnect={onWalletConnected}
          onDisconnect={onWalletDisconnected}
        />
      </div>

      {/* Mobile: just the user avatar */}
      <div className="ml-auto md:hidden">
        {user?.picture ? (
          <img
            src={user.picture}
            alt={user?.name || 'User'}
            className="h-8 w-8 rounded-xl border border-slate-700 object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-700 text-xs font-bold text-white">
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;

