import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import {
  subscribeAccounts,
  subscribeCategories,
  addExpense,
  getSettings,
  saveSettings,
} from '../../utils/money.js'
import NumPad from '../../components/money/NumPad.jsx'

export default function AddExpense() {
  const navigate = useNavigate()
  const { uid, ready } = useAuth()

  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [amount, setAmount] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null)
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [note, setNote] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showDetails, setShowDetails] = useState(false)
  const [saving, setSaving] = useState(false)

  const accountDefaultSet = useRef(false)
  const categoryDefaultSet = useRef(false)

  useEffect(() => {
    if (!uid || !ready) return

    const unsubAcc = subscribeAccounts(uid, (accs) => {
      setAccounts(accs)
      if (!accountDefaultSet.current && accs.length > 0) {
        accountDefaultSet.current = true
        getSettings(uid).then((s) => {
          const id = s.defaultAccountId && accs.find((a) => a.id === s.defaultAccountId)
            ? s.defaultAccountId
            : accs[0].id
          setSelectedAccountId(id)
        })
      }
    })

    const unsubCat = subscribeCategories(uid, (cats) => {
      setCategories(cats)
      if (!categoryDefaultSet.current && cats.length > 0) {
        categoryDefaultSet.current = true
        getSettings(uid).then((s) => {
          if (s.defaultCategoryId && cats.find((c) => c.id === s.defaultCategoryId)) {
            setSelectedCategoryId(s.defaultCategoryId)
          } else {
            const other = cats.find((c) => c.name === 'Other' && !c.parentId)
            const first = cats.find((c) => !c.parentId)
            setSelectedCategoryId(other?.id || first?.id || null)
          }
        })
      }
    })

    return () => { unsubAcc(); unsubCat() }
  }, [uid, ready])

  const topCategories = categories.filter((c) => !c.parentId)
  const subcategories = categories.filter((c) => c.parentId === selectedCategoryId)
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
  const selectedSubcategory = categories.find((c) => c.id === selectedSubcategoryId)
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

  const amountNum = parseFloat(amount) || 0
  const canSave = amountNum > 0 && selectedAccountId

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    try {
      await addExpense(uid, {
        amount: amountNum,
        note,
        description,
        accountId: selectedAccountId,
        accountName: selectedAccount?.name || '',
        accountEmoji: selectedAccount?.emoji || '',
        categoryId: selectedCategoryId || '',
        categoryName: selectedCategory?.name || '',
        categoryEmoji: selectedCategory?.emoji || '',
        subcategoryId: selectedSubcategoryId,
        subcategoryName: selectedSubcategory?.name || '',
        location,
        date: new Date(date + 'T12:00:00').getTime(),
      })
      await saveSettings(uid, {
        defaultAccountId: selectedAccountId,
        defaultCategoryId: selectedCategoryId,
      })
      navigate('/money')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-screen bg-[#080c10] text-white flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-3 flex-shrink-0">
        <button
          onClick={() => navigate('/money')}
          className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/40 text-2xl leading-none active:bg-white/10 transition-all"
        >
          ×
        </button>
        <span className="text-white/40 text-sm font-medium">New expense</span>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-25 active:scale-95 transition-all"
        >
          {saving ? '···' : 'Save'}
        </button>
      </div>

      {/* Amount display */}
      <div className="px-5 pt-2 pb-3 text-center flex-shrink-0">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-light text-white/25">$</span>
          <span className={`text-6xl font-bold tracking-tight ${amount ? 'text-white' : 'text-white/15'}`}>
            {amount || '0'}
          </span>
        </div>
        {selectedAccount && (
          <button
            onClick={() => setShowDetails(true)}
            className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] text-white/35 text-xs font-medium active:bg-white/10"
          >
            <span>{selectedAccount.emoji}</span>
            <span>{selectedAccount.name}</span>
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex-shrink-0 px-5 pb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {topCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)
                setSelectedSubcategoryId(null)
              }}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium
                active:scale-95 transition-all
                ${selectedCategoryId === cat.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/[0.06] text-white/50'}
              `}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subcategory pills */}
      {subcategories.length > 0 && (
        <div className="flex-shrink-0 px-5 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
            {subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() =>
                  setSelectedSubcategoryId(sub.id === selectedSubcategoryId ? null : sub.id)
                }
                className={`
                  flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  active:scale-95 transition-all border
                  ${selectedSubcategoryId === sub.id
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/[0.04] text-white/35 border-white/[0.07]'}
                `}
              >
                {sub.emoji && <span>{sub.emoji}</span>}
                <span>{sub.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* NumPad */}
      <div className="flex-1 px-5 flex flex-col justify-end pb-3">
        <NumPad value={amount} onChange={setAmount} />
      </div>

      {/* Details toggle */}
      <div className="flex-shrink-0 px-5 pb-8">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 text-xs font-medium tracking-wide flex items-center justify-center gap-2 active:bg-white/[0.07]"
        >
          <span>{showDetails ? '↑' : '↓'}</span>
          <span>Add details</span>
        </button>

        {showDetails && (
          <div className="mt-3 flex flex-col gap-2.5">
            <input
              type="text"
              placeholder="Note  (e.g. Lunch with Sarah)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-white/20 text-sm outline-none"
            />

            {accounts.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`
                      flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                      active:scale-95 transition-all border
                      ${selectedAccountId === acc.id
                        ? 'bg-white/10 text-white border-white/20'
                        : 'bg-white/[0.04] text-white/40 border-white/[0.06]'}
                    `}
                  >
                    <span>{acc.emoji}</span>
                    <span>{acc.name}</span>
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              placeholder="📍 Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-white/20 text-sm outline-none"
            />

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none [color-scheme:dark]"
            />

            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-white/20 text-sm outline-none resize-none"
            />
          </div>
        )}
      </div>
    </div>
  )
}
