import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell.tsx'
import { GuardarobaPage } from './pages/GuardarobaPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { OutfitPage } from './pages/OutfitPage.tsx'
import { PreferitiPage } from './pages/PreferitiPage.tsx'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<GuardarobaPage />} />
        <Route path="outfit" element={<OutfitPage />} />
        <Route path="preferiti" element={<PreferitiPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
