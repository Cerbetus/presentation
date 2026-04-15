import { Navigate } from "react-router-dom";
import { useSession } from "../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const session = useSession();

  // Still loading auth state
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
