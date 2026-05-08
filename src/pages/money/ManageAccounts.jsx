import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { subscribeAccounts, addAccount, deleteAccount } from '../../utils/money.js'

const EMOJIS = ['💵', '🏦', '💳', '💰', '🏧', '💼', '🪙', '💸', '🏪', '🎁']
const TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit' },
  { value: 'other', label: 'Other' },
]

export default function ManageAccounts() {
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🏦')
  const [type, setType] = useState('checking')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (!uid || !ready) return
    return subscribeAccounts(uid, setAccounts)
  }, [uid, ready])

  function resetForm() {
    setName('')
    setEmoji('🏦')
    setType('checking')
    setShowForm(false)
  }

  async function handleAdd() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await addAccount(uid, name.trim(), emoji, type)
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    await deleteAccount(uid, deleteId)
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
        <h1 className="text-xl font-bold flex-1">Accounts</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm font-medium active:bg-emerald-500/20"
        >
          + Add
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mx-5 mb-5 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-4">New account</p>

          <div className="flex gap-2 flex-wrap mb-4">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl text-xl active:scale-90 transition-all ${
                  emoji === e ? 'bg-emerald-500/20 ring-2 ring-emerald-400/50' : 'bg-white/[0.05]'
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Account name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-white/20 text-sm outline-none mb-3"
          />

          <div className="flex gap-2 flex-wrap mb-4">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium active:scale-95 transition-all border ${
                  type === t.value
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                    : 'bg-white/[0.04] text-white/35 border-white/[0.06]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetForm}
              className="flex-1 py-3 rounded-xl bg-white/[0.04] text-white/40 text-sm active:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!name.trim() || saving}
              className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-25 active:scale-95 transition-all"
            >
              {saving ? '···' : 'Add account'}
            </button>
          </div>
        </div>
      )}

      {/* Account list */}
      <div className="px-5 flex flex-col gap-2">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]"
          >
            <span className="text-2xl">{acc.emoji}</span>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">{acc.name}</p>
              <p className="text-white/25 text-xs capitalize">{acc.type}</p>
            </div>
            <button
              onClick={() => setDeleteId(acc.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-5">
          <div className="w-full max-w-sm bg-[#0f1a18] rounded-3xl p-6 border border-white/10">
            <p className="text-white font-semibold text-lg mb-1.5 text-center">Delete account?</p>
            <p className="text-white/30 text-sm text-center mb-6">Your recorded expenses won't be affected.</p>
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
