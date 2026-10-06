import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Chip, EmptyState, ErrorState, Skeleton } from "../../components/ui/primitives";
import { Input, Select } from "../../components/ui/forms";
import { Pagination } from "../../components/ui/overlay";
import { StatusBadge } from "../../components/task/TaskBits";
import { AdminPage } from "./AdminBits";
import { useToast } from "../../context/ToastContext";
import { useAsync, useDebounced, useDocumentTitle } from "../../lib/hooks";
import { money, timeAgo } from "../../lib/format";
import api from "../../data/client";

const SIZE = 10;

export default function Tasks() {
  useDocumentTitle("Tasks");
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [hidden, setHidden] = useState("");
  const [page, setPage] = useState(0);
  const dq = useDebounced(q, 300);
  const { data, loading, error, reload } = useAsync(() => api.admin.tasks({ q: dq, status, hidden: hidden || undefined, page, size: SIZE }), [dq, status, hidden, page]);

  const toggle = async (t) => {
    try {
      await api.admin.setHidden(t._id, !t.hidden);
      toast.success(t.hidden ? "Task is visible again." : "Task hidden from search.");
      reload(true);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <AdminPage title="Tasks" subtitle="Hide anything that breaks the rules. Hidden tasks disappear from search but stay on record.">
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <Input icon="search" placeholder="Search by title" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} aria-label="Search tasks" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} aria-label="Status">
          <option value="">Any status</option>
          {["open", "assigned", "submitted", "completed", "cancelled", "expired"].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </Select>
        <Select value={hidden} onChange={(e) => { setHidden(e.target.value); setPage(0); }} aria-label="Visibility">
          <option value="">Visible and hidden</option><option value="false">Visible only</option><option value="true">Hidden only</option>
        </Select>
      </div>
      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-[20px]" />)}</div>
      ) : data.data.length ? (
        <>
          <ul className="space-y-3">
            {data.data.map((t) => (
              <li key={t._id}>
                <Card className="flex flex-wrap items-center gap-4 !py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={t.status} />
                      {t.hidden ? <Chip tone="danger" icon="eye">Hidden</Chip> : null}
                    </div>
                    <Link to={`/tasks/${t._id}`} className="mt-1 block truncate font-display text-lg font-medium hover:underline">{t.title}</Link>
                    <div className="text-xs text-muted">{t.employer?.name} · {money(t.price)} · {timeAgo(t.createdAt)}</div>
                  </div>
                  <Button size="sm" variant={t.hidden ? "secondary" : "danger-soft"} icon="eye" onClick={() => toggle(t)}>{t.hidden ? "Unhide" : "Hide"}</Button>
                </Card>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={data.pages} total={data.total} size={SIZE} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon="briefcase" title="No tasks match" />
      )}
    </AdminPage>
  );
}
