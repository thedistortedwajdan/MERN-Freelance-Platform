import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { Avatar, Button, Card, Chip, ErrorState, Skeleton, cx } from "../components/ui/primitives";
import { FileList } from "../components/ui/forms";
import { ConfirmDialog } from "../components/ui/overlay";
import { Container } from "../components/common/Brand";
import ReportModal from "../components/common/ReportModal";
import { SaveButton, StatusBadge, TaskMeta, TaskStepper } from "../components/task/TaskBits";
import { MyProposal, PromptModal, ProposalForm, ProposalList, SubmitWorkModal } from "../components/task/TaskPanels";
import { TaskRatings } from "../components/rating/Reviews";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { deadlineLabel, fullDate, money, timeAgo } from "../lib/format";
import api from "../data/client";

function Callout({ tone = "accent", icon, title, children }) {
  const tones = { accent: "bg-accent-soft text-accent-ink", violet: "bg-violet-soft text-violet", danger: "bg-danger-soft text-danger", success: "bg-success-soft text-success" };
  return (
    <div className={cx("rounded-2xl p-4", tones[tone])}>
      <div className="flex items-center gap-2 text-sm font-bold"><Icon name={icon} size={17} />{title}</div>
      <div className="mt-1.5 text-sm leading-relaxed text-fg">{children}</div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <Container className="py-8">
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="h-10 w-2/3" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-96 rounded-[20px]" />
        <Skeleton className="h-72 rounded-[20px]" />
      </div>
    </Container>
  );
}

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: task, loading, error, reload } = useAsync(() => api.tasks.get(id), [id]);
  useDocumentTitle(task?.title);

  const isEmployer = !!task && user._id === task.employer?._id;
  const isAssignee = !!task && user._id === task.freelancer?._id;
  const isParticipant = isEmployer || isAssignee;
  const isFreelancer = user.role === "freelancer";
  const isAdmin = user.role === "admin";

  const proposals = useAsync(() => (task && isEmployer ? api.proposals.forTask(id) : Promise.resolve([])), [id, task?.status, isEmployer]);
  const mine = useAsync(
    () => (task && isFreelancer ? api.proposals.mine().then((l) => l.find((p) => p.taskId === id) || null) : Promise.resolve(null)),
    [id, task?.status, isFreelancer]
  );
  const ratings = useAsync(async () => {
    if (!task || task.status !== "completed" || !isParticipant || !task.freelancer) return [];
    const [a, b] = await Promise.all([api.ratings.forUser(task.employer._id), api.ratings.forUser(task.freelancer._id)]);
    return [...a, ...b].filter((r) => r.task === task._id);
  }, [id, task?.status, isParticipant]);

  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const refreshAll = () => Promise.all([reload(true), proposals.reload(true), mine.reload(true), ratings.reload(true)]);

  const act = async (fn, message, { then, keep } = {}) => {
    setBusy(true);
    try {
      await fn();
      if (message) toast.success(message);
      if (!keep) setDialog(null);
      if (then) then();
      else await refreshAll();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <Container className="py-16">
        <ErrorState message={error.status === 404 ? "This task is no longer available." : error.message} onRetry={error.status === 404 ? undefined : reload} />
        <div className="text-center"><Button variant="secondary" onClick={() => navigate(-1)}>Go back</Button></div>
      </Container>
    );
  }
  if (loading && !task) return <DetailSkeleton />;
  if (!task) return null;

  const dl = task.status === "open" ? deadlineLabel(task.deadline) : null;
  const backTo = isEmployer ? { to: "/my-tasks", label: "My tasks" } : isAdmin ? { to: "/admin/tasks", label: "All tasks" } : isAssignee ? { to: "/my-tasks", label: "My work" } : { to: "/find", label: "Find work" };
  const canBid = isFreelancer && task.status === "open" && !mine.data;
  const myProposal = mine.data;
  const sharedFiles = isParticipant || isAdmin;

  return (
    <Container className="py-6 sm:py-10">
      <Link to={backTo.to} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-fg"><Icon name="arrow-left" size={15} />{backTo.label}</Link>

      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            {task.category ? <Chip tone="accent">{task.category}</Chip> : null}
            {task.hidden ? <Chip tone="danger" icon="eye">Hidden by moderators</Chip> : null}
          </div>
          <h1 className="font-display text-3xl font-medium leading-tight sm:text-5xl">{task.title}</h1>
          <TaskMeta task={task} className="mt-3 !text-sm" />
        </div>
        {!isEmployer && !isAdmin ? <SaveButton taskId={task._id} className="shrink-0 !h-11 !w-11 border border-line" /> : null}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_370px]">
        <div className="min-w-0 space-y-6">
          <Card className="space-y-6">
            <TaskStepper status={task.status} />
            <div>
              <h2 className="mb-2 font-display text-xl font-medium">About this task</h2>
              <p className="whitespace-pre-line leading-relaxed">{task.description}</p>
            </div>
            {task.skills?.length ? (
              <div>
                <h3 className="mb-2 text-sm font-bold">Skills that help</h3>
                <div className="flex flex-wrap gap-2">{task.skills.map((s) => <Chip key={s} tone="outline" className="!text-sm !px-3 !py-1">{s}</Chip>)}</div>
              </div>
            ) : null}
            {task.attachments?.length ? (
              <div>
                <h3 className="mb-2 text-sm font-bold">Files from the employer</h3>
                <FileList files={task.attachments} />
              </div>
            ) : null}
          </Card>

          {task.revisionNote && isParticipant ? <Callout tone="accent" icon="undo" title="Changes requested">{task.revisionNote}</Callout> : null}
          {task.cancelReason && task.status === "cancelled" ? <Callout tone="danger" icon="ban" title="Why it was cancelled">{task.cancelReason}</Callout> : null}

          {(task.submissionNote || task.deliverables?.length) && sharedFiles ? (
            <Card>
              <h2 className="font-display text-xl font-medium">Delivered work</h2>
              {task.submittedAt ? <p className="mt-0.5 text-xs text-muted">Submitted {timeAgo(task.submittedAt)}</p> : null}
              {task.submissionNote ? <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed">{task.submissionNote}</p> : null}
              <FileList files={task.deliverables} className="mt-3" />
            </Card>
          ) : null}

          {isEmployer && (task.status === "open" || (proposals.data || []).length > 0) ? <ProposalList task={task} proposals={proposals.data || []} onChange={refreshAll} /> : null}

          {task.status === "completed" && isParticipant && task.freelancer ? (
            <TaskRatings task={task} viewer={user} ratings={ratings.data || []} onChanged={() => ratings.reload(true)} />
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs font-medium text-muted">{task.agreedPrice != null && task.status !== "open" ? "Agreed price" : "Budget"}</div>
                <div className="font-display text-4xl font-medium">{money(task.agreedPrice != null && task.status !== "open" ? task.agreedPrice : task.price)}</div>
              </div>
              {dl ? <Chip tone={dl.tone === "warning" ? "accent" : dl.tone === "danger" ? "danger" : "neutral"} icon="clock">{dl.text}</Chip> : null}
            </div>
            {task.deadline ? <div className="flex items-center gap-2 text-sm text-muted"><Icon name="calendar" size={15} />Needed by {fullDate(task.deadline)}</div> : null}

            {/* freelancer, open */}
            {canBid ? (
              <>
                <div className="border-t border-line pt-5"><ProposalForm task={task} onSent={refreshAll} /></div>
                <Button variant="secondary" className="w-full" onClick={() => setDialog("accept")}>Or accept at {money(task.price)} right now</Button>
              </>
            ) : null}
            {isFreelancer && task.status === "open" && myProposal ? (
              <div className="border-t border-line pt-5">
                <MyProposal proposal={myProposal} task={task} onChange={refreshAll} />
                {myProposal.status === "pending" ? <Button variant="soft" className="mt-2 w-full" onClick={() => setDialog("accept")}>Accept at {money(task.price)} instead</Button> : null}
              </div>
            ) : null}
            {isFreelancer && !isAssignee && myProposal && task.status !== "open" ? (
              <div className="border-t border-line pt-5"><MyProposal proposal={myProposal} task={task} onChange={refreshAll} /></div>
            ) : null}

            {/* assignee */}
            {isAssignee && task.status === "assigned" ? (
              <div className="space-y-2 border-t border-line pt-5">
                <Button className="w-full" size="lg" icon="upload" onClick={() => setDialog("submit")}>Hand in your work</Button>
                <Button variant="secondary" className="w-full" icon="message" to={`/messages/${task._id}`}>Message {task.employer?.name.split(" ")[0]}</Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => setDialog("withdraw")}>Step back</Button>
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => setDialog("dispute")}>Raise a problem</Button>
                </div>
              </div>
            ) : null}
            {isAssignee && task.status === "submitted" ? (
              <div className="space-y-2 border-t border-line pt-5">
                <Callout tone="violet" icon="clock" title="Waiting for review">Your work is with {task.employer?.name}. You will be notified as soon as they respond.</Callout>
                <Button variant="secondary" className="w-full" icon="message" to={`/messages/${task._id}`}>Message {task.employer?.name.split(" ")[0]}</Button>
              </div>
            ) : null}
            {isAssignee && task.status === "completed" ? (
              <div className="space-y-2 border-t border-line pt-5">
                <Callout tone="success" icon="sparkles" title="Task complete">Well done. This one is now part of your story.</Callout>
                <Button variant="secondary" className="w-full" icon="message" to={`/messages/${task._id}`}>Open conversation</Button>
              </div>
            ) : null}

            {/* employer */}
            {isEmployer && task.status === "open" ? (
              <div className="space-y-2 border-t border-line pt-5">
                <Button variant="secondary" className="w-full" icon="edit" to={`/tasks/${task._id}/edit`}>Edit task</Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => setDialog("cancel")}>Cancel task</Button>
                  <Button variant="danger-soft" size="sm" className="flex-1" icon="trash" onClick={() => setDialog("delete")}>Delete</Button>
                </div>
              </div>
            ) : null}
            {isEmployer && task.status === "assigned" ? (
              <div className="space-y-2 border-t border-line pt-5">
                <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                  <Avatar name={task.freelancer?.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/users/${task.freelancer?._id}`} className="block truncate text-sm font-bold hover:underline">{task.freelancer?.name}</Link>
                    <div className="text-xs text-muted">Working on this now</div>
                  </div>
                </div>
                <Button className="w-full" icon="message" to={`/messages/${task._id}`}>Message {task.freelancer?.name.split(" ")[0]}</Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => setDialog("cancel")}>Cancel task</Button>
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => setDialog("dispute")}>Raise a problem</Button>
                </div>
              </div>
            ) : null}
            {isEmployer && task.status === "submitted" ? (
              <div className="space-y-2 border-t border-line pt-5">
                <Callout tone="violet" icon="upload" title="Work is ready for you">{task.freelancer?.name} has handed in their work. Take a look, then approve it or ask for changes.</Callout>
                <Button className="w-full" size="lg" icon="check" onClick={() => setDialog("approve")}>Approve and finish</Button>
                <Button variant="secondary" className="w-full" icon="undo" onClick={() => setDialog("revision")}>Ask for changes</Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" icon="message" to={`/messages/${task._id}`}>Message</Button>
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => setDialog("dispute")}>Raise a problem</Button>
                </div>
              </div>
            ) : null}
            {isEmployer && task.status === "completed" ? (
              <div className="space-y-2 border-t border-line pt-5">
                <Callout tone="success" icon="sparkles" title="All done">Thank you for giving someone the chance to do great work.</Callout>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setDialog("dispute")}>Raise a problem</Button>
              </div>
            ) : null}

            {/* admin */}
            {isAdmin ? (
              <div className="space-y-2 border-t border-line pt-5">
                <Button variant={task.hidden ? "secondary" : "danger-soft"} className="w-full" icon="eye" loading={busy} onClick={() => act(() => api.admin.setHidden(task._id, !task.hidden), task.hidden ? "Task is visible again." : "Task hidden from search.")}>
                  {task.hidden ? "Make visible again" : "Hide from search"}
                </Button>
              </div>
            ) : null}
          </Card>

          {!isEmployer && task.employer ? (
            <Card className="flex items-center gap-3">
              <Avatar name={task.employer.name} size={44} />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted">Posted by</div>
                <Link to={`/users/${task.employer._id}`} className="block truncate font-bold hover:underline">{task.employer.name}</Link>
              </div>
              <Button size="sm" variant="secondary" to={`/users/${task.employer._id}`}>View</Button>
            </Card>
          ) : null}

          {!isEmployer && !isAdmin ? (
            <button onClick={() => setDialog("report")} className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-danger">
              <Icon name="flag" size={13} /> Report this task
            </button>
          ) : null}
        </aside>
      </div>

      <ConfirmDialog open={dialog === "accept"} onClose={() => setDialog(null)} loading={busy} confirmLabel="Accept task" title="Accept this task?" onConfirm={() => act(() => api.tasks.accept(task._id), "It is yours. Say hello in Messages.")}>
        You will take the task at the posted budget of <strong>{money(task.price)}</strong>. The employer is notified straight away.
      </ConfirmDialog>
      <ConfirmDialog open={dialog === "withdraw"} onClose={() => setDialog(null)} loading={busy} confirmLabel="Step back" title="Step back from this task?" onConfirm={() => act(() => api.tasks.withdraw(task._id), "You have stepped back. The task is open again.")}>
        The task goes back to the open pool and the employer is told. It is always better to say so early.
      </ConfirmDialog>
      <ConfirmDialog open={dialog === "approve"} onClose={() => setDialog(null)} loading={busy} confirmLabel="Approve" title="Approve this work?" onConfirm={() => act(() => api.tasks.approve(task._id), "Approved. Do not forget to leave a review.")}>
        This marks the task as complete. You can both leave reviews afterwards.
      </ConfirmDialog>
      <ConfirmDialog open={dialog === "delete"} onClose={() => setDialog(null)} loading={busy} tone="danger" confirmLabel="Delete task" title="Delete this task?" onConfirm={() => act(() => api.tasks.remove(task._id), "Task deleted.", { then: () => navigate("/my-tasks", { replace: true }) })}>
        It will be removed along with any proposals. If someone has already worked on it, cancel it instead.
      </ConfirmDialog>

      <SubmitWorkModal open={dialog === "submit"} onClose={() => setDialog(null)} task={task} onDone={refreshAll} />
      <PromptModal open={dialog === "revision"} onClose={() => setDialog(null)} title="Ask for changes" subtitle="Be specific so they know exactly what to adjust." label="What should change?" placeholder="e.g. Please use a warmer colour for the sale badge." confirmLabel="Send request" onSubmit={async (note) => { await api.tasks.revision(task._id, { note }); toast.success("Request sent."); refreshAll(); }} />
      <PromptModal open={dialog === "cancel"} onClose={() => setDialog(null)} title="Cancel this task?" subtitle="Everyone involved will be told." label="Reason" placeholder="Share a short reason (optional)" required={false} tone="danger" confirmLabel="Cancel task" onSubmit={async (reason) => { await api.tasks.cancel(task._id, { reason }); toast.info("Task cancelled."); refreshAll(); }} />
      <PromptModal open={dialog === "dispute"} onClose={() => setDialog(null)} title="Raise a problem" subtitle="A moderator will review both sides and help settle it." label="What went wrong?" placeholder="Describe the problem clearly and calmly." confirmLabel="Open dispute" onSubmit={async (reason) => { await api.disputes.open(task._id, { reason }); toast.success("A moderator will look into it."); navigate("/disputes"); }} />
      <ReportModal open={dialog === "report"} onClose={() => setDialog(null)} targetType="task" targetId={task._id} label="this task" />
    </Container>
  );
}
