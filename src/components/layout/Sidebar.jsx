import { NavLink } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { LayoutDashboard, LogOut } from 'lucide-react';

const navLink = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-cyan-500/10 text-cyan-400'
      : 'text-theme-subtext hover:bg-theme-bg hover:text-theme-text'
  }`;

export default function Sidebar() {
  const { user, logout } = useAuth0();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-theme-border bg-theme-surface md:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-theme-border px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-base font-black text-slate-950">
          ₳
        </div>
        <div>
          <p className="text-sm font-bold text-theme-text">SplitBill</p>
          <p className="text-xs text-theme-subtext">Algorand Testnet</p>
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
      <div className="border-t border-theme-border p-4">
        <div className="flex items-center gap-3 rounded-xl bg-theme-bg p-3">
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user?.name || 'User'}
              className="h-8 w-8 rounded-lg border border-theme-border object-cover"
            />
          ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-theme-border text-xs font-bold text-theme-text">
              {(user?.name || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-theme-text">{user?.name || 'User'}</p>
            <p className="truncate text-xs text-theme-subtext">{user?.email || ''}</p>
          </div>
          <button
            type="button"
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="rounded-lg p-1.5 text-theme-subtext transition hover:bg-theme-bg hover:text-theme-subtext"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
