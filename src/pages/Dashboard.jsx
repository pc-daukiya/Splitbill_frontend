import { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import GroupCard from '../components/GroupCard';
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
      return await getAccessTokenSilently();
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

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-cyan-500/10 via-slate-900/80 to-slate-900 p-8 shadow-xl shadow-slate-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Welcome back{user?.given_name ? `, ${user.given_name}` : ''}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Create expense groups, invite friends, and settle balances with Algorand Testnet payments from one tidy place.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-sm text-slate-400">Groups</p>
              <p className="mt-2 text-2xl font-semibold text-white">{groups.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-sm text-slate-400">Invite-ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {groups.filter((group) => group?.inviteCode).length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-sm text-slate-400">Tracked expenses</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {groups.reduce((sum, group) => sum + (group?.expenseCount || group?.expenses?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Your profile</p>
          <div className="mt-4 flex items-center gap-4">
            <img
              src={user?.picture}
              alt={user?.name || 'User profile'}
              className="h-16 w-16 rounded-2xl border border-slate-700 object-cover"
            />
            <div>
              <h2 className="text-lg font-semibold text-white">{user?.name || 'Anonymous explorer'}</h2>
              <p className="text-sm text-slate-400">{user?.email || 'No email provided'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <form
            onSubmit={handleCreateGroup}
            className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Create group</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Start a new split</h2>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="group-name">
                  Group name
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={createForm.name}
                  onChange={handleCreateChange('name')}
                  placeholder="Goa getaway"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="group-description">
                  Description
                </label>
                <textarea
                  id="group-description"
                  value={createForm.description}
                  onChange={handleCreateChange('description')}
                  rows="4"
                  placeholder="Weekend food, rides, and stay"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {creating ? 'Creating group...' : 'Create group'}
            </button>
          </form>

          <form
            onSubmit={handleJoinGroup}
            className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Join group</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Enter an invite code</h2>
            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="invite-code">
                Invite code
              </label>
              <input
                id="invite-code"
                type="text"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="SPLIT-ALGO-2026"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm uppercase tracking-[0.2em] text-white outline-none transition focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              disabled={joining}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {joining ? 'Joining group...' : 'Join group'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30">
          <div className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Your groups</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Everything you are tracking</h2>
            </div>
            <button
              type="button"
              onClick={loadGroups}
              className="inline-flex items-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Refresh list
            </button>
          </div>

          {error ? <p className="mt-4 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{error}</p> : null}

          {loading ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-56 animate-pulse rounded-3xl bg-slate-800/70" />
              ))}
            </div>
          ) : groups.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {groups.map((group) => (
                <GroupCard key={group?.id || group?.groupId} group={group} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-950/50 p-10 text-center">
              <h3 className="text-xl font-semibold text-white">No groups yet</h3>
              <p className="mt-2 text-sm text-slate-400">
                Create your first split and invite the squad. Bills wait for no one.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
