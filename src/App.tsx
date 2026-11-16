import { Route, Routes } from 'react-router-dom'
import { CloudProvider } from './cloud/CloudProvider.tsx'
import { AppShell } from './components/AppShell.tsx'
import { AccountPage } from './pages/AccountPage.tsx'
import { GuardarobaPage } from './pages/GuardarobaPage.tsx'
import { ImpostazioniPage } from './pages/ImpostazioniPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { OutfitPage } from './pages/OutfitPage.tsx'
import { PreferitiPage } from './pages/PreferitiPage.tsx'
import { ProfiliPage } from './pages/ProfiliPage.tsx'
import { ProfileProvider } from './profiles/context.tsx'

export function App() {
  return (
    <CloudProvider>
      <ProfileProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<GuardarobaPage />} />
            <Route path="outfit" element={<OutfitPage />} />
            <Route path="preferiti" element={<PreferitiPage />} />
            <Route path="profili" element={<ProfiliPage />} />
            <Route path="impostazioni" element={<ImpostazioniPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ProfileProvider>
    </CloudProvider>
  )
}
