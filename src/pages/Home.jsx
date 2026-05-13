import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-4xl font-bold text-white tracking-widest mb-4">PHONE GAMES</h1>

      <button
        onClick={() => navigate('/impostor')}
        className="w-full max-w-xs py-6 rounded-2xl bg-gradient-to-br from-violet-700 to-violet-900 border border-violet-500 text-white text-2xl font-bold tracking-wide shadow-lg active:scale-95 transition-transform"
      >
        👾 Impostor
      </button>

      <button
        onClick={() => navigate('/werewolf/setup')}
        className="w-full max-w-xs py-6 rounded-2xl bg-gradient-to-br from-red-800 to-red-950 border border-red-600 text-white text-2xl font-bold tracking-wide shadow-lg active:scale-95 transition-transform"
      >
        🐺 Werewolf
      </button>

      <button
        onClick={() => navigate('/peticiones')}
        className="w-full max-w-xs py-6 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-950 border border-blue-500 text-white text-2xl font-bold tracking-wide shadow-lg active:scale-95 transition-transform"
      >
        🙏 Peticiones
      </button>

      <button
        onClick={() => navigate('/pomodoro')}
        className="w-full max-w-xs py-6 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-500 text-white text-2xl font-bold tracking-wide shadow-lg active:scale-95 transition-transform"
      >
        🍅 Pomodoro
      </button>
    </div>
  )
}
