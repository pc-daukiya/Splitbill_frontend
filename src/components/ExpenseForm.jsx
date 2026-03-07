import { useEffect, useState } from 'react';

const getMemberId = (member) => member?.id || member?.userId || member?.walletAddress || member?.email;
const getMemberLabel = (member) => member?.name || member?.displayName || member?.email || member?.walletAddress || 'Member';

function ExpenseForm({ members = [], onSubmit, onCancel, submitting = false }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitBetween, setSplitBetween] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const memberIds = members.map(getMemberId).filter(Boolean);

    setPaidBy((currentValue) => currentValue || memberIds[0] || '');
    setSplitBetween(memberIds);
  }, [members]);

  const handleMemberToggle = (memberId) => {
    setSplitBetween((currentMembers) => {
      if (currentMembers.includes(memberId)) {
        return currentMembers.filter((item) => item !== memberId);
      }

      return [...currentMembers, memberId];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    if (!paidBy) {
      setError('Select who paid the expense.');
      return;
    }

    if (!splitBetween.length) {
      setError('Choose at least one member to split the expense with.');
      return;
    }

    try {
      await onSubmit({
        description: description.trim(),
        amount: Number(amount),
        paidBy,
        splitBetween,
      });

      setDescription('');
      setAmount('');
      setError('');
    } catch (submitError) {
      setError(submitError.message || 'Unable to save expense.');
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">New expense</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Record a shared cost</h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          Close
        </button>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="expense-description">
            Description
          </label>
          <input
            id="expense-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Dinner, rent, gas..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="expense-amount">
              Amount
            </label>
            <input
              id="expense-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="expense-paid-by">
              Who paid
            </label>
            <select
              id="expense-paid-by"
              value={paidBy}
              onChange={(event) => setPaidBy(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
            >
              {members.map((member) => {
                const memberId = getMemberId(member);

                return (
                  <option key={memberId} value={memberId}>
                    {getMemberLabel(member)}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-slate-200">Split between</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((member) => {
              const memberId = getMemberId(member);
              const isChecked = splitBetween.includes(memberId);

              return (
                <label
                  key={memberId}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                    isChecked
                      ? 'border-cyan-400 bg-cyan-500/10 text-white'
                      : 'border-slate-700 bg-slate-950/70 text-slate-300'
                  }`}
                >
                  <span>{getMemberLabel(member)}</span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleMemberToggle(memberId)}
                    className="h-4 w-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-400"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {error ? <p className="text-sm text-amber-300">{error}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Saving expense...' : 'Save expense'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ExpenseForm;
