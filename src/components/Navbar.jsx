import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useWallet } from '../context/WalletContext';
import WalletConnect from './WalletConnect';
import ThemeSwitcher from './ThemeSwitcher';

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
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-theme-border/80 bg-theme-surface/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      {/* Mobile logo — sidebar is hidden on mobile */}
      <Link to="/dashboard" className="flex items-center gap-2.5 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500 text-sm font-black text-slate-950">
          ₳
        </div>
        <span className="text-sm font-bold text-theme-text">SplitBill</span>
      </Link>

      {/* Desktop page title */}
      <h2 className="hidden text-base font-semibold text-theme-text md:block">{title}</h2>

      {/* Desktop: theme switcher + wallet connect */}
      <div className="ml-auto hidden md:flex md:items-center md:gap-3">
        <ThemeSwitcher />
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
            className="h-8 w-8 rounded-xl border border-theme-border object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-theme-border text-xs font-bold text-theme-text">
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;

