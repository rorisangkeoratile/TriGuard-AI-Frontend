import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/AuthContext.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import NotFound from './pages/NotFound.jsx'
import Privacy from './pages/Privacy.jsx'
import { ForgotPassword, ResetPassword } from './pages/PasswordReset.jsx'
import AppLayout from './pages/app/AppLayout.jsx'
import Overview from './pages/app/Overview.jsx'
import NewCheck from './pages/app/NewCheck.jsx'
import CheckDetail from './pages/app/CheckDetail.jsx'
import History from './pages/app/History.jsx'
import Contacts from './pages/app/Contacts.jsx'
import Team from './pages/app/Team.jsx'
import Security from './pages/app/Security.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Overview />} />
        <Route path="check" element={<NewCheck />} />
        <Route path="checks" element={<History />} />
        <Route path="checks/:id" element={<CheckDetail />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="team" element={<Team />} />
        <Route path="security" element={<Security />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
