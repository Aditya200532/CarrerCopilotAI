import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import ResumeAnalyzer from './pages/ResumeAnalyzer.jsx';
import JobExplorer from './pages/JobExplorer.jsx';
import JobDetails from './pages/JobDetails.jsx';
import SkillGap from './pages/SkillGap.jsx';
import Roadmap from './pages/Roadmap.jsx';
import DsaProgress from './pages/DsaProgress.jsx';
import MockInterview from './pages/MockInterview.jsx';
import InterviewRoom from './pages/InterviewRoom.jsx';
import InterviewReport from './pages/InterviewReport.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      <Route element={<Protected><AppLayout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />
        <Route path="/jobs" element={<JobExplorer />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="/skill-gap" element={<SkillGap />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/dsa" element={<DsaProgress />} />
        <Route path="/mock-interview" element={<MockInterview />} />
        <Route path="/mock-interview/:id" element={<InterviewRoom />} />
        <Route path="/interview-report/:id" element={<InterviewReport />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
