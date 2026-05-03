import { HashRouter, Routes, Route } from 'react-router-dom'
import Setup from './pages/Setup.jsx'
import Host from './pages/Host.jsx'
import Reveal from './pages/Reveal.jsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Setup />} />
        <Route path="/host" element={<Host />} />
        <Route path="/reveal" element={<Reveal />} />
      </Routes>
    </HashRouter>
  )
}
