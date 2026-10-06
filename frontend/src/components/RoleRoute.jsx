import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRoute({ children, allowedRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === allowedRole) return children;
  return <Navigate to={user.role === "employer" ? "/my-tasks" : "/dashboard"} />;
}
