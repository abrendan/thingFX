import { Route, Routes } from 'react-router-dom'

import Setup from './pages/Setup/Setup.js'
import Layout from './components/Layout/Layout.js'
import Home from './pages/Home/Home.js'
import SettingsPage from './pages/Settings/Settings.js'
import ShortcutsPage from './pages/Shortcuts/Shortcuts.js'

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/shortcuts" element={<ShortcutsPage />} />
        <Route path="/setup" element={<Setup />} />
      </Route>
    </Routes>
  )
}

export default App
