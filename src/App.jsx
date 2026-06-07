import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';

// Carga perezosa (Lazy Loading) de páginas para optimizar bundle size
const Login = lazy(() => import('./pages/Login/Login'));
const Home = lazy(() => import('./pages/Home/Home'));
const Deliveries = lazy(() => import('./pages/Deliveries/Deliveries'));
const Expenses = lazy(() => import('./pages/Expenses/Expenses'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const Admin = lazy(() => import('./pages/Admin/Admin'));
const ForcePasswordChange = lazy(() => import('./pages/ForcePasswordChange/ForcePasswordChange'));

function ProtectedRoute({ children }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profile && profile.password_changed === false) {
    return <Navigate to="/force-password-change" replace />;
  }

  return children;
}

function ForcePasswordProtectedRoute({ children }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profile && profile.password_changed !== false) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="loading-screen">
              <div className="spinner" />
            </div>
          }
        >
          <Routes>
            {/* Public */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            <Route
              path="/force-password-change"
              element={
                <ForcePasswordProtectedRoute>
                  <ForcePasswordChange />
                </ForcePasswordProtectedRoute>
              }
            />

            {/* Protected — App Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="deliveries" element={<Deliveries />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="profile" element={<Profile />} />
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
