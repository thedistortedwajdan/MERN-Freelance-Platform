import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Button, Card, Chip, EmptyState, ErrorState, Skeleton } from "../../components/ui/primitives";
import { Input, Select } from "../../components/ui/forms";
import { Pagination } from "../../components/ui/overlay";
import { PromptModal } from "../../components/task/TaskPanels";
import { AdminPage } from "./AdminBits";
import { useToast } from "../../context/ToastContext";
import { useAsync, useDebounced, useDocumentTitle } from "../../lib/hooks";
import api from "../../data/client";

const SIZE = 10;

export default function Users() {
  useDocumentTitle("People");
  const toast = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [target, setTarget] = useState(null);
  const dq = useDebounced(q, 300);
  const { data, loading, error, reload } = useAsync(() => api.admin.users({ q: dq, role, status, page, size: SIZE }), [dq, role, status, page]);

  const unsuspend = async (u) => {
    try {
      await api.admin.unsuspend(u._id);
      toast.success(`${u.name} can sign in again.`);
      reload(true);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <AdminPage title="People" subtitle="Everyone on GigPilot. Suspend accounts that put others at risk.">
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <Input icon="search" placeholder="Search by name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} aria-label="Search people" />
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(0); }} aria-label="Role">
          <option value="">All roles</option><option value="freelancer">Freelancers</option><option value="employer">Employers</option><option value="admin">Admins</option>
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} aria-label="Status">
          <option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option>
        </Select>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-[20px]" />)}</div>
      ) : data.data.length ? (
        <>
          <ul className="space-y-3">
            {data.data.map((u) => (
              <li key={u._id}>
                <Card className="flex flex-wrap items-center gap-4 !py-4">
                  <Avatar name={u.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/users/${u._id}`} className="font-bold hover:underline">{u.name}</Link>
                      <Chip tone="accent" className="capitalize">{u.role}</Chip>
                      {u.status === "suspended" ? <Chip tone="danger">Suspended</Chip> : null}
                      {!u.emailVerified ? <Chip tone="outline">Unverified</Chip> : null}
                    </div>
                    <div className="truncate text-sm text-muted">{u.email}</div>
                  </div>
                  {u.role !== "admin" ? (
                    u.status === "suspended" ? (
                      <Button size="sm" variant="secondary" onClick={() => unsuspend(u)}>Restore access</Button>
                    ) : (
                      <Button size="sm" variant="danger-soft" icon="ban" onClick={() => setTarget(u)}>Suspend</Button>
                    )
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={data.pages} total={data.total} size={SIZE} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon="users" title="No one matches" />
      )}

      <PromptModal
        open={!!target}
        onClose={() => setTarget(null)}
        title={`Suspend ${target?.name}?`}
        subtitle="They will not be able to sign in or use their account until you restore access."
        label="Reason"
        placeholder="Recorded in the activity log"
        required={false}
        tone="danger"
        confirmLabel="Suspend"
        onSubmit={async (reason) => {
          await api.admin.suspend(target._id, reason);
          toast.info(`${target.name} was suspended.`);
          reload(true);
        }}
      />
    </AdminPage>
  );
}
