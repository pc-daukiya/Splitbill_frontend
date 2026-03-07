import { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Receipt, RefreshCw, Plus, Wallet } from 'lucide-react';
import ExpenseForm from '../components/ExpenseForm';
import SkeletonCard from '../components/ui/SkeletonCard';
import { checkTransaction, sendPayment } from '../services/algorand';
import { createExpense, createSettlement, getGroupBalances, getGroupById, getGroupExpenses } from '../services/api';
import { getAlgoPriceINR } from '../services/algoPrice';

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

  // Fetch live ALGO/INR price once on mount for the conversion preview
  useEffect(() => {
    getAlgoPriceINR().then(setAlgoPriceINR).catch(() => setAlgoPriceINR(80));
  }, []);

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

  const handleSettlePayment = async (balance, index) => {
    console.log('[Settlement] Settle payment clicked', { balance, index });

    const { creditorWallet, amount, debtorName, creditorName } = resolveBalanceParties(balance);
    console.log('[Settlement] Parties resolved', { debtorName, creditorName, creditorWallet, amount });
    console.log('[Settlement] Sender wallet (connected):', walletAddress);

    if (!walletAddress) {
      console.warn('[Settlement] No wallet connected — aborting');
      setError('Connect your Pera Wallet before settling a payment.');
      return;
    }

    if (!creditorWallet) {
      console.warn('[Settlement] Creditor wallet address is missing — aborting');
      setError('Recipient wallet address is missing for this balance.');
      return;
    }

    setSettlingId(balance?.id || `${index}`);
    setError('');
    setSuccessMessage('');

    try {
      console.log('[Settlement] Calling sendPayment:', { sender: walletAddress, receiver: creditorWallet, amount });
      const txId = await sendPayment({
        sender: walletAddress,
        receiver: creditorWallet,
        amount,
        note: `SplitBill settlement for group ${groupId}`,
      });
      console.log('[Settlement] Payment sent — txId:', txId);

      const transactionStatus = await checkTransaction(txId);
      console.log('[Settlement] Transaction status:', transactionStatus);

      const token = await getToken();
      console.log('[Settlement] Calling POST /api/settlements with fromUserId:', balance.fromUser, 'toUserId:', balance.toUser);

      await createSettlement(
        {
          groupId: Number(groupId),
          txId,
          fromUserId: balance.fromUser,
          toUserId: balance.toUser,
          amount,
          status: transactionStatus.confirmed ? 'confirmed' : 'pending',
        },
        token,
      );
      console.log('[Settlement] Settlement recorded in backend');

      setSuccessMessage(`Settlement sent from ${debtorName} to ${creditorName}. Tx: ${txId}`);
      await loadGroup();
    } catch (settleError) {
      console.error('[Settlement] Settlement failed:', settleError);
      setError(settleError.message || 'Unable to settle payment.');
    } finally {
      setSettlingId('');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-10">
          <h1 className="text-2xl font-semibold text-white">Group not found</h1>
          <p className="mt-3 text-sm text-slate-400">This split may have vanished into the blockchain mist.</p>
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
      {/* Header */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-cyan-300"
        >
          <ArrowLeft size={13} />
          Back to dashboard
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Group</p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          {group?.groupName || group?.name || 'Untitled group'}
        </h1>
        {group?.description ? (
          <p className="mt-1 text-sm text-slate-400">{group.description}</p>
        ) : null}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Members</p>
            <p className="mt-0.5 text-2xl font-bold text-white">{members.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Receipt size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Expenses</p>
            <p className="mt-0.5 text-2xl font-bold text-white">{expenses.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-700/60 text-slate-300">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Invite code</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-white">{group?.inviteCode || 'Private'}</p>
          </div>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{error}</p> : null}
      {successMessage ? (
        <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{successMessage}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Members</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Who's in this group</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseForm((currentValue) => !currentValue)}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                <Plus size={14} />
                {showExpenseForm ? 'Hide' : 'Add expense'}
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {members.map((member) => (
                <div
                  key={getEntityId(member)}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">{getEntityName(member)}</p>
                    <p className="text-sm text-slate-400">{member?.email || getWalletAddress(member) || 'Wallet pending'}</p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                    {getWalletAddress(member) ? 'Wallet ready' : 'Wallet not linked'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {showExpenseForm ? (
            <ExpenseForm
              members={members}
              onSubmit={handleExpenseSubmit}
              onCancel={() => setShowExpenseForm(false)}
              submitting={submittingExpense}
            />
          ) : null}

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Expenses</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Shared costs</h2>

            <div className="mt-6 space-y-3">
              {expenses.length ? (
                expenses.map((expense, index) => (
                  <div
                    key={expense?.id || `${expense?.description}-${index}`}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-white">{expense?.description || 'Shared expense'}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          Paid by {expense?.payer?.name || expense?.paidByName || expense?.paidBy || 'Unknown payer'}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-semibold text-white">{formatMoney(expense?.amount)}</p>
                        <p className="text-sm text-slate-400">
                          {expense?.splits?.length || expense?.splitBetween?.length || expense?.participantCount || 0} participants
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center">
                  <p className="text-sm text-slate-400">No expenses yet. Add the first one and make accounting slightly less painful.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Balances</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Settle with Algorand</h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Each settlement signs a Testnet transaction with Pera Wallet and records the txId on-chain.
          </p>

          <div className="mt-6 space-y-4">
            {balances.length ? (
              balances.map((balance, index) => {
                const { debtorName, creditorName, debtorWallet, creditorWallet, amount } = resolveBalanceParties(balance);
                const settleKey = balance?.id || `${index}`;

                return (
                  <div
                    key={settleKey}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <p className="text-base font-semibold text-white">
                          {debtorName} owes {creditorName}
                        </p>

                        {/* INR amount + live ALGO estimate */}
                        <div className="mt-2 inline-flex flex-wrap items-baseline gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
                          <span className="text-lg font-bold text-white">{formatMoney(amount)}</span>
                          {algoPriceINR ? (
                            <>
                              <span className="text-sm text-slate-400">≈</span>
                              <span className="text-lg font-bold text-cyan-300">
                                {(amount / algoPriceINR).toFixed(4)} ALGO
                              </span>
                              <span className="text-xs text-slate-500">(@ ₹{algoPriceINR}/ALGO · live rate)</span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500">fetching ALGO price...</span>
                          )}
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                          Recipient wallet: {creditorWallet || 'Missing wallet address'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Sender wallet: {debtorWallet || walletAddress || 'Connect wallet to proceed'}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {algoPriceINR ? (
                          <p className="text-xs text-slate-400">
                            Wallet will show <span className="font-semibold text-cyan-300">{(amount / algoPriceINR).toFixed(4)} ALGO</span>
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleSettlePayment(balance, index)}
                          disabled={!walletAddress || !creditorWallet || settlingId === settleKey}
                          className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {settlingId === settleKey
                            ? 'Settling...'
                            : algoPriceINR
                              ? `Settle ${(amount / algoPriceINR).toFixed(4)} ALGO`
                              : 'Settle payment'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center">
                <p className="text-sm text-slate-400">Balances will appear here once the backend computes who owes whom.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupPage;
