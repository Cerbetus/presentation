import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const session = useSession();
  const location = useLocation();

  // Still loading auth state
  if (session === undefined) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="glass-panel px-6 py-3 animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!session) {
    const redirectTarget = `${location.pathname}${location.search}`;
    const encoded = encodeURIComponent(redirectTarget || "/dashboard");
    return <Navigate to={`/login?redirect=${encoded}`} replace />;
  }

  return children;
}
