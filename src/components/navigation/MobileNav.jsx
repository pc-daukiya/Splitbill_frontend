import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet } from 'lucide-react';

const link = ({ isActive }) =>
  `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
    isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
  }`;

export default function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl md:hidden">
      <NavLink to="/dashboard" className={link}>
        <LayoutDashboard size={20} />
        <span>Dashboard</span>
      </NavLink>
      <NavLink to="/dashboard" className={link}>
        <Wallet size={20} />
        <span>Wallet</span>
      </NavLink>
    </nav>
  );
}
