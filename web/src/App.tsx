import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { Loading } from './components/ui'
import { CourseDetailPage } from './pages/CourseDetailPage'
import { CoursesPage } from './pages/CoursesPage'
import { DashboardPage } from './pages/DashboardPage'
import { ExpPage } from './pages/ExpPage'
import { AchievementsPage } from './pages/AchievementsPage'
import { BestiaryPage } from './pages/BestiaryPage'
import { HistoryPage } from './pages/HistoryPage'
import { NewCoursePage } from './pages/NewCoursePage'
import { NotesPage } from './pages/NotesPage'
import { PetPage } from './pages/PetPage'
import { SettingsPage } from './pages/SettingsPage'
import { StudyPage } from './pages/StudyPage'
import { WelcomePage } from './pages/WelcomePage'
import { SessionProvider } from './session'
import { useSession } from './session-context'

function AppRoutes() {
  const { user, loading } = useSession()

  if (loading) return <Loading text="Acordando seu companheiro…" />
  if (!user) return <WelcomePage />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="cursos" element={<CoursesPage />} />
        <Route path="cursos/novo" element={<NewCoursePage />} />
        <Route path="cursos/:courseId" element={<CourseDetailPage />} />
        <Route path="registros" element={<NotesPage />} />
        <Route path="conquistas" element={<AchievementsPage />} />
        <Route path="exp" element={<ExpPage />} />
        <Route path="estudar" element={<StudyPage />} />
        <Route path="foco" element={<Navigate to="/estudar" replace />} />
        <Route path="pet" element={<PetPage />} />
        <Route path="historico" element={<HistoryPage />} />
        <Route path="bestiario" element={<BestiaryPage />} />
        <Route path="ajustes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </BrowserRouter>
  )
}
