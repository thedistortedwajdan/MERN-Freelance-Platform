import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { Button, Card, CardSkeleton, Chip, EmptyState, ErrorState, Skeleton } from "../components/ui/primitives";
import { Pagination, Tabs } from "../components/ui/overlay";
import { Container } from "../components/common/Brand";
import { TaskCard } from "../components/task/TaskBits";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import api from "../data/client";

const SIZE = 9;

function filterChips(x) {
  const out = [];
  if (x.q) out.push(`“${x.q}”`);
  if (x.category) out.push(x.category);
  if (x.location) out.push(x.location);
  (x.skills || []).forEach((s) => out.push(s));
  if (x.minPrice != null || x.maxPrice != null) out.push(`$${x.minPrice ?? 0}–${x.maxPrice ?? "any"}`);
  if (x.latitude != null) out.push(`Within ${x.radiusKm || 25} km`);
  return out;
}

export default function Saved() {
  useDocumentTitle("Saved");
  const navigate = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();
  const [tab, setTab] = useState("tasks");
  const [page, setPage] = useState(0);
  const tasks = useAsync(() => api.tasks.favorites({ page, size: SIZE }), [page]);
  const searches = useAsync(() => api.savedSearches.list(), []);

  const remove = async (s) => {
    try {
      await api.savedSearches.remove(s._id);
      toast.info("Search removed.");
      searches.reload(true);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium sm:text-5xl">Saved for later</h1>
        <p className="mt-2 text-muted">Tasks that caught your eye, and searches you would like to run again.</p>
      </div>
      <Tabs
        tabs={[
          { value: "tasks", label: "Tasks", count: tasks.data?.total },
          { value: "searches", label: "Searches", count: searches.data?.length },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />

      {tab === "tasks" ? (
        tasks.error ? (
          <ErrorState message={tasks.error.message} onRetry={tasks.reload} />
        ) : tasks.loading && !tasks.data ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        ) : tasks.data.data.length ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tasks.data.data.map((t) => <div key={t._id} className="anim-fade-up"><TaskCard task={t} showMatch={!!profile?.skills?.length} /></div>)}
            </div>
            <Pagination page={page} pages={tasks.data.pages} total={tasks.data.total} size={SIZE} onChange={setPage} />
          </>
        ) : (
          <EmptyState icon="heart" title="Nothing saved yet" action={<Button to="/find" iconRight="arrow-right">Browse tasks</Button>}>
            Tap the heart on any task to keep it here until you are ready.
          </EmptyState>
        )
      ) : searches.error ? (
        <ErrorState message={searches.error.message} onRetry={searches.reload} />
      ) : searches.loading && !searches.data ? (
        <Skeleton className="h-28 rounded-[20px]" />
      ) : searches.data.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {searches.data.map((s) => (
            <li key={s._id}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2"><Icon name="bookmark" size={18} className="text-accent-ink" /><h3 className="font-display text-lg font-medium">{s.name}</h3></div>
                  <button onClick={() => remove(s)} aria-label={`Delete ${s.name}`} className="rounded-full p-2 text-muted transition hover:bg-danger-soft hover:text-danger"><Icon name="trash" size={16} /></button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {filterChips(s.filters).map((c) => <Chip key={c} tone="accent">{c}</Chip>)}
                  {!filterChips(s.filters).length ? <span className="text-sm text-muted">Everything</span> : null}
                </div>
                <div className="mt-auto pt-5"><Button size="sm" iconRight="arrow-right" onClick={() => navigate("/find", { state: { savedSearch: s } })}>Run this search</Button></div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="bookmark" title="No saved searches" action={<Button to="/find" iconRight="arrow-right">Start searching</Button>}>
          Set up filters on Find work, then choose “Save search” to keep them.
        </EmptyState>
      )}
    </Container>
  );
}
