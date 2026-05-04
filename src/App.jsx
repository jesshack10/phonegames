import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Setup from './pages/Setup.jsx'
import Host from './pages/Host.jsx'
import Reveal from './pages/Reveal.jsx'
import WerewolfSetup from './pages/WerewolfSetup.jsx'
import WerewolfLobby from './pages/werewolf/WerewolfLobby.jsx'
import WerewolfModerator from './pages/werewolf/WerewolfModerator.jsx'
import WerewolfPlayer from './pages/werewolf/WerewolfPlayer.jsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/impostor" element={<Setup />} />
        <Route path="/host" element={<Host />} />
        <Route path="/reveal" element={<Reveal />} />
        <Route path="/werewolf/setup" element={<WerewolfSetup />} />
        <Route path="/werewolf/lobby/:sessionId" element={<WerewolfLobby />} />
        <Route path="/werewolf/moderator/:sessionId" element={<WerewolfModerator />} />
        <Route path="/werewolf/play/:sessionId" element={<WerewolfPlayer />} />
      </Routes>
    </HashRouter>
  )
}
