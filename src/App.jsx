import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthButtons from './components/AuthButtons';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import GroupPage from './pages/GroupPage';
import { syncUser, updateWalletAddress } from './services/api';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 px-8 py-10 text-center shadow-lg shadow-slate-950/30">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
          <p className="mt-4 text-sm text-slate-300">Preparing your secure SplitBill session...</p>
        </div>
      </div>
    );
  }

  return children;
}

function LandingScreen() {
  const { isAuthenticated } = useAuth0();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate bg-[size:32px_32px] opacity-30" />
      <div className="relative mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-400">Decentralized expense sharing</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Split bills on Algorand without splitting your sanity.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Create groups, track shared expenses, and settle balances with secure Algorand Testnet payments powered by Auth0, Pera Wallet, and a polished React experience.
            </p>
            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-slate-100">
              <AuthButtons />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6 shadow-glow">
            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Live flow</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">How SplitBill works</h2>
                </div>
                <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Testnet ready
                </div>
              </div>

              <div className="mt-8 space-y-4">
                {[
                  'Authenticate with Auth0 to create a secure user session.',
                  'Connect a Pera Wallet account and keep your Testnet address handy.',
                  'Create groups, log expenses, and review computed balances.',
                  'Settle payments on-chain and send the transaction id back to the API.',
                ].map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500 text-sm font-black text-slate-950">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-7 text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently } = useAuth0();
  const [walletAddress, setWalletAddress] = useState('');
  const [backendUserId, setBackendUserId] = useState(null);

  // Sync Auth0 user to the backend DB on login and retain their DB id
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
        // non-fatal — user can still use the app
      }
    })();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  // When a Pera Wallet account is connected, persist the address to the users table
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <main>
          <LandingScreen />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar
        walletAddress={walletAddress}
        onWalletConnected={handleWalletConnected}
        onWalletDisconnected={() => setWalletAddress('')}
      />
      <main>
        <section className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user?.name || 'User profile'}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : null}
                <div>
                  <p className="text-lg font-semibold text-white">{user?.name || 'Authenticated user'}</p>
                  <p className="text-sm text-slate-300">Logged in as: {user?.email || 'No email available'}</p>
                </div>
              </div>
              <AuthButtons />
            </div>
          </div>
        </section>
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/:groupId"
            element={
              <ProtectedRoute>
                <GroupPage walletAddress={walletAddress} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
