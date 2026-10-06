import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, EmptyState, ErrorState, Skeleton } from "../components/ui/primitives";
import { ConfirmDialog } from "../components/ui/overlay";
import { Container } from "../components/common/Brand";
import ReportModal from "../components/common/ReportModal";
import { PortfolioBlock, ProfileHero, SkillsBlock } from "../components/profile/ProfileParts";
import { ReviewItem } from "../components/rating/Reviews";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import api from "../data/client";

export default function PublicProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.users.publicProfile(id), [id]);
  const reviews = useAsync(() => api.ratings.forUser(id), [id]);
  const blocks = useAsync(() => (user && user.role !== "admin" ? api.users.blocks() : Promise.resolve([])), [user?._id]);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(data?.user.name);

  const self = user?._id === id;
  const blocked = (blocks.data || []).some((b) => b._id === id);

  const toggleBlock = async () => {
    setBusy(true);
    try {
      if (blocked) await api.users.unblock(id);
      else await api.users.block(id);
      toast.info(blocked ? "Unblocked." : "Blocked. You will not see messages or proposals from each other.");
      setDialog(null);
      blocks.reload(true);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Container className="py-16"><ErrorState message={error.status === 404 ? "We could not find that person." : error.message} onRetry={error.status === 404 ? undefined : reload} /></Container>;
  if (loading && !data) return <Container className="space-y-5 py-10"><Skeleton className="h-40 rounded-[20px]" /><Skeleton className="h-64 rounded-[20px]" /></Container>;
  const { user: u, avgRating, totalRatings, completedTasks } = data;

  const actions = self ? (
    <Button variant="secondary" to="/profile" icon="edit">Edit profile</Button>
  ) : user && user.role !== "admin" ? (
    <>
      <Button variant="ghost" icon="flag" onClick={() => setDialog("report")}>Report</Button>
      <Button variant={blocked ? "secondary" : "ghost"} icon="ban" onClick={() => setDialog("block")}>{blocked ? "Unblock" : "Block"}</Button>
    </>
  ) : !user ? (
    <Button to="/register" iconRight="arrow-right">Join GigPilot</Button>
  ) : null;

  return (
    <Container className="space-y-6 py-8 sm:py-12">
      <ProfileHero user={u} avg={avgRating} total={totalRatings} actions={actions} />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {u.bio ? <Card><h2 className="mb-2 font-display text-xl font-medium">About</h2><p className="whitespace-pre-line leading-relaxed">{u.bio}</p></Card> : null}
          <SkillsBlock skills={u.skills} />
          <PortfolioBlock items={u.portfolio} />
          <Card>
            <h2 className="mb-4 font-display text-xl font-medium">Reviews <span className="text-base text-muted">({reviews.data?.length ?? totalRatings})</span></h2>
            {reviews.data?.length ? (
              <div className="space-y-3">{reviews.data.map((r) => <ReviewItem key={r._id} r={r} viewer={user} onChanged={() => { reviews.reload(true); reload(true); }} />)}</div>
            ) : (
              <EmptyState icon="star" title="No reviews yet" className="!py-8">Reviews appear here after a task is finished.</EmptyState>
            )}
          </Card>
        </div>
        <aside className="space-y-4">
          <Card>
            <h2 className="mb-3 font-display text-xl font-medium">Recent finished tasks</h2>
            {completedTasks.length ? (
              <ul className="space-y-3">
                {completedTasks.map((t) => (
                  <li key={t._id}>
                    <Link to={user ? `/tasks/${t._id}` : "/login"} className="block rounded-2xl border border-line p-3 transition hover:border-accent">
                      <div className="font-semibold leading-snug">{t.title}</div>
                      <div className="mt-0.5 text-xs text-muted">{t.category || "Task"}{t.location ? ` · ${t.location}` : ""}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing finished yet. Everyone starts somewhere.</p>
            )}
          </Card>
        </aside>
      </div>

      <ReportModal open={dialog === "report"} onClose={() => setDialog(null)} targetType="user" targetId={id} label={u.name} />
      <ConfirmDialog open={dialog === "block"} onClose={() => setDialog(null)} onConfirm={toggleBlock} loading={busy} title={blocked ? `Unblock ${u.name}?` : `Block ${u.name}?`} confirmLabel={blocked ? "Unblock" : "Block"} tone={blocked ? "primary" : "danger"}>
        {blocked ? "You will be able to message and work with each other again." : "You will not be able to message each other, send proposals to each other's tasks, or accept them. You can undo this any time."}
      </ConfirmDialog>
    </Container>
  );
}
