import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { seedDefaults, subscribeAccounts, subscribeExpenses } from '../../utils/money.js'

export default function MoneyDashboard() {
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [expenses, setExpenses] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const seeded = useRef(false)

  useEffect(() => {
    if (!uid || !ready) return
    if (!seeded.current) {
      seeded.current = true
      seedDefaults(uid)
    }
    const unsubAcc = subscribeAccounts(uid, setAccounts)
    const unsubExp = subscribeExpenses(uid, setExpenses)
    return () => { unsubAcc(); unsubExp() }
  }, [uid, ready])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const monthExpenses = expenses.filter((e) => e.date >= monthStart)
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)

  function accountSpent(accountId) {
    return expenses
      .filter((e) => e.accountId === accountId)
      .reduce((s, e) => s + e.amount, 0)
  }

  const recent = expenses.slice(0, 8)

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const MENU = [
    { label: '📋  History', path: '/money/history' },
    { label: '💳  Accounts', path: '/money/accounts' },
    { label: '🏷️  Categories', path: '/money/categories' },
  ]

  return (
    <div className="min-h-screen bg-[#080c10] text-white pb-28">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-8">
        <div>
          <p className="text-white/30 text-xs font-medium uppercase tracking-widest mb-0.5">My money</p>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="w-10 h-10 rounded-2xl bg-white/5 border border-white/[0.07] flex items-center justify-center text-white/50 text-xl active:bg-white/10 transition-all"
        >
          ···
        </button>
      </div>

      {/* Dropdown menu overlay */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-20 right-5 z-50 bg-[#0f1a18] border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[180px]">
            {MENU.map((item) => (
              <button
                key={item.path}
                onClick={() => { setMenuOpen(false); navigate(item.path) }}
                className="w-full px-5 py-3.5 text-left text-sm text-white/70 hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/[0.05] last:border-0"
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Monthly summary card */}
      <div className="mx-5 mb-6 p-5 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-[#0a1412] border border-emerald-500/15 relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl" />
        <p className="relative text-emerald-400/60 text-xs font-medium uppercase tracking-widest mb-2">
          {now.toLocaleString('default', { month: 'long' })} spending
        </p>
        <p className="relative text-4xl font-bold text-white mb-1">
          ${monthTotal.toFixed(2)}
        </p>
        <p className="relative text-white/25 text-sm">
          {monthExpenses.length} {monthExpenses.length === 1 ? 'expense' : 'expenses'} this month
        </p>
      </div>

      {/* Accounts */}
      {accounts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-white/35 text-xs font-medium uppercase tracking-widest">Accounts</h2>
            <button
              onClick={() => navigate('/money/accounts')}
              className="text-white/25 text-xs active:text-white/50"
            >
              Manage →
            </button>
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto pb-1 scrollbar-none">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex-shrink-0 min-w-[140px] p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
              >
                <div className="text-2xl mb-3">{acc.emoji}</div>
                <p className="text-white text-sm font-semibold">{acc.name}</p>
                <p className="text-white/35 text-xs mt-0.5">
                  ${accountSpent(acc.id).toFixed(2)} spent
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent expenses */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white/35 text-xs font-medium uppercase tracking-widest">Recent</h2>
          {expenses.length > 8 && (
            <button
              onClick={() => navigate('/money/history')}
              className="text-white/25 text-xs active:text-white/50"
            >
              See all →
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-white/15">
            <span className="text-5xl mb-4">💸</span>
            <p className="text-sm">No expenses yet</p>
            <p className="text-xs mt-1">Tap + to log your first one</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((exp) => (
              <ExpenseRow key={exp.id} expense={exp} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/money/add')}
        className="fixed bottom-7 right-5 w-14 h-14 rounded-full bg-emerald-500 text-white text-3xl font-light flex items-center justify-center shadow-xl shadow-emerald-950/70 active:scale-90 transition-transform"
      >
        +
      </button>
    </div>
  )
}

function ExpenseRow({ expense }) {
  const d = new Date(expense.date)
  const isToday = new Date().toDateString() === d.toDateString()
  const dateStr = isToday
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
      <div className="w-11 h-11 rounded-xl bg-white/[0.05] flex items-center justify-center text-xl flex-shrink-0">
        {expense.categoryEmoji || '💸'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">
          {expense.note || expense.categoryName || 'Expense'}
        </p>
        <p className="text-white/25 text-xs mt-0.5 truncate">
          {expense.accountEmoji} {expense.accountName} · {dateStr}
        </p>
      </div>
      <p className="text-white font-semibold text-sm flex-shrink-0">
        −${expense.amount.toFixed(2)}
      </p>
    </div>
  )
}
