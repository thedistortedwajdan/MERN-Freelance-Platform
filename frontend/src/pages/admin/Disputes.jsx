import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Chip, EmptyState, ErrorState, Skeleton } from "../../components/ui/primitives";
import { Field, Select, Textarea } from "../../components/ui/forms";
import { Modal, Pagination, Tabs } from "../../components/ui/overlay";
import { AdminPage } from "./AdminBits";
import { useToast } from "../../context/ToastContext";
import { useAsync, useDocumentTitle } from "../../lib/hooks";
import { timeAgo } from "../../lib/format";
import api from "../../data/client";

const SIZE = 8;
const TONE = { open: "accent", resolved: "success", dismissed: "neutral" };

export default function Disputes() {
  useDocumentTitle("Disputes");
  const toast = useToast();
  const [tab, setTab] = useState("open");
  const [page, setPage] = useState(0);
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ resolution: "resolved", outcome: "none", note: "" });
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api.admin.disputes({ status: tab || undefined, page, size: SIZE }), [tab, page]);

  const open = (d) => {
    setForm({ resolution: "resolved", outcome: "none", note: "" });
    setTarget(d);
  };
  const resolve = async () => {
    setBusy(true);
    try {
      await api.admin.resolveDispute(target._id, { ...form, outcome: form.resolution === "dismissed" ? "none" : form.outcome });
      toast.success("Dispute settled. Both people have been told.");
      setTarget(null);
      reload(true);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPage title="Disputes" subtitle="Listen to both sides, then decide what happens to the task.">
      <Tabs tabs={[{ value: "open", label: "Open" }, { value: "resolved", label: "Resolved" }, { value: "dismissed", label: "Dismissed" }, { value: "", label: "All" }]} value={tab} onChange={(v) => { setTab(v); setPage(0); }} className="mb-6" />
      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton className="h-40 rounded-[20px]" />
      ) : data.data.length ? (
        <>
          <ul className="space-y-4">
            {data.data.map((d) => (
              <li key={d._id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><Chip tone={TONE[d.status]} className="capitalize">{d.status}</Chip><span className="text-xs text-muted">{timeAgo(d.createdAt)}</span></div>
                    {d.status === "open" ? <Button size="sm" icon="gavel" onClick={() => open(d)}>Settle</Button> : null}
                  </div>
                  <Link to={`/tasks/${d.taskId}`} className="mt-2 block font-display text-xl font-medium hover:underline">{d.taskTitle || "Task"}</Link>
                  <p className="mt-1 text-sm text-muted"><Link className="font-semibold text-fg hover:underline" to={`/users/${d.openedBy?._id}`}>{d.openedBy?.name}</Link> against <Link className="font-semibold text-fg hover:underline" to={`/users/${d.against?._id}`}>{d.against?.name}</Link></p>
                  <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed">{d.reason}</p>
                  {d.status !== "open" ? <p className="mt-3 text-sm text-muted">Outcome: <strong className="text-fg">{d.outcome.replace("_", " ")}</strong>{d.resolutionNote ? ` · ${d.resolutionNote}` : ""}</p> : null}
                </Card>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={data.pages} total={data.total} size={SIZE} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon="gavel" title={tab === "open" ? "No open disputes" : "Nothing here"}>Everything is settled. Nice work.</EmptyState>
      )}

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Settle this dispute"
        subtitle={target?.taskTitle}
        footer={<><Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button><Button loading={busy} onClick={resolve}>Confirm decision</Button></>}
      >
        <div className="space-y-4">
          <Field label="Decision" htmlFor="res">
            <Select id="res" value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })}>
              <option value="resolved">Resolve the dispute</option>
              <option value="dismissed">Dismiss it</option>
            </Select>
          </Field>
          <Field label="What happens to the task?" htmlFor="out" hint={form.resolution === "dismissed" ? "A dismissed dispute leaves the task as it is." : undefined}>
            <Select id="out" value={form.resolution === "dismissed" ? "none" : form.outcome} disabled={form.resolution === "dismissed"} onChange={(e) => setForm({ ...form, outcome: e.target.value })}>
              <option value="none">Leave it as it is</option>
              <option value="complete_task">Mark it completed</option>
              <option value="cancel_task">Cancel it</option>
            </Select>
          </Field>
          <Field label="Note for both people" htmlFor="note" optional>
            <Textarea id="note" rows={3} maxLength={2000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Explain your decision kindly and clearly." />
          </Field>
        </div>
      </Modal>
    </AdminPage>
  );
}
