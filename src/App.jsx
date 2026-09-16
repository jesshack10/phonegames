import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import AuthErrorBanner from './components/AuthErrorBanner.jsx'
import ImpostorSetup from './pages/impostor/ImpostorSetup.jsx'
import ImpostorHost from './pages/impostor/ImpostorHost.jsx'
import ImpostorLobby from './pages/impostor/ImpostorLobby.jsx'
import ImpostorPlayer from './pages/impostor/ImpostorPlayer.jsx'
import WerewolfSetup from './pages/WerewolfSetup.jsx'
import WerewolfLobby from './pages/werewolf/WerewolfLobby.jsx'
import WerewolfModerator from './pages/werewolf/WerewolfModerator.jsx'
import WerewolfPlayer from './pages/werewolf/WerewolfPlayer.jsx'
import PeticionesSetup from './pages/peticiones/PeticionesSetup.jsx'
import PeticionesHost from './pages/peticiones/PeticionesHost.jsx'
import PeticionesLobby from './pages/peticiones/PeticionesLobby.jsx'
import PeticionesPlayer from './pages/peticiones/PeticionesPlayer.jsx'
import LoteriaSetup from './pages/loteria/LoteriaSetup.jsx'
import LoteriaModerador from './pages/loteria/LoteriaModerador.jsx'
import LoteriaSala from './pages/loteria/LoteriaSala.jsx'
import LoteriaJugar from './pages/loteria/LoteriaJugar.jsx'
import PomodoroSetup from './pages/pomodoro/PomodoroSetup.jsx'
import PomodoroTimer from './pages/pomodoro/PomodoroTimer.jsx'
import PomodoroJournal from './pages/pomodoro/PomodoroJournal.jsx'

export default function App() {
  return (
    <HashRouter>
      <AuthErrorBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/impostor" element={<ImpostorSetup />} />
        <Route path="/impostor/host/:sessionId" element={<ImpostorHost />} />
        <Route path="/impostor/lobby/:sessionId" element={<ImpostorLobby />} />
        <Route path="/impostor/play/:sessionId" element={<ImpostorPlayer />} />
        <Route path="/werewolf/setup" element={<WerewolfSetup />} />
        <Route path="/werewolf/lobby/:sessionId" element={<WerewolfLobby />} />
        <Route path="/werewolf/moderator/:sessionId" element={<WerewolfModerator />} />
        <Route path="/werewolf/play/:sessionId" element={<WerewolfPlayer />} />
        <Route path="/peticiones" element={<PeticionesSetup />} />
        <Route path="/peticiones/host/:sessionId" element={<PeticionesHost />} />
        <Route path="/peticiones/lobby/:sessionId" element={<PeticionesLobby />} />
        <Route path="/peticiones/play/:sessionId" element={<PeticionesPlayer />} />
        <Route path="/loteria" element={<LoteriaSetup />} />
        <Route path="/loteria/moderador/:sessionId" element={<LoteriaModerador />} />
        <Route path="/loteria/sala/:sessionId" element={<LoteriaSala />} />
        <Route path="/loteria/jugar/:sessionId" element={<LoteriaJugar />} />
        <Route path="/pomodoro" element={<PomodoroSetup />} />
        <Route path="/pomodoro/timer" element={<PomodoroTimer />} />
        <Route path="/pomodoro/journal" element={<PomodoroJournal />} />
      </Routes>
    </HashRouter>
  )
}
