import { Link } from "react-router-dom";
import { Card, ErrorState, Skeleton, Stat } from "../../components/ui/primitives";
import { AdminPage } from "./AdminBits";
import { useAuth } from "../../context/AuthContext";
import { useAsync, useDocumentTitle } from "../../lib/hooks";
import { greeting, timeAgo } from "../../lib/format";
import api from "../../data/client";

const LABEL = { open: "Open", assigned: "In progress", submitted: "In review", completed: "Completed", cancelled: "Cancelled", expired: "Expired" };

export default function Overview() {
  useDocumentTitle("Admin");
  const { user } = useAuth();
  const stats = useAsync(() => api.admin.stats(), []);
  const audit = useAsync(() => api.admin.audit({ size: 6 }), []);

  if (stats.error) return <AdminPage title="Overview"><ErrorState message={stats.error.message} onRetry={stats.reload} /></AdminPage>;
  const s = stats.data;
  const totalTasks = s ? Object.values(s.tasksByStatus).reduce((a, b) => a + b, 0) : 0;

  return (
    <AdminPage title="Overview" subtitle={`${greeting(user.name)}. Here is how the community is doing.`}>
      {!s ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[20px]" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <Stat icon="users" label="People" value={s.usersByRole.freelancer + s.usersByRole.employer} hint={`${s.usersByRole.freelancer} freelancers · ${s.usersByRole.employer} employers`} tone="info" />
            <Stat icon="briefcase" label="Tasks" value={totalTasks} hint={`${s.tasksByStatus.open} open now`} tone="accent" />
            <Link to="/admin/disputes" className="block"><Stat icon="gavel" label="Open disputes" value={s.openDisputes} hint={s.openDisputes ? "Needs a moderator" : "All settled"} tone={s.openDisputes ? "danger" : "success"} /></Link>
            <Link to="/admin/reports" className="block"><Stat icon="flag" label="Open reports" value={s.openReports} hint={s.openReports ? "Waiting for review" : "Nothing waiting"} tone={s.openReports ? "danger" : "success"} /></Link>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card>
              <h2 className="mb-4 font-display text-xl font-medium">Tasks by stage</h2>
              <ul className="space-y-3">
                {Object.entries(s.tasksByStatus).map(([k, v]) => (
                  <li key={k}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{LABEL[k]}</span><span className="text-muted">{v}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-accent-soft"><div className="h-full rounded-full bg-accent" style={{ width: `${totalTasks ? (v / totalTasks) * 100 : 0}%` }} /></div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-muted">{s.totalRatings} reviews shared so far.</p>
            </Card>
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-medium">Recent activity</h2>
                <Link to="/admin/audit" className="text-sm font-semibold text-accent-ink hover:underline">See all</Link>
              </div>
              <ul className="space-y-3">
                {(audit.data?.data || []).map((a) => (
                  <li key={a._id} className="text-sm">
                    <span className="font-semibold">{a.actor?.name || "System"}</span> <span className="text-muted">{a.action.replace(".", " · ")}</span>
                    <div className="text-xs text-muted">{timeAgo(a.createdAt)}</div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </AdminPage>
  );
}
