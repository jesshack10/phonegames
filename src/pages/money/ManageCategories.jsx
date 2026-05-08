import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { subscribeCategories, addCategory, deleteCategory } from '../../utils/money.js'

const EMOJIS = [
  '🍔','🚗','🏠','🎉','💊','🛍️','📦','✈️','📚','☕',
  '🎵','🐾','🏋️','💄','🎮','🍕','🍺','💡','🧴','🌿',
  '🎓','🏥','🛒','🚌','⚽','🎨','🎬','🍣','🍰','🎁',
]

function EmojiPicker({ value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap mb-3">
      {EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => onChange(e)}
          className={`w-9 h-9 rounded-lg text-lg active:scale-90 transition-all ${
            value === e ? 'bg-emerald-500/20 ring-2 ring-emerald-400/50' : 'bg-white/[0.05]'
          }`}
        >
          {e}
        </button>
      ))}
    </div>
  )
}

function AddForm({ parentId, onAdd, onCancel, saving }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📦')

  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] mt-2">
      <EmojiPicker value={emoji} onChange={setEmoji} />
      <input
        type="text"
        placeholder={parentId ? 'Subcategory name' : 'Category name'}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-white/20 text-sm outline-none mb-3"
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-white/[0.04] text-white/40 text-sm active:bg-white/10"
        >
          Cancel
        </button>
        <button
          onClick={() => { if (name.trim()) onAdd(name.trim(), emoji, parentId) }}
          disabled={!name.trim() || saving}
          className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-25 active:scale-95 transition-all"
        >
          {saving ? '···' : 'Add'}
        </button>
      </div>
    </div>
  )
}

export default function ManageCategories() {
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [categories, setCategories] = useState([])
  const [showTopForm, setShowTopForm] = useState(false)
  const [addingSubFor, setAddingSubFor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (!uid || !ready) return
    return subscribeCategories(uid, setCategories)
  }, [uid, ready])

  const topCategories = categories.filter((c) => !c.parentId)
  const subsOf = (id) => categories.filter((c) => c.parentId === id)

  async function handleAdd(name, emoji, parentId) {
    setSaving(true)
    try {
      await addCategory(uid, name, emoji, parentId || null)
      setShowTopForm(false)
      setAddingSubFor(null)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    await deleteCategory(uid, deleteId)
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
        <h1 className="text-xl font-bold flex-1">Categories</h1>
        <button
          onClick={() => { setShowTopForm(!showTopForm); setAddingSubFor(null) }}
          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm font-medium active:bg-emerald-500/20"
        >
          + Add
        </button>
      </div>

      {/* Top-level add form */}
      {showTopForm && (
        <div className="mx-5 mb-5">
          <AddForm
            parentId={null}
            onAdd={handleAdd}
            onCancel={() => setShowTopForm(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Category list */}
      <div className="px-5 flex flex-col gap-4">
        {topCategories.map((cat) => {
          const subs = subsOf(cat.id)
          return (
            <div key={cat.id}>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                <span className="text-2xl">{cat.emoji}</span>
                <p className="text-white text-sm font-semibold flex-1">{cat.name}</p>
                <button
                  onClick={() => setAddingSubFor(addingSubFor === cat.id ? null : cat.id)}
                  className="text-white/25 text-xs px-2.5 py-1 rounded-lg bg-white/[0.05] active:bg-white/10 mr-1"
                >
                  + sub
                </button>
                <button
                  onClick={() => setDeleteId(cat.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                >
                  ×
                </button>
              </div>

              {addingSubFor === cat.id && (
                <div className="ml-5">
                  <AddForm
                    parentId={cat.id}
                    onAdd={handleAdd}
                    onCancel={() => setAddingSubFor(null)}
                    saving={saving}
                  />
                </div>
              )}

              {subs.length > 0 && (
                <div className="ml-5 mt-1.5 flex flex-col gap-1.5">
                  {subs.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                    >
                      {sub.emoji && <span className="text-base">{sub.emoji}</span>}
                      <p className="text-white/60 text-sm flex-1">{sub.name}</p>
                      <button
                        onClick={() => setDeleteId(sub.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/10 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-5">
          <div className="w-full max-w-sm bg-[#0f1a18] rounded-3xl p-6 border border-white/10">
            <p className="text-white font-semibold text-lg mb-1.5 text-center">Delete category?</p>
            <p className="text-white/30 text-sm text-center mb-6">Existing expenses won't be affected.</p>
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
