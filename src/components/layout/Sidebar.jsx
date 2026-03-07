import { NavLink } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { LayoutDashboard, LogOut } from 'lucide-react';

const navLink = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-cyan-500/10 text-cyan-400'
      : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
  }`;

export default function Sidebar() {
  const { user, logout } = useAuth0();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-slate-950 md:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-base font-black text-slate-950">
          ₳
        </div>
        <div>
          <p className="text-sm font-bold text-white">SplitBill</p>
          <p className="text-xs text-slate-500">Algorand Testnet</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavLink to="/dashboard" className={navLink}>
          <LayoutDashboard size={17} />
          Dashboard
        </NavLink>
      </nav>

      {/* User info + logout */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-900 p-3">
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user?.name || 'User'}
              className="h-8 w-8 rounded-lg border border-slate-700 object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-xs font-bold text-white">
              {(user?.name || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name || 'User'}</p>
            <p className="truncate text-xs text-slate-500">{user?.email || ''}</p>
          </div>
          <button
            type="button"
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
