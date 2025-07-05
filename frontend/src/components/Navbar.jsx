import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center">
      <Link to="/" className="text-lg font-bold">
        GigPilot
      </Link>
      <div className="space-x-4">
        {user ? (
          <>
            {/* <span>{user.name}</span> */}
            {user?.role === "employer" && (
              <>
                <Link to="/post-task" className="hover:underline">
                  Post Task
                </Link>
                <Link to="/my-tasks" className="hover:underline">
                  My Tasks
                </Link>
              </>
            )}
            <Link to="/profile" className="hover:underline">
              My Profile
            </Link>
            <button onClick={handleLogout} className="hover:underline">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:underline">
              Login
            </Link>
            <Link to="/register" className="hover:underline">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
