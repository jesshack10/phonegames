import { db } from '../firebase/config.js'
import { ref, set, get, push, remove, update, onValue } from 'firebase/database'

const DEFAULT_ACCOUNTS = [
  { name: 'Cash', emoji: '💵', type: 'cash' },
  { name: 'Bank', emoji: '🏦', type: 'checking' },
]

const DEFAULT_CATEGORIES = [
  { name: 'Food', emoji: '🍔', parentId: null },
  { name: 'Transport', emoji: '🚗', parentId: null },
  { name: 'Housing', emoji: '🏠', parentId: null },
  { name: 'Entertainment', emoji: '🎉', parentId: null },
  { name: 'Health', emoji: '💊', parentId: null },
  { name: 'Shopping', emoji: '🛍️', parentId: null },
  { name: 'Other', emoji: '📦', parentId: null },
]

function base(uid) {
  return `money/${uid}`
}

export async function seedDefaults(uid) {
  if (!db) return
  const accountsSnap = await get(ref(db, `${base(uid)}/accounts`))
  if (accountsSnap.exists()) return

  const now = Date.now()
  for (const acc of DEFAULT_ACCOUNTS) {
    const r = push(ref(db, `${base(uid)}/accounts`))
    await set(r, { ...acc, id: r.key, createdAt: now })
  }
  for (const cat of DEFAULT_CATEGORIES) {
    const r = push(ref(db, `${base(uid)}/categories`))
    await set(r, { ...cat, id: r.key, createdAt: now })
  }
}

export function subscribeAccounts(uid, cb) {
  if (!db) return () => {}
  const r = ref(db, `${base(uid)}/accounts`)
  const unsub = onValue(r, (snap) => {
    const data = snap.val() || {}
    cb(Object.values(data).sort((a, b) => a.createdAt - b.createdAt))
  })
  return () => unsub()
}

export async function addAccount(uid, name, emoji, type) {
  if (!db) return
  const r = push(ref(db, `${base(uid)}/accounts`))
  await set(r, { id: r.key, name, emoji, type, createdAt: Date.now() })
}

export async function deleteAccount(uid, id) {
  if (!db) return
  await remove(ref(db, `${base(uid)}/accounts/${id}`))
}

export function subscribeCategories(uid, cb) {
  if (!db) return () => {}
  const r = ref(db, `${base(uid)}/categories`)
  const unsub = onValue(r, (snap) => {
    const data = snap.val() || {}
    cb(Object.values(data).sort((a, b) => a.createdAt - b.createdAt))
  })
  return () => unsub()
}

export async function addCategory(uid, name, emoji, parentId = null) {
  if (!db) return
  const r = push(ref(db, `${base(uid)}/categories`))
  await set(r, { id: r.key, name, emoji, parentId, createdAt: Date.now() })
}

export async function deleteCategory(uid, id) {
  if (!db) return
  await remove(ref(db, `${base(uid)}/categories/${id}`))
}

export function subscribeExpenses(uid, cb) {
  if (!db) return () => {}
  const r = ref(db, `${base(uid)}/expenses`)
  const unsub = onValue(r, (snap) => {
    const data = snap.val() || {}
    cb(Object.values(data).sort((a, b) => b.date - a.date))
  })
  return () => unsub()
}

export async function addExpense(uid, data) {
  if (!db) return
  const r = push(ref(db, `${base(uid)}/expenses`))
  await set(r, {
    id: r.key,
    amount: data.amount,
    note: data.note || '',
    description: data.description || '',
    accountId: data.accountId || '',
    accountName: data.accountName || '',
    accountEmoji: data.accountEmoji || '',
    categoryId: data.categoryId || '',
    categoryName: data.categoryName || '',
    categoryEmoji: data.categoryEmoji || '',
    subcategoryId: data.subcategoryId || null,
    subcategoryName: data.subcategoryName || '',
    location: data.location || '',
    date: data.date || Date.now(),
    createdAt: Date.now(),
  })
}

export async function deleteExpense(uid, id) {
  if (!db) return
  await remove(ref(db, `${base(uid)}/expenses/${id}`))
}

export async function getSettings(uid) {
  if (!db) return {}
  const snap = await get(ref(db, `${base(uid)}/settings`))
  return snap.val() || {}
}

export async function saveSettings(uid, data) {
  if (!db) return
  await update(ref(db, `${base(uid)}/settings`), data)
}
