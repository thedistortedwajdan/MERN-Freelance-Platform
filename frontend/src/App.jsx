import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PostTask from "./pages/PostTask";
import PostedTasks from "./pages/PostedTasks";
import TaskDetail from "./pages/TaskDetail";
import MyProfile from "./pages/MyProfile";
import PublicProfile from "./pages/PublicProfile";

import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import GuestOnlyRoute from "./components/GuestOnlyRoute";
import RoleRoute from "./components/RoleRoute";

function App() {
  return (
    <Router>
      <Navbar />
      <div className="p-4">
        <Routes>
          <Route
            path="/"
            element={
              <GuestOnlyRoute>
                <Home />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="/login"
            element={
              <GuestOnlyRoute>
                <Login />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestOnlyRoute>
                <Register />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RoleRoute allowedRole="freelancer">
                <Dashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/post-task"
            element={
              <RoleRoute allowedRole="employer">
                <PostTask />
              </RoleRoute>
            }
          />
          <Route
            path="/my-tasks"
            element={
              <RoleRoute allowedRole="employer">
                <PostedTasks />
              </RoleRoute>
            }
          />
          <Route
            path="/task/:id"
            element={
              <PrivateRoute>
                <TaskDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <MyProfile />
              </PrivateRoute>
            }
          />
          <Route path="/user/:id" element={<PublicProfile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
