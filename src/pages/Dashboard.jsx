import { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Users, Receipt, RefreshCw, Plus, LogIn } from 'lucide-react';
import GroupCard from '../components/GroupCard';
import SkeletonCard from '../components/ui/SkeletonCard';
import { createGroup, getGroups, joinGroup, syncUser } from '../services/api';

const defaultCreateState = {
  name: '',
  description: '',
};

function Dashboard() {
  const { getAccessTokenSilently, user } = useAuth0();
  const [groups, setGroups] = useState([]);
  const [createForm, setCreateForm] = useState(defaultCreateState);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [backendUserId, setBackendUserId] = useState(null);

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
      });
    } catch (tokenError) {
      return '';
    }
  }, [getAccessTokenSilently]);

  useEffect(() => {
    if (!user?.sub) return;
    (async () => {
      try {
        const token = await getToken();
        const synced = await syncUser(
          { auth0Id: user.sub, email: user.email, name: user.name },
          token,
        );
        setBackendUserId(synced.id);
      } catch {
        // non-fatal — group creation will surface the missing ID as an error
      }
    })();
  }, [user, getToken]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = await getToken();
      const response = await getGroups(token);
      setGroups(Array.isArray(response) ? response : response?.groups || []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load groups right now.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreateChange = (field) => (event) => {
    setCreateForm((currentForm) => ({
      ...currentForm,
      [field]: event.target.value,
    }));
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();

    if (!createForm.name.trim()) {
      setError('Group name is required.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const token = await getToken();
      const groupName = createForm.name.trim();
      console.log('[createGroup] payload:', { groupName, createdByUserId: backendUserId });
      await createGroup(
        {
          groupName,
          createdByUserId: backendUserId,
        },
        token,
      );
      setCreateForm(defaultCreateState);
      await loadGroups();
    } catch (createError) {
      setError(createError.message || 'Unable to create the group.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (event) => {
    event.preventDefault();

    if (!inviteCode.trim()) {
      setError('Invite code is required.');
      return;
    }

    setJoining(true);
    setError('');

    try {
      const token = await getToken();
      await joinGroup(
        {
          inviteCode: inviteCode.trim(),
          userId: backendUserId,
        },
        token,
      );
      setInviteCode('');
      await loadGroups();
    } catch (joinError) {
      setError(joinError.message || 'Unable to join this group.');
    } finally {
      setJoining(false);
    }
  };

  const totalExpenses = groups.reduce(
    (sum, g) => sum + (g?.expenseCount || g?.expenses?.length || 0),
    0,
  );
  const totalMembers = groups.reduce(
    (sum, g) => sum + (g?.members?.length || g?.memberCount || 0),
    0,
  );

  return (
    <div className="space-y-8">
      {/* Welcome heading */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          Welcome back{user?.given_name ? `, ${user.given_name}` : ''} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Track your shared expenses and settle on Algorand.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Your groups</p>
            <p className="mt-0.5 text-2xl font-bold text-white">{groups.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Receipt size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total expenses</p>
            <p className="mt-0.5 text-2xl font-bold text-white">{totalExpenses}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Active members</p>
            <p className="mt-0.5 text-2xl font-bold text-white">{totalMembers}</p>
          </div>
        </div>
      </div>

      {/* Main grid: forms + groups list */}
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* Left: Create + Join forms */}
        <div className="space-y-5">
          {/* Create group */}
          <form
            onSubmit={handleCreateGroup}
            className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <Plus size={16} />
              </div>
              <h2 className="text-base font-semibold text-white">New group</h2>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                  htmlFor="group-name"
                >
                  Group name
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={createForm.name}
                  onChange={handleCreateChange('name')}
                  placeholder="Goa trip, office lunch…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                  htmlFor="group-description"
                >
                  Description <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  id="group-description"
                  value={createForm.description}
                  onChange={handleCreateChange('description')}
                  rows="3"
                  placeholder="What's this group for?"
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {creating ? 'Creating…' : 'Create group'}
            </button>
          </form>

          {/* Join group */}
          <form
            onSubmit={handleJoinGroup}
            className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-700/60 text-slate-300">
                <LogIn size={16} />
              </div>
              <h2 className="text-base font-semibold text-white">Join a group</h2>
            </div>
            <div className="mt-5">
              <label
                className="mb-1.5 block text-xs font-medium text-slate-300"
                htmlFor="invite-code"
              >
                Invite code
              </label>
              <input
                id="invite-code"
                type="text"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="SPLIT-ALGO-2026"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm uppercase tracking-[0.15em] text-white outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              disabled={joining}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/60 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {joining ? 'Joining…' : 'Join group'}
            </button>
          </form>
        </div>

        {/* Right: Groups list */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30">
          <div className="flex items-center justify-between border-b border-slate-800 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">
                Your groups
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">Everything you're tracking</h2>
            </div>
            <button
              type="button"
              onClick={loadGroups}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : groups.length ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {groups.map((group) => (
                <GroupCard key={group?.id || group?.groupId} group={group} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-950/50 p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800">
                <Users size={24} className="text-slate-500" />
              </div>
              <h3 className="text-base font-semibold text-white">No groups yet</h3>
              <p className="mt-2 text-sm text-slate-400">
                Create your first split and invite the squad.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
