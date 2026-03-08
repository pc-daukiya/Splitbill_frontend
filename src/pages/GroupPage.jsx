import { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Receipt, RefreshCw, Plus, Trash2, UserMinus, Wallet, Bell } from 'lucide-react';
import ExpenseForm from '../components/ExpenseForm';
import SkeletonCard from '../components/ui/SkeletonCard';
import { checkTransaction, getAccountBalance, sendPayment } from '../services/algorand';
import { createExpense, createSettlement, deleteGroup, getGroupBalances, getGroupById, getGroupExpenses, removeMember, sendReminder } from '../services/api';
import { getAlgoPriceINR } from '../services/algoPrice';
import { useWallet } from '../context/WalletContext';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const getEntityId = (entity) =>
  entity?.id || entity?.userId || entity?.sub || entity?.walletAddress || entity?.email || entity?.address || '';

const getEntityName = (entity) =>
  entity?.name || entity?.displayName || entity?.fullName || entity?.email || entity?.walletAddress || 'Unknown';

const getWalletAddress = (entity) =>
  entity?.walletAddress || entity?.address || entity?.account || entity?.algorandAddress || '';

const normalizeMembers = (group) => (Array.isArray(group?.members) ? group.members : []);

const formatMoney = (value) => currencyFormatter.format(Number(value) || 0);

const resolveBalanceParties = (balance) => {
  const debtor = balance?.debtor || balance?.from || balance?.payer || balance?.fromMember || {};
  const creditor = balance?.creditor || balance?.to || balance?.payee || balance?.toMember || {};

  const debtorName = balance?.debtorName || balance?.fromName || getEntityName(debtor);
  const creditorName = balance?.creditorName || balance?.toName || getEntityName(creditor);
  const debtorWallet =
    balance?.debtorWalletAddress || balance?.fromWalletAddress || getWalletAddress(debtor);
  const creditorWallet =
    balance?.creditorWalletAddress || balance?.toWalletAddress || getWalletAddress(creditor);
  const amount = Math.abs(
    Number(balance?.amount ?? balance?.netAmount ?? balance?.balance ?? balance?.value ?? 0),
  );

  return {
    debtorName,
    creditorName,
    debtorWallet,
    creditorWallet,
    amount,
  };
};

