import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useSession } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PresenterPage from "./pages/PresenterPage";
import ShortcutCommandPage from "./pages/ShortcutCommandPage";
import HomePage from "./pages/HomePage";
import ControlPage from "./pages/ControlPage";
import ControlSettingsPage from "./pages/ControlSettingsPage";

function RedirectIfAuth({ children }) {
  const session = useSession();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirectParam = params.get("redirect");
  const target = redirectParam && redirectParam.startsWith("/")
    ? redirectParam
    : "/dashboard";
  if (session === undefined) return null; // loading
  if (session) return <Navigate to={target} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/login"
            element={
              <RedirectIfAuth>
                <LoginPage />
              </RedirectIfAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/control"
            element={
              <ProtectedRoute>
                <ControlPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/control"
            element={
              <ProtectedRoute>
                <ControlSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/present/:sessionId"
            element={
              <ProtectedRoute>
                <PresenterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/present/:accountKey/:shortcutAction"
            element={<ShortcutCommandPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
