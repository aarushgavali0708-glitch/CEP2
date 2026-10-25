import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SocketProvider } from './context/SocketContext';
import CustomCursor from './components/cursor/CustomCursor';
import AnimatedBackground from './components/layout/AnimatedBackground';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import StudentLogin from './pages/public/StudentLogin';
import StudentRegister from './pages/public/StudentRegister';
import AdminLogin from './pages/public/AdminLogin';

// Student Pages
import OnboardingWizard from './pages/student/OnboardingWizard';
import ProfilePage from './pages/student/ProfilePage';
import DiscoverProjects from './pages/student/DiscoverProjects';
import ProjectDetail from './pages/student/ProjectDetail';
import CreateProject from './pages/student/CreateProject';
import MyProjects from './pages/student/MyProjects';
import NotificationsPage from './pages/student/NotificationsPage';
import TeamWorkspace from './pages/student/TeamWorkspace';

// Admin Pages
import ManageProjects from './pages/admin/ManageProjects';

// Protected Route Component
function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={requireAdmin ? '/admin/login' : '/login'} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RouteFade({ children }) {
  const location = useLocation();
  return <div key={location.pathname} className="route-page-fade">{children}</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SocketProvider>
            {/* Animated Background: Fixed subtle aurora glow & slowly drifting network particles */}
            <AnimatedBackground />

            {/* Custom cursor with trailing ring, particle canvas and spotlight glow */}
            <CustomCursor />

            <div className="min-h-screen flex flex-col bg-transparent text-ivory selection:bg-accent/20 selection:text-ivory relative z-10">
              <Navbar />

              <main className="flex-1">
                <RouteFade>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<StudentLogin />} />
                  <Route path="/register" element={<StudentRegister />} />
                  <Route path="/admin/login" element={<AdminLogin />} />

                  {/* Protected Student Routes */}
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <OnboardingWizard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/discover"
                    element={
                      <ProtectedRoute>
                        <DiscoverProjects />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/create"
                    element={
                      <ProtectedRoute>
                        <CreateProject />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/:id"
                    element={
                      <ProtectedRoute>
                        <ProjectDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/:id/workspace"
                    element={
                      <ProtectedRoute>
                        <TeamWorkspace />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-projects"
                    element={
                      <ProtectedRoute>
                        <MyProjects />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <NotificationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile/:userId?"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected Admin Routes */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <ManageProjects />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/projects"
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <ManageProjects />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </RouteFade>
              </main>

              <Footer />
            </div>
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
