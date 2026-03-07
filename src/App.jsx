import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import MobileNav from './components/navigation/MobileNav';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import GroupPage from './pages/GroupPage';
import { WalletContext } from './context/WalletContext';
import { ThemeProvider } from './context/ThemeContext';
import { syncUser, updateWalletAddress } from './services/api';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-theme-bg">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute h-full w-full animate-ping rounded-2xl bg-cyan-500/20" />
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500 text-xl font-black text-slate-950 shadow-lg shadow-cyan-500/30">
            ₳
          </div>
        </div>
        <p className="mt-4 animate-pulse text-sm font-medium tracking-wide text-cyan-400">
          Loading your identity...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function LandingPage() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-theme-surface px-4 py-16">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-48 -top-48 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-48 -right-48 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500 text-2xl font-black text-slate-950 shadow-lg shadow-cyan-500/30">
          ₳
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-theme-text">SplitBill</h1>
        <p className="mt-3 text-base text-theme-subtext">
          Split expenses with friends. Settle on Algorand.
        </p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => loginWithRedirect()}
            className="w-full rounded-2xl bg-cyan-500 py-4 text-base font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Loading…' : 'Login with Auth0'}
          </button>
          <button
            type="button"
            onClick={() =>
              loginWithRedirect({
                authorizationParams: { screen_hint: 'signup' },
              })
            }
            className="w-full rounded-2xl border border-theme-border py-4 text-base font-semibold text-theme-subtext transition hover:border-theme-subtext hover:text-theme-text"
          >
            Create account
          </button>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-3">
          {[
            { label: 'Auth0', sub: 'Secure login' },
            { label: 'Pera', sub: 'Wallet' },
            { label: 'ALGO', sub: 'Settlement' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-theme-border bg-theme-bg p-4"
            >
              <p className="text-sm font-bold text-theme-text">{item.label}</p>
              <p className="mt-0.5 text-xs text-theme-subtext">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppShell({ children }) {
  return (
    <div className="flex min-h-screen bg-theme-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col md:ml-64">
        <Navbar />
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-8 lg:px-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

function App() {
  const { isAuthenticated, user, getAccessTokenSilently } = useAuth0();
  const [walletAddress, setWalletAddress] = useState('');
  const [backendUserId, setBackendUserId] = useState(null);

  // Sync Auth0 user to the backend DB on login
  useEffect(() => {
    if (!isAuthenticated || !user?.sub) return;
    (async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
        });
        const synced = await syncUser(
          { auth0Id: user.sub, email: user.email, name: user.name },
          token,
        );
        setBackendUserId(synced?.id ?? null);
      } catch {
        // non-fatal
      }
    })();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  const handleWalletConnected = async (address) => {
    setWalletAddress(address);
    if (backendUserId && address) {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
        });
        await updateWalletAddress(backendUserId, address, token);
      } catch {
        // non-fatal
      }
    }
  };

  const walletContextValue = {
    walletAddress,
    backendUserId,
    onWalletConnected: handleWalletConnected,
    onWalletDisconnected: () => setWalletAddress(''),
  };

  return (
    <ThemeProvider>
      <WalletContext.Provider value={walletContextValue}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppShell>
                <Dashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:groupId"
          element={
            <ProtectedRoute>
              <AppShell>
                <GroupPage walletAddress={walletAddress} />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </WalletContext.Provider>
    </ThemeProvider>
  );
}

export default App;

