import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { subscribeExpenses, deleteExpense } from '../../utils/money.js'

function groupByDay(expenses) {
  const map = {}
  for (const exp of expenses) {
    const d = new Date(exp.date)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!map[key]) map[key] = { timestamp: exp.date, key, items: [] }
    map[key].items.push(exp)
  }
  return Object.values(map).sort((a, b) => b.timestamp - a.timestamp)
}

function dayLabel(timestamp) {
  const d = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ExpenseHistory() {
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (!uid || !ready) return
    return subscribeExpenses(uid, setExpenses)
  }, [uid, ready])

  const groups = groupByDay(expenses)
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  async function confirmDelete() {
    if (!deleteId) return
    await deleteExpense(uid, deleteId)
    setDeleteId(null)
  }

  return (
    <div className="min-h-screen bg-[#080c10] text-white pb-12">

      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-10 pb-6">
        <button
          onClick={() => navigate('/money')}
          className="text-white/40 text-sm active:text-white/80 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold flex-1">All expenses</h1>
        <span className="text-white/25 text-sm">${total.toFixed(2)}</span>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-white/15">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-sm">Nothing logged yet</p>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-7">
          {groups.map((group) => {
            const dayTotal = group.items.reduce((s, e) => s + e.amount, 0)
            return (
              <div key={group.key}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-white/30 text-xs font-medium uppercase tracking-wider">
                    {dayLabel(group.timestamp)}
                  </span>
                  <span className="text-white/20 text-xs">${dayTotal.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {group.items.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-lg flex-shrink-0">
                        {exp.categoryEmoji || '💸'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {exp.note || exp.categoryName || 'Expense'}
                        </p>
                        <p className="text-white/25 text-xs mt-0.5 truncate">
                          {exp.accountEmoji} {exp.accountName}
                          {exp.subcategoryName ? ` · ${exp.subcategoryName}` : ''}
                          {exp.location ? ` · ${exp.location}` : ''}
                        </p>
                      </div>
                      <p className="text-white font-semibold text-sm flex-shrink-0">
                        −${exp.amount.toFixed(2)}
                      </p>
                      <button
                        onClick={() => setDeleteId(exp.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all ml-1 flex-shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-5">
          <div className="w-full max-w-sm bg-[#0f1a18] rounded-3xl p-6 border border-white/10">
            <p className="text-white font-semibold text-lg mb-1.5 text-center">Delete this expense?</p>
            <p className="text-white/30 text-sm text-center mb-6">This can't be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl bg-white/[0.05] text-white/50 text-sm font-medium active:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-red-500/15 text-red-400 text-sm font-medium border border-red-500/25 active:bg-red-500/25"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
