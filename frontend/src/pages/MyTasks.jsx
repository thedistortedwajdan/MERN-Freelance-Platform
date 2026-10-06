import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { Button, EmptyState, ErrorState, Skeleton, Stat } from "../components/ui/primitives";
import { Pagination, Tabs } from "../components/ui/overlay";
import { Container } from "../components/common/Brand";
import { TaskRow } from "../components/task/TaskBits";
import { useAuth } from "../context/AuthContext";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { greeting, timeAgo } from "../lib/format";
import api from "../data/client";

const SIZE = 8;
const TABS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "assigned", label: "In progress" },
  { value: "submitted", label: "Awaiting review" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function MyTasks() {
  const { user } = useAuth();
  const employer = user.role === "employer";
  useDocumentTitle(employer ? "My tasks" : "My work");
  const [tab, setTab] = useState("");
  const [page, setPage] = useState(0);
  const fetcher = employer ? api.tasks.posted : api.tasks.assigned;

  const { data, loading, error, reload } = useAsync(() => fetcher({ status: tab || undefined, page, size: SIZE }), [tab, page, employer]);
  const counts = useAsync(async () => {
    const entries = await Promise.all(["open", "assigned", "submitted", "completed"].map(async (s) => [s, (await fetcher({ status: s, size: 1 })).total]));
    return Object.fromEntries(entries);
  }, [employer]);

  const c = counts.data || {};
  const attention = employer ? c.submitted : c.assigned;

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium sm:text-5xl">{employer ? "Your tasks" : "Your work"}</h1>
          <p className="mt-2 text-muted">{greeting(user.name)}. {attention ? (employer ? `${attention} ${attention === 1 ? "task is" : "tasks are"} waiting for your review.` : `You have ${attention} ${attention === 1 ? "task" : "tasks"} in progress.`) : "Everything is on track."}</p>
        </div>
        {employer ? <Button to="/tasks/new" icon="plus" size="lg">Post a task</Button> : <Button to="/find" icon="compass" size="lg" variant="secondary">Find more work</Button>}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat icon="briefcase" label={employer ? "Open" : "Open to apply"} value={c.open ?? "–"} tone="info" />
        <Stat icon="trending" label="In progress" value={c.assigned ?? "–"} tone="accent" />
        <Stat icon="upload" label="Awaiting review" value={c.submitted ?? "–"} tone="violet" />
        <Stat icon="check-circle" label="Completed" value={c.completed ?? "–"} tone="success" />
      </div>

      <Tabs tabs={TABS.filter((t) => employer || t.value !== "open").map((t) => ({ ...t, count: t.value ? c[t.value] : undefined }))} value={tab} onChange={(v) => { setTab(v); setPage(0); }} className="mb-6" />

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[20px]" />)}</div>
      ) : data.data.length ? (
        <>
          <ul className="space-y-3">
            {data.data.map((t) => (
              <li key={t._id} className="anim-fade-up">
                <TaskRow
                  task={t}
                  sub={
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      {employer ? (t.freelancer ? <span className="inline-flex items-center gap-1.5"><Icon name="user" size={14} />{t.freelancer.name}</span> : <span>No one assigned yet</span>) : <span className="inline-flex items-center gap-1.5"><Icon name="user" size={14} />{t.employer?.name}</span>}
                      <span>Updated {timeAgo(t.updatedAt)}</span>
                    </span>
                  }
                  right={t.status === "submitted" && employer ? <Link to={`/tasks/${t._id}`} className="relative z-10 text-xs font-bold text-accent-ink hover:underline">Review now</Link> : t.status === "assigned" && !employer ? <Link to={`/messages/${t._id}`} className="relative z-10 text-xs font-bold text-accent-ink hover:underline">Open chat</Link> : null}
                />
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={data.pages} total={data.total} size={SIZE} onChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={employer ? "sprout" : "compass"}
          title={tab ? "Nothing in this list" : employer ? "Post your first task" : "Your first gig is out there"}
          action={!tab ? (employer ? <Button to="/tasks/new" icon="plus">Post a task</Button> : <Button to="/find" iconRight="arrow-right">Find work</Button>) : null}
        >
          {tab ? "Try another tab." : employer ? "Describe what you need and people nearby will send proposals." : "Send a proposal or accept a task to get started."}
        </EmptyState>
      )}
    </Container>
  );
}
