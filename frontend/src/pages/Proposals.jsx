import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, EmptyState, ErrorState, Skeleton } from "../components/ui/primitives";
import { ConfirmDialog, Tabs } from "../components/ui/overlay";
import { Container } from "../components/common/Brand";
import { ProposalStatus } from "../components/task/TaskPanels";
import { useToast } from "../context/ToastContext";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { money, plural, timeAgo } from "../lib/format";
import api from "../data/client";

const TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Not selected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export default function Proposals() {
  useDocumentTitle("Proposals");
  const toast = useToast();
  const [tab, setTab] = useState("");
  const [withdrawing, setWithdrawing] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api.proposals.mine(), []);

  const list = (data || []).filter((p) => !tab || p.status === tab);
  const count = (s) => (data || []).filter((p) => p.status === s).length;

  const withdraw = async () => {
    setBusy(true);
    try {
      await api.proposals.withdraw(withdrawing._id);
      toast.info("Proposal withdrawn.");
      setWithdrawing(null);
      reload(true);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium sm:text-5xl">Your proposals</h1>
        <p className="mt-2 text-muted">Every proposal is a door you opened. Keep them coming.</p>
      </div>
      <Tabs tabs={TABS.map((t) => ({ ...t, count: t.value ? count(t.value) : data?.length }))} value={tab} onChange={setTab} className="mb-6" />

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[20px]" />)}</div>
      ) : list.length ? (
        <ul className="space-y-3">
          {list.map((p) => (
            <li key={p._id} className="anim-fade-up">
              <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ProposalStatus status={p.status} />
                    <span className="text-xs text-muted">Sent {timeAgo(p.createdAt)}</span>
                  </div>
                  <Link to={`/tasks/${p.taskId}`} className="mt-1.5 block truncate font-display text-lg font-medium hover:underline">{p.taskTitle || "Task"}</Link>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{p.message}</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <div className="text-right">
                    <div className="font-display text-2xl font-medium">{money(p.price)}</div>
                    {p.etaDays ? <div className="text-xs text-muted">{plural(p.etaDays, "day")}</div> : null}
                  </div>
                  <div className="flex gap-2">
                    {p.status === "pending" ? <Button size="sm" variant="ghost" onClick={() => setWithdrawing(p)}>Withdraw</Button> : null}
                    {p.status === "accepted" ? <Button size="sm" variant="soft" icon="message" to={`/messages/${p.taskId}`}>Chat</Button> : null}
                    <Button size="sm" variant="secondary" iconRight="arrow-right" to={`/tasks/${p.taskId}`}>Open</Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="send" title={tab ? "Nothing here" : "No proposals yet"} action={!tab ? <Button to="/find" iconRight="arrow-right">Find work</Button> : null}>
          {tab ? "Try another tab." : "Find a task that fits you and say hello. It only takes a minute."}
        </EmptyState>
      )}

      <ConfirmDialog open={!!withdrawing} onClose={() => setWithdrawing(null)} onConfirm={withdraw} loading={busy} title="Withdraw this proposal?" confirmLabel="Withdraw">
        The employer will no longer see it. You can send a new one while the task is still open.
      </ConfirmDialog>
    </Container>
  );
}
