import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Bell, Volume2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import WalletConnect from './WalletConnect';
import ThemeSwitcher from './ThemeSwitcher';
import { fetchReminders, markReminderRead } from '../services/api';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

/** Build full playable URL from a server-relative path like /uploads/audio/reminder_xxx.mp3 */
const resolveAudioUrl = (audioUrl) => {
  if (!audioUrl) return null;
  if (audioUrl.startsWith('http')) return audioUrl;
  return `${API_BASE}${audioUrl}`;
};

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/groups': 'Group Details',
};

function Navbar() {
  const { pathname } = useLocation();
  const { user, getAccessTokenSilently } = useAuth0();
  const { walletAddress, onWalletConnected, onWalletDisconnected, backendUserId } = useWallet();
  const [reminders, setReminders]     = useState([]);
  const [showBell, setShowBell]       = useState(false);
  const [toast, setToast]             = useState(null);  // { message, audioUrl }
  const bellRef                       = useRef(null);
  const audioRef                      = useRef(null);
  const prevUnreadRef                 = useRef(0);

  const title =
    Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ||
    'SplitBill';

  const getToken = async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
      });
    } catch {
      return '';
    }
  };

  // Poll for reminders every 15 seconds
  useEffect(() => {
    if (!backendUserId) return;

    const poll = async () => {
      const token = await getToken();
      const data  = await fetchReminders(backendUserId, token);
      setReminders(data);

      const unread = data.filter((r) => !r.read).length;
      if (unread > prevUnreadRef.current) {
        // New reminder arrived — store a toast so the user can play it manually
        // (auto-play without a user gesture is blocked by all modern browsers)
        const latest = data.find((r) => !r.read);
        if (latest) {
          setToast({
            message: latest.message,
            audioUrl: resolveAudioUrl(latest.audioUrl),
          });
          // Auto-dismiss toast after 8 seconds
          setTimeout(() => setToast(null), 8000);
        }
      }
      prevUnreadRef.current = unread;
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUserId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowBell(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = reminders.filter((r) => !r.read).length;

  const handleBellClick = async () => {
    const opening = !showBell;
    setShowBell(opening);
    if (opening && unreadCount > 0) {
      // Mark all visible unread reminders as read
      const token = await getToken();
      const unread = reminders.filter((r) => !r.read);
      await Promise.all(unread.map((r) => markReminderRead(r.id, token)));
      setReminders((prev) => prev.map((r) => ({ ...r, read: true })));
      prevUnreadRef.current = 0;

      // Play the most recent audio on bell-click — this IS a user gesture so browsers allow it
      const latest = unread.find((r) => r.audioUrl);
      if (latest?.audioUrl && audioRef.current) {
        audioRef.current.src = resolveAudioUrl(latest.audioUrl);
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const playAudio = (audioUrl) => {
    if (!audioRef.current || !audioUrl) return;
    audioRef.current.src = audioUrl;
    audioRef.current.play().catch(() => {});
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      Number(val) || 0,
    );

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Toast OUTSIDE <header> — backdrop-filter on header would trap position:fixed children */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999] flex max-w-sm items-start gap-3 rounded-2xl border border-amber-500/40 bg-slate-900 p-4 shadow-2xl shadow-slate-950/60">
          <span className="mt-0.5 text-xl">🔔</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Payment Reminder</p>
            <p className="mt-1 text-sm text-slate-200">{toast.message}</p>
            {toast.audioUrl && (
              <button
                type="button"
                onClick={() => playAudio(toast.audioUrl)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/30"
              >
                <Volume2 size={12} /> Play voice reminder
              </button>
            )}
          </div>
          <button type="button" onClick={() => setToast(null)} className="shrink-0 text-lg leading-none text-slate-500 hover:text-white">×</button>
        </div>
      )}

    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-theme-border/60 bg-theme-surface/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      {/* Mobile logo — sidebar is hidden on mobile */}
      <Link to="/dashboard" className="flex items-center gap-2.5 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500 text-sm font-black text-slate-950">
          ₳
        </div>
        <span className="text-sm font-bold text-theme-text">SplitBill</span>
      </Link>

      {/* Desktop page title */}
      <h2 className="hidden text-base font-semibold text-theme-text md:block">{title}</h2>

      {/* Wallet connect — full on desktop, avatar only on mobile */}
      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitcher />

        {/* Bell notification */}
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={handleBellClick}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-theme-border bg-theme-surface text-theme-subtext transition hover:border-theme-subtext hover:text-theme-text"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showBell && (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-theme-border bg-theme-surface shadow-xl shadow-theme-border/30">
              <div className="border-b border-theme-border px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-theme-subtext">Reminders</p>
              </div>
              {reminders.length === 0 ? (
                <p className="px-4 py-5 text-center text-sm text-theme-subtext">No reminders yet</p>
              ) : (
                <ul className="max-h-72 divide-y divide-theme-border overflow-y-auto">
                  {reminders.map((r) => (
                    <li key={r.id} className={`flex items-start gap-3 px-4 py-3 ${r.read ? 'opacity-50' : ''}`}>
                      <span className="mt-0.5 text-base">🔔</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-theme-text">{r.message}</p>
                        {r.audioUrl && (
                          <button
                            type="button"
                            onClick={() => playAudio(resolveAudioUrl(r.audioUrl))}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300"
                          >
                            <Volume2 size={11} /> Play
                          </button>
                        )}
                      </div>
                      {!r.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="hidden md:block">
        <WalletConnect
          address={walletAddress}
          onConnect={onWalletConnected}
          onDisconnect={onWalletDisconnected}
        />
        </div>
      </div>

      {/* Mobile avatar */}
      <div className="md:hidden">
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
    </>
  );
}

export default Navbar;