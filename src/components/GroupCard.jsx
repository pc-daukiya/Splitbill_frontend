import { Link } from 'react-router-dom';

const formatCurrency = (value = 0) => {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

function GroupCard({ group }) {
  const memberCount = group?.members?.length || group?.memberCount || 0;
  const expenseCount = group?.expenses?.length || group?.expenseCount || 0;
  const totalSpent = group?.totalSpent || group?.totalExpenses || 0;

  return (
    <article className="group rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30 transition hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-cyan-950/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">
            Group
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">{group?.groupName || group?.name || 'Untitled group'}</h3>
          <p className="mt-2 text-sm text-slate-400">
            {group?.description || 'Track group expenses and settle balances on Algorand Testnet.'}
          </p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
          {group?.inviteCode ? `Invite: ${group.inviteCode}` : 'Private'}
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl bg-slate-950/70 p-3">
          <dt className="text-slate-400">Members</dt>
          <dd className="mt-1 text-lg font-semibold text-white">{memberCount}</dd>
        </div>
        <div className="rounded-2xl bg-slate-950/70 p-3">
          <dt className="text-slate-400">Expenses</dt>
          <dd className="mt-1 text-lg font-semibold text-white">{expenseCount}</dd>
        </div>
        <div className="rounded-2xl bg-slate-950/70 p-3">
          <dt className="text-slate-400">Total spent</dt>
          <dd className="mt-1 text-lg font-semibold text-white">${formatCurrency(totalSpent)}</dd>
        </div>
      </dl>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-400">Tap in to review balances and settle up.</p>
        <Link
          to={`/groups/${group?.id || group?.groupId}`}
          className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition group-hover:bg-cyan-300"
        >
          Open group
        </Link>
      </div>
    </article>
  );
}

export default GroupCard;
