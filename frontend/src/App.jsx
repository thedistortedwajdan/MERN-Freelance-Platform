import { lazy } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { GuestOnly, RequireAuth, RequireRole } from "./components/common/Guards";
import Home from "./pages/Home";

const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));
const FindWork = lazy(() => import("./pages/FindWork"));
const TaskDetail = lazy(() => import("./pages/TaskDetail"));
const TaskForm = lazy(() => import("./pages/TaskForm"));
const MyTasks = lazy(() => import("./pages/MyTasks"));
const Proposals = lazy(() => import("./pages/Proposals"));
const Saved = lazy(() => import("./pages/Saved"));
const Messages = lazy(() => import("./pages/Messages"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Disputes = lazy(() => import("./pages/Disputes"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminTasks = lazy(() => import("./pages/admin/Tasks"));
const AdminDisputes = lazy(() => import("./pages/admin/Disputes"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminAudit = lazy(() => import("./pages/admin/Audit"));

const Redirect = ({ to }) => {
  const params = useParams();
  return <Navigate to={to.replace(/:(\w+)/g, (_, k) => params[k])} replace />;
};

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />

          <Route element={<GuestOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/users/:id" element={<PublicProfile />} />

          <Route element={<RequireAuth />}>
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />

            <Route element={<RequireRole roles={["freelancer", "employer"]} />}>
              <Route path="/find" element={<FindWork />} />
              <Route path="/my-tasks" element={<MyTasks />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:taskId" element={<Messages />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/disputes" element={<Disputes />} />
            </Route>

            <Route element={<RequireRole roles={["freelancer"]} />}>
              <Route path="/proposals" element={<Proposals />} />
              <Route path="/saved" element={<Saved />} />
            </Route>

            <Route element={<RequireRole roles={["employer"]} />}>
              <Route path="/tasks/new" element={<TaskForm />} />
              <Route path="/tasks/:id/edit" element={<TaskForm />} />
            </Route>

            <Route element={<RequireRole roles={["admin"]} />}>
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/tasks" element={<AdminTasks />} />
              <Route path="/admin/disputes" element={<AdminDisputes />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/audit" element={<AdminAudit />} />
            </Route>
          </Route>

          <Route path="/dashboard" element={<Navigate to="/find" replace />} />
          <Route path="/post-task" element={<Navigate to="/tasks/new" replace />} />
          <Route path="/task/:id" element={<Redirect to="/tasks/:id" />} />
          <Route path="/user/:id" element={<Redirect to="/users/:id" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
