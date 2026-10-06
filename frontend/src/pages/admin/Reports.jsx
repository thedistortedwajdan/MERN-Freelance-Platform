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
const TONE = { open: "accent", actioned: "success", dismissed: "neutral" };

function targetLink(r) {
  if (r.targetType === "user") return `/users/${r.targetId}`;
  if (r.targetType === "task") return `/tasks/${r.targetId}`;
  return null;
}

export default function Reports() {
  useDocumentTitle("Reports");
  const toast = useToast();
  const [tab, setTab] = useState("open");
  const [page, setPage] = useState(0);
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ status: "actioned", note: "" });
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api.admin.reports({ status: tab || undefined, page, size: SIZE }), [tab, page]);

  const resolve = async () => {
    setBusy(true);
    try {
      await api.admin.resolveReport(target._id, form);
      toast.success("Report closed. The reporter has been told.");
      setTarget(null);
      reload(true);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPage title="Reports" subtitle="Things people flagged. Look closely, act fairly.">
      <Tabs tabs={[{ value: "open", label: "Open" }, { value: "actioned", label: "Actioned" }, { value: "dismissed", label: "Dismissed" }, { value: "", label: "All" }]} value={tab} onChange={(v) => { setTab(v); setPage(0); }} className="mb-6" />
      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton className="h-40 rounded-[20px]" />
      ) : data.data.length ? (
        <>
          <ul className="space-y-4">
            {data.data.map((r) => (
              <li key={r._id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><Chip tone={TONE[r.status]} className="capitalize">{r.status}</Chip><Chip tone="outline" className="capitalize">{r.targetType}</Chip><span className="text-xs text-muted">{timeAgo(r.createdAt)}</span></div>
                    {r.status === "open" ? <Button size="sm" icon="flag" onClick={() => { setForm({ status: "actioned", note: "" }); setTarget(r); }}>Review</Button> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted">Reported by <span className="font-semibold text-fg">{r.reporter?.name}</span></p>
                  <p className="mt-2 rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed">{r.reason}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                    {targetLink(r) ? <Link to={targetLink(r)} className="font-semibold text-accent-ink hover:underline">Open the reported {r.targetType}</Link> : null}
                    {r.status !== "open" && r.resolutionNote ? <span className="text-muted">Note: {r.resolutionNote}</span> : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={data.pages} total={data.total} size={SIZE} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon="flag" title={tab === "open" ? "No open reports" : "Nothing here"}>The community is looking after itself.</EmptyState>
      )}

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Review this report"
        footer={<><Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button><Button loading={busy} onClick={resolve}>Close report</Button></>}
      >
        <div className="space-y-4">
          <Field label="Outcome" htmlFor="rs">
            <Select id="rs" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="actioned">Action taken</option>
              <option value="dismissed">No action needed</option>
            </Select>
          </Field>
          <Field label="Note" htmlFor="rn" optional hint="Kept in the activity log.">
            <Textarea id="rn" rows={3} maxLength={2000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </AdminPage>
  );
}
