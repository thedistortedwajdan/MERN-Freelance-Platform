import { useState } from "react";
import { Card, Chip, EmptyState, ErrorState, Skeleton } from "../../components/ui/primitives";
import { Pagination } from "../../components/ui/overlay";
import { AdminPage } from "./AdminBits";
import { useAsync, useDocumentTitle } from "../../lib/hooks";
import { timeAgo } from "../../lib/format";
import api from "../../data/client";

const SIZE = 15;
const tone = (a) => (a.includes("delete") || a.includes("suspend") || a.includes("cancel") || a.includes("hide") ? "danger" : a.includes("approve") || a.includes("unsuspend") || a.includes("resolved") ? "success" : "neutral");

export default function Audit() {
  useDocumentTitle("Activity");
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useAsync(() => api.admin.audit({ page, size: SIZE }), [page]);

  return (
    <AdminPage title="Activity" subtitle="A permanent record of sensitive actions.">
      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton className="h-64 rounded-[20px]" />
      ) : data.data.length ? (
        <>
          <Card padded={false} className="overflow-hidden">
            <ul className="divide-y divide-line">
              {data.data.map((a) => (
                <li key={a._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-sm">
                  <Chip tone={tone(a.action)}>{a.action}</Chip>
                  <span className="font-semibold">{a.actor?.name || "System"}</span>
                  <span className="text-muted">{a.targetType} · {a.targetId}</span>
                  {a.details ? <span className="min-w-0 flex-1 truncate text-muted">“{a.details}”</span> : <span className="flex-1" />}
                  <span className="text-xs text-muted">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Pagination page={page} pages={data.pages} total={data.total} size={SIZE} onChange={setPage} />
        </>
      ) : (
        <EmptyState icon="list" title="No activity yet" />
      )}
    </AdminPage>
  );
}
