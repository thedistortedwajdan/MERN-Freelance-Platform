import { useState } from "react";
import { Button, EmptyState, ErrorState, Skeleton } from "../components/ui/primitives";
import { Pagination, Tabs } from "../components/ui/overlay";
import { Container } from "../components/common/Brand";
import NotificationItem from "../components/common/NotificationItem";
import { useAuth } from "../context/AuthContext";
import { useLive } from "../context/LiveContext";
import { useAsync, usePolling, useDocumentTitle } from "../lib/hooks";
import api from "../data/client";

const SIZE = 12;

export default function Notifications() {
  useDocumentTitle("Notifications");
  const { user } = useAuth();
  const { alerts, refresh } = useLive();
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useAsync(() => api.notifications.list({ unread: tab === "unread", page, size: SIZE }), [tab, page]);
  usePolling(() => reload(true), 3000);

  const markAll = async () => {
    await api.notifications.markAllRead();
    await Promise.all([reload(true), refresh()]);
  };
  const open = async (n) => {
    if (!n.read) await api.notifications.markRead(n._id).catch(() => {});
    refresh();
  };

  return (
    <Container narrow className="py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-medium sm:text-5xl">Notifications</h1>
          <p className="mt-2 text-muted">{alerts ? `${alerts} new since you last looked.` : "You are all caught up."}</p>
        </div>
        <Button variant="secondary" size="sm" icon="check" onClick={markAll} disabled={!alerts}>Mark all as read</Button>
      </div>
      <Tabs tabs={[{ value: "all", label: "All" }, { value: "unread", label: "Unread", count: alerts || undefined }]} value={tab} onChange={(v) => { setTab(v); setPage(0); }} className="mb-4" />

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)}</div>
      ) : data.data.length ? (
        <>
          <div className="space-y-1.5 rounded-[24px] border border-line bg-surface p-2 shadow-card">
            {data.data.map((n) => <NotificationItem key={n._id} n={n} role={user.role} onOpen={open} />)}
          </div>
          <Pagination page={page} pages={data.pages} total={data.total} size={SIZE} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon="bell" title={tab === "unread" ? "Nothing new" : "No notifications yet"}>
          {tab === "unread" ? "You have read everything. Nice." : "When something happens on your tasks, you will see it here."}
        </EmptyState>
      )}
    </Container>
  );
}
