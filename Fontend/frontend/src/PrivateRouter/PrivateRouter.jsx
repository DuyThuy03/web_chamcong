import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};
export default PrivateRoute;