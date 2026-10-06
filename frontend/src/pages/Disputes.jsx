import { Link } from "react-router-dom";
import { Button, Card, Chip, EmptyState, ErrorState, Skeleton } from "../components/ui/primitives";
import { Container } from "../components/common/Brand";
import { useAuth } from "../context/AuthContext";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { timeAgo } from "../lib/format";
import api from "../data/client";

const TONE = { open: "accent", resolved: "success", dismissed: "neutral" };
const OUTCOME = { none: "No change to the task", complete_task: "Task marked as completed", cancel_task: "Task cancelled" };

export default function Disputes() {
  useDocumentTitle("Disputes");
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.disputes.mine({ size: 50 }), []);

  return (
    <Container narrow className="py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium sm:text-5xl">Disputes</h1>
        <p className="mt-2 text-muted">When something goes wrong, a moderator listens to both sides and helps settle it fairly.</p>
      </div>
      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton className="h-40 rounded-[20px]" />
      ) : data.data.length ? (
        <ul className="space-y-4">
          {data.data.map((d) => {
            const mine = d.openedBy?._id === user._id;
            return (
              <li key={d._id}>
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={TONE[d.status]} className="capitalize">{d.status}</Chip>
                    <span className="text-xs text-muted">Opened {timeAgo(d.createdAt)}</span>
                  </div>
                  <Link to={`/tasks/${d.taskId}`} className="mt-2 block font-display text-xl font-medium hover:underline">{d.taskTitle || "Task"}</Link>
                  <p className="mt-1 text-sm text-muted">{mine ? `You opened this against ${d.against?.name}` : `${d.openedBy?.name} opened this against you`}</p>
                  <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed">{d.reason}</p>
                  {d.status !== "open" ? (
                    <div className="mt-3 rounded-2xl bg-success-soft/70 p-3 text-sm">
                      <div className="font-semibold">{OUTCOME[d.outcome]}</div>
                      {d.resolutionNote ? <p className="mt-0.5 text-fg">{d.resolutionNote}</p> : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted">A moderator will review this soon. You can keep chatting in the meantime.</p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon="shield" title="No disputes" action={<Button to="/my-tasks" variant="secondary">Back to my tasks</Button>}>
          Nothing to resolve. If a task ever goes sideways, you can raise a problem from its page.
        </EmptyState>
      )}
    </Container>
  );
}
