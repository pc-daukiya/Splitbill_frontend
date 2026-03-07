import { Link } from 'react-router-dom';

const formatCurrency = (value = 0) => {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

function GroupCard({ group }) {
  const memberCount = group?.members?.length || group?.memberCount || 0;
  const expenseCount = group?.expenses?.length || group?.expenseCount || 0;
  const totalSpent = group?.totalSpent || group?.totalExpenses || 0;

  return (
    <article className="group rounded-3xl border border-theme-border bg-theme-surface p-6 shadow-lg shadow-theme-border/30 transition hover:-translate-y-1 hover:border-cyan-400/60 hover:shadow-cyan-200/30/60">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 pr-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">
            Group
          </p>
          <h3 className="mt-2 truncate text-xl font-semibold text-theme-text">{group?.groupName || group?.name || 'Untitled group'}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-theme-subtext">
            {group?.description || 'Track group expenses and settle balances on Algorand Testnet.'}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-theme-border px-3 py-1 text-xs font-medium text-theme-subtext">
          {group?.inviteCode ? `Invite: ${group.inviteCode}` : 'Private'}
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl bg-theme-bg p-3">
          <dt className="text-theme-subtext">Members</dt>
          <dd className="mt-1 text-lg font-semibold text-theme-text">{memberCount}</dd>
        </div>
        <div className="rounded-2xl bg-theme-bg p-3">
          <dt className="text-theme-subtext">Expenses</dt>
          <dd className="mt-1 text-lg font-semibold text-theme-text">{expenseCount}</dd>
        </div>
        <div className="rounded-2xl bg-theme-bg p-3">
          <dt className="text-theme-subtext">Total spent</dt>
          <dd className="mt-1 text-lg font-semibold text-theme-text">{formatCurrency(totalSpent)}</dd>
        </div>
      </dl>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-theme-subtext">Tap in to review balances and settle up.</p>
        <Link
          to={`/groups/${group?.id || group?.groupId}`}
          className="inline-flex items-center rounded-xl bg-theme-surface px-4 py-2 text-sm font-semibold text-slate-900 transition group-hover:bg-cyan-300"
        >
          Open group
        </Link>
      </div>
    </article>
  );
}

export default GroupCard;
