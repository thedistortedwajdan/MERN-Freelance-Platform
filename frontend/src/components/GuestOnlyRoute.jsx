import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function GuestOnlyRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" /> : children;
}
