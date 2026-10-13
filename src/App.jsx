import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './data/store'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Subjects from './pages/Subjects'
import SubjectDetail from './pages/SubjectDetail'
import Tasks from './pages/Tasks'
import Revisions from './pages/Revisions'
import Mistakes from './pages/Mistakes'
import MockTests from './pages/MockTests'
import WeeklyReview from './pages/WeeklyReview'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="subjects/:subjectId" element={<SubjectDetail />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="revisions" element={<Revisions />} />
            <Route path="mistakes" element={<Mistakes />} />
            <Route path="mock-tests" element={<MockTests />} />
            <Route path="weekly-review" element={<WeeklyReview />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
