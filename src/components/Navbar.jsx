import { Link, NavLink } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import WalletConnect from './WalletConnect';

const navItemClassName = ({ isActive }) =>
  `rounded-xl px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`;

function Navbar({ walletAddress, onWalletConnected, onWalletDisconnected }) {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950 shadow-glow">
              ₳
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">SplitBill</p>
              <p className="text-sm text-slate-300">Auth0 + Pera Wallet + Algorand Testnet</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <NavLink to="/dashboard" className={navItemClassName}>
              Dashboard
            </NavLink>
          </nav>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          {isAuthenticated ? (
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
              <WalletConnect
                address={walletAddress}
                onConnect={onWalletConnected}
                onDisconnect={onWalletDisconnected}
              />

              <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                <img
                  src={user?.picture}
                  alt={user?.name || 'User'}
                  className="h-11 w-11 rounded-xl border border-slate-700 object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{user?.name || 'Authenticated user'}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email || 'Profile ready'}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => loginWithRedirect()}
              disabled={isLoading}
              className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Loading...' : 'Login'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