function GroupPage({ walletAddress }) {
  const { groupId } = useParams();
  const { getAccessTokenSilently } = useAuth0();
  const { backendUserId } = useWallet();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [settlingId, setSettlingId] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [algoPriceINR, setAlgoPriceINR] = useState(null);
  // paymentAmounts[key] = custom amount string the user typed per balance card
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null); // ALGO balance of connected wallet
  const [balanceError, setBalanceError] = useState('');
  const [sendingReminderId, setSendingReminderId] = useState('');
  const [reminderToast, setReminderToast] = useState(null); // { title, message } shown as popup

  // Fetch live ALGO/INR price once on mount for the conversion preview
  useEffect(() => {
    getAlgoPriceINR().then(setAlgoPriceINR).catch(() => setAlgoPriceINR(80));
  }, []);

  // Refresh wallet ALGO balance whenever the connected address changes
  useEffect(() => {
    if (!walletAddress) {
      setWalletBalance(null);
      return;
    }
    getAccountBalance(walletAddress).then(setWalletBalance).catch(() => setWalletBalance(null));
  }, [walletAddress]);

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
      });
    } catch (tokenError) {
      return '';
    }
  }, [getAccessTokenSilently]);

  const loadGroup = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = await getToken();
      const [groupResponse, expensesResponse, balancesResponse] = await Promise.all([
        getGroupById(groupId, token),
        getGroupExpenses(groupId, token).catch(() => []),
        getGroupBalances(groupId, token).catch(() => []),
      ]);
      setGroup(groupResponse?.group || groupResponse);
      setExpenses(Array.isArray(expensesResponse) ? expensesResponse : []);
      setBalances(Array.isArray(balancesResponse) ? balancesResponse : []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load this group.');
    } finally {
      setLoading(false);
    }
  }, [getToken, groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const members = normalizeMembers(group).map((m) => m.user || m);

  // Derive admin status: the user who created the group is the admin
  const isAdmin =
    group?.createdBy?.id != null &&
    backendUserId != null &&
    Number(group.createdBy.id) === Number(backendUserId);

  // A group can be deleted only when all remaining balances are 0
  const allSettled = balances.length === 0;

  const handleExpenseSubmit = async (payload) => {
    setSubmittingExpense(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = await getToken();
      await createExpense(
        {
          groupId: Number(groupId),
          description: payload.description,
          amount: payload.amount,
          paidBy: Number(payload.paidBy),
          splitBetween: (payload.splitBetween || []).map(Number).filter((n) => !Number.isNaN(n)),
        },
        token,
      );
      setShowExpenseForm(false);
      setSuccessMessage('Expense added successfully.');
      await loadGroup();
    } catch (submitError) {
      setError(submitError.message || 'Unable to create expense.');
      throw submitError;
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleSettlePayment = async (balance, index, customPaymentAmount) => {
    console.log('[Settlement] Settle payment clicked', { balance, index, customPaymentAmount });

    const { creditorWallet, amount, debtorName, creditorName } = resolveBalanceParties(balance);
    // amount here = remaining balance (what's still owed)
    const paymentAmt = (customPaymentAmount && Number(customPaymentAmount) > 0)
      ? Math.min(Number(customPaymentAmount), amount)
      : amount;

    console.log('[Settlement] Parties resolved', { debtorName, creditorName, creditorWallet, amount, paymentAmt });
    console.log('[Settlement] Sender wallet (connected):', walletAddress);

    if (!walletAddress) {
      setError('Connect your Pera Wallet before settling a payment.');
      return;
    }

    if (!creditorWallet) {
      setError('Recipient wallet address is missing for this balance.');
      return;
    }

    setSettlingId(balance?.id || `${index}`);
    setError('');
    setBalanceError('');
    setSuccessMessage('');

    try {
      const txId = await sendPayment({
        sender: walletAddress,
        receiver: creditorWallet,
        amount: paymentAmt,
        note: `SplitBill settlement for group ${groupId}`,
      });
      console.log('[Settlement] Payment sent — txId:', txId);

      const transactionStatus = await checkTransaction(txId);
      const token = await getToken();

      await createSettlement(
        {
          groupId: Number(groupId),
          txId,
          fromUserId: balance.fromUser,
          toUserId: balance.toUser,
          amount: paymentAmt,       // paymentAmount (partial or full)
          totalAmount: amount,      // full remaining balance before this payment
          status: transactionStatus.confirmed ? 'confirmed' : 'pending',
        },
        token,
      );
      console.log('[Settlement] Settlement recorded in backend');

      const remaining = amount - paymentAmt;
      if (remaining > 0) {
        setSuccessMessage(
          `Partial payment of ${formatMoney(paymentAmt)} sent to ${creditorName}. Remaining: ${formatMoney(remaining)}. Tx: ${txId}`,
        );
      } else {
        setSuccessMessage(`Full settlement sent from ${debtorName} to ${creditorName}. Tx: ${txId}`);
      }
      // Reset the custom amount for this card
      setPaymentAmounts((prev) => { const next = { ...prev }; delete next[balance?.id || `${index}`]; return next; });
      await loadGroup();
    } catch (settleError) {
      console.error('[Settlement] Settlement failed:', settleError);
      if (settleError.message === 'INSUFFICIENT_BALANCE') {
        setBalanceError('Insufficient ALGO balance. Please add funds to your wallet.');
        // Refresh balance so the button disables immediately
        if (walletAddress) getAccountBalance(walletAddress).then(setWalletBalance).catch(() => {});
      } else {
        setError(settleError.message || 'Unable to settle payment.');
      }
    } finally {
      setSettlingId('');
    }
  };

  const handleSendReminder = async (balance, index) => {
    if (!backendUserId) {
      setError('Unable to identify current user.');
      return;
    }
    const settleKey = balance?.id || `${index}`;
    setSendingReminderId(settleKey);
    setError('');
    setSuccessMessage('');
    try {
      const token = await getToken();
      const result = await sendReminder(
        {
          groupId: Number(groupId),
          senderUserId: Number(backendUserId),
          debtorUserId: Number(balance.fromUser),
          creditorUserId: Number(balance.toUser),
          amountPending: Number(balance.amount ?? balance.remainingAmount ?? 0),
        },
        token,
      );
      const sentTo = result?.sent_to || 'the debtor';
      setReminderToast({
        title: 'Reminder Sent! 🔔',
        message: `${sentTo} has been notified to pay their share.`,
      });
      setTimeout(() => setReminderToast(null), 5000);
    } catch (reminderError) {
      setError(reminderError.message || 'Failed to send reminder.');
    } finally {
      setSendingReminderId('');
    }
  };

  const handleDeleteGroup = async () => {
    if (!backendUserId) {
      setError('Unable to identify current user.');
      return;
    }
    if (!window.confirm('Delete this group? This action cannot be undone.')) return;
    setDeletingGroup(true);
    setError('');
    try {
      const token = await getToken();
      await deleteGroup(Number(groupId), backendUserId, token);
      navigate('/dashboard');
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete group.');
    } finally {
      setDeletingGroup(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!backendUserId) {
      setError('Unable to identify current user.');
      return;
    }
    setRemovingMemberId(userId);
    setError('');
    try {
      const token = await getToken();
      await removeMember(Number(groupId), userId, backendUserId, token);
      setSuccessMessage('Member removed successfully.');
      await loadGroup();
    } catch (removeError) {
      setError(removeError.message || 'Unable to remove member.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-theme-border" />
          <div className="h-8 w-64 rounded-lg bg-theme-border" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex h-24 items-center gap-4 rounded-2xl border border-theme-border bg-theme-surface p-5">
              <div className="h-11 w-11 rounded-xl bg-theme-border" />
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-theme-border" />
                <div className="h-5 w-10 rounded bg-theme-border" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="h-80 rounded-3xl border border-theme-border bg-theme-surface p-6" />
          <div className="h-80 rounded-3xl border border-theme-border bg-theme-surface p-6" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="rounded-3xl border border-theme-border bg-theme-surface p-10">
          <h1 className="text-2xl font-semibold text-theme-text">Group not found</h1>
          <p className="mt-3 text-sm text-theme-subtext">This split may have vanished into the blockchain mist.</p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Reminder sent popup toast — fixed outside any backdrop-filter ancestor */}
      {reminderToast && (
        <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-[9999] flex max-w-xs items-start gap-3 rounded-2xl border border-emerald-500/40 bg-theme-surface p-4 shadow-2xl shadow-theme-border/60">
          <span className="mt-0.5 text-xl">✅</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">{reminderToast.title}</p>
            <p className="mt-1 text-sm text-theme-text">{reminderToast.message}</p>
          </div>
          <button type="button" onClick={() => setReminderToast(null)} className="shrink-0 text-lg leading-none text-theme-subtext hover:text-theme-text">×</button>
        </div>
      )}
      {/* Header */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-theme-subtext transition hover:text-cyan-500"
        >
          <ArrowLeft size={13} />
          Back to dashboard
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Group</p>
        <h1 className="mt-2 text-2xl font-bold text-theme-text sm:text-3xl">
          {group?.groupName || group?.name || 'Untitled group'}
        </h1>
        {group?.description ? (
          <p className="mt-1 text-sm text-theme-subtext">{group.description}</p>
        ) : null}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-theme-border bg-theme-surface p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-theme-subtext">Members</p>
            <p className="mt-0.5 text-2xl font-bold text-theme-text">{members.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-theme-border bg-theme-surface p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Receipt size={20} />
          </div>
          <div>
            <p className="text-xs text-theme-subtext">Expenses</p>
            <p className="mt-0.5 text-2xl font-bold text-theme-text">{expenses.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-theme-border bg-theme-surface p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-bg text-theme-subtext">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-xs text-theme-subtext">Invite code</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-theme-text">{group?.inviteCode || 'Private'}</p>
          </div>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-amber-500/15 px-4 py-3 text-sm text-amber-500">{error}</p> : null}
      {balanceError ? (
        <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-400">
          {balanceError}
        </div>
      ) : null}
      {successMessage ? (
        <p className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-400">{successMessage}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-theme-border bg-theme-surface p-6 shadow-lg shadow-theme-border/30">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Members</p>
                <h2 className="mt-1 text-lg font-semibold text-theme-text">Who's in this group</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseForm((currentValue) => !currentValue)}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                <Plus size={14} />
                {showExpenseForm ? 'Hide' : 'Add expense'}
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {members.map((member) => {
                const memberId = getEntityId(member);
                const isCreator = group?.createdBy?.id != null && Number(group.createdBy.id) === Number(memberId);
                return (
                  <div
                    key={memberId}
                    className="flex flex-col items-start gap-3 rounded-2xl border border-theme-border bg-theme-bg p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 w-full">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-theme-text">{getEntityName(member)}</p>
                        {isCreator && (
                          <span className="shrink-0 rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-semibold text-cyan-400">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm text-theme-subtext">{member?.email || getWalletAddress(member) || 'Wallet pending'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full border border-theme-border px-3 py-1 text-xs text-theme-subtext">
                        {getWalletAddress(member) ? 'Wallet ready' : 'Wallet not linked'}
                      </span>
                      {isAdmin && !isCreator && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(Number(memberId))}
                          disabled={removingMemberId === Number(memberId)}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Remove member"
                        >
                          <UserMinus size={12} />
                          {removingMemberId === Number(memberId) ? 'Removing…' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {showExpenseForm ? (
            <ExpenseForm
              members={members}
              onSubmit={handleExpenseSubmit}
              onCancel={() => setShowExpenseForm(false)}
              submitting={submittingExpense}
              groupId={Number(groupId)}
            />
          ) : null}

          <div className="rounded-3xl border border-theme-border bg-theme-surface p-6 shadow-lg shadow-theme-border/30">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Expenses</p>
            <h2 className="mt-1 text-lg font-semibold text-theme-text">Shared costs</h2>

            <div className="mt-6 space-y-3">
              {expenses.length ? (
                expenses.map((expense, index) => (
                  <div
                    key={expense?.id || `${expense?.description}-${index}`}
                    className="rounded-2xl border border-theme-border bg-theme-bg p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 w-full sm:w-auto">
                        <p className="truncate text-base font-semibold text-theme-text">{expense?.description || 'Shared expense'}</p>
                        <p className="mt-1 truncate text-sm text-theme-subtext">
                          Paid by {expense?.payer?.name || expense?.paidByName || expense?.paidBy || 'Unknown payer'}
                        </p>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-lg font-semibold text-theme-text">{formatMoney(expense?.amount)}</p>
                        <p className="text-sm text-theme-subtext">
                          {expense?.splits?.length || expense?.splitBetween?.length || expense?.participantCount || 0} participants
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-theme-border bg-theme-bg p-8 text-center">
                  <p className="text-sm text-theme-subtext">No expenses yet. Add the first one and make accounting slightly less painful.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-theme-border bg-theme-surface p-6 shadow-lg shadow-theme-border/30">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Balances</p>
          <h2 className="mt-1 text-lg font-semibold text-theme-text">Settle with Algorand</h2>
          <p className="mt-1.5 text-sm text-theme-subtext">
            Each settlement signs a Testnet transaction with Pera Wallet and records the txId on-chain.
          </p>

          <div className="mt-6 space-y-4">
            {balances.length ? (
              balances.map((balance, index) => {
                const { debtorName, creditorName, debtorWallet, creditorWallet, amount } = resolveBalanceParties(balance);
                const settleKey = balance?.id || `${index}`;
                const paidAmount = Number(balance?.paidAmount ?? 0);
                const totalAmount = Number(balance?.totalAmount ?? amount);
                // amount from resolveBalanceParties already = remaining (from backend)
                const customAmt = paymentAmounts[settleKey];
                const paymentValue = customAmt !== undefined ? customAmt : String(amount.toFixed(2));
                const paymentNum = Math.min(Math.max(Number(paymentValue) || 0, 0), amount);

                return (
                  <div
                    key={settleKey}
                    className="rounded-2xl border border-theme-border bg-theme-bg p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-theme-text">
                          {debtorName} owes {creditorName}
                        </p>

                        {/* Paid / Remaining breakdown */}
                        <div className="mt-2 flex flex-wrap gap-3">
                          <div className="inline-flex flex-wrap items-baseline gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
                              <span className="text-xs text-theme-subtext">Remaining:</span>
                                <span className="text-lg font-bold text-theme-text">{formatMoney(amount)}</span>
                            {algoPriceINR && (
                              <>
                                <span className="text-sm text-theme-subtext">≈</span>
                                <span className="text-lg font-bold text-cyan-500">
                                  {(amount / algoPriceINR).toFixed(4)} ALGO
                                </span>
                                <span className="text-xs text-theme-subtext">(@ ₹{algoPriceINR}/ALGO)</span>
                              </>
                            )}
                          </div>
                          {paidAmount > 0 && (
                            <div className="inline-flex items-baseline gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                              <span className="text-xs text-theme-subtext">Paid:</span>
                              <span className="text-sm font-semibold text-emerald-600">{formatMoney(paidAmount)}</span>
                              <span className="text-xs text-theme-subtext">of {formatMoney(totalAmount)}</span>
                            </div>
                          )}
                        </div>

                        <p className="mt-3 truncate text-xs text-theme-subtext">
                          Recipient: {creditorWallet || 'Missing wallet address'}
                        </p>
                        <p className="mt-1 truncate text-xs text-theme-subtext">
                          Sender: {debtorWallet || walletAddress || 'Connect wallet to proceed'}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-start lg:items-end gap-3">
                        {/* Custom payment amount input */}
                        <div className="w-full lg:w-44">
                          <label className="mb-1 block text-xs text-theme-subtext">Pay amount (₹)</label>
                          <input
                            type="number"
                            min="0.01"
                            max={amount}
                            step="0.01"
                            value={paymentValue}
                            onChange={(e) =>
                              setPaymentAmounts((prev) => ({ ...prev, [settleKey]: e.target.value }))
                            }
                            className="w-full rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text placeholder-theme-subtext focus:border-cyan-500 focus:outline-none"
                            placeholder={amount.toFixed(2)}
                          />
                          {paymentNum > 0 && paymentNum < amount && (
                            <p className="mt-1 text-xs text-amber-600">
                              Remaining after: {formatMoney(amount - paymentNum)}
                            </p>
                          )}
                        </div>

                        {algoPriceINR && paymentNum > 0 && (
                          <p className="text-xs text-theme-subtext">
                            Wallet will show{' '}
                            <span className="font-semibold text-cyan-600">
                              {(paymentNum / algoPriceINR).toFixed(4)} ALGO
                            </span>
                          </p>
                        )}

                        {/* Send Reminder button — visible to admin or creditor, never to the debtor */}
                        {(isAdmin || Number(backendUserId) === Number(balance.toUser)) &&
                          Number(backendUserId) !== Number(balance.fromUser) && (
                          <button
                            type="button"
                            onClick={() => handleSendReminder(balance, index)}
                            disabled={sendingReminderId === settleKey}
                            className="inline-flex w-full lg:w-auto items-center justify-center gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Bell size={13} />
                            {sendingReminderId === settleKey ? 'Sending…' : 'Remind'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSettlePayment(balance, index, paymentNum)}
                          disabled={
                            !walletAddress ||
                            !creditorWallet ||
                            settlingId === settleKey ||
                            paymentNum <= 0 ||
                            // Only disable when balance is confirmed (not null) AND too low
                            (walletBalance !== null && algoPriceINR !== null
                              ? walletBalance < paymentNum / algoPriceINR + 0.001
                              : false)
                          }
                          className="inline-flex w-full lg:w-auto items-center justify-center rounded-2xl bg-theme-surface px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {settlingId === settleKey
                            ? 'Settling...'
                            : algoPriceINR && paymentNum > 0
                              ? `Pay ${(paymentNum / algoPriceINR).toFixed(4)} ALGO`
                              : 'Pay now'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
                <div className="rounded-2xl border border-dashed border-theme-border bg-theme-bg p-8 text-center">
                <p className="text-sm text-theme-subtext">All balances settled — everyone is square!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin controls — delete group (only when all balances settled) */}
      {isAdmin && (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-400">Admin controls</p>
          <h2 className="mt-1 text-lg font-semibold text-theme-text">Danger zone</h2>
          <p className="mt-1.5 text-sm text-theme-subtext">
            {allSettled
              ? 'All balances are settled. You may delete this group.'
              : 'The group can only be deleted once all member balances are fully settled.'}
          </p>
          <button
            type="button"
            onClick={handleDeleteGroup}
            disabled={!allSettled || deletingGroup}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deletingGroup ? 'Deleting…' : 'Delete Group'}
          </button>
        </div>
      )}
    </div>
  );
}

export default GroupPage;
