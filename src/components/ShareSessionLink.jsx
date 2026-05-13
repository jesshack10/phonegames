import { useState } from 'react'

export default function ShareSessionLink({
  url,
  shareTitle,
  shareText,
  copyLabel = 'Copy link',
  copiedLabel = 'Copied! ✓',
  shareLabel = 'Share',
  primaryShare = false,
}) {
  const [linkCopied, setLinkCopied] = useState(false)
  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function handleShare() {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url })
    } catch {
      handleCopy()
    }
  }

  if (primaryShare && canShare) {
    return (
      <div className="w-full flex flex-col gap-2">
        <button
          onClick={handleShare}
          className="w-full py-4 rounded-2xl bg-indigo-500 active:bg-indigo-600 text-white font-bold text-lg transition-colors shadow-lg shadow-indigo-500/20"
        >
          📤 {shareLabel}
        </button>
        <div className="flex gap-2">
          <div
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 cursor-pointer active:bg-white/10 transition-colors"
            onClick={handleCopy}
          >
            <p className="text-white/40 text-[11px] font-mono truncate">{url}</p>
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-white/10 active:bg-white/20 text-white/80 text-sm font-semibold transition-colors"
          >
            {linkCopied ? copiedLabel : `🔗 ${copyLabel}`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <div
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 cursor-pointer active:bg-white/10 transition-colors"
        onClick={handleCopy}
        title={url}
      >
        <p className="text-white/50 text-[11px] font-mono truncate">{url}</p>
      </div>
      <div className="w-full flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 py-2.5 rounded-xl bg-white/10 active:bg-white/20 text-white/90 text-sm font-semibold transition-colors"
        >
          {linkCopied ? copiedLabel : `🔗 ${copyLabel}`}
        </button>
        {canShare && (
          <button
            onClick={handleShare}
            className="flex-1 py-2.5 rounded-xl bg-white/10 active:bg-white/20 text-white/90 text-sm font-semibold transition-colors"
          >
            📤 {shareLabel}
          </button>
        )}
      </div>
    </div>
  )
}
