import { Link } from "react-router-dom";
import Icon from "../ui/Icon";
import { Card, Chip, ProgressRing, cx } from "../ui/primitives";
import { Stepper } from "../ui/overlay";
import { STATUS_LABEL, deadlineLabel, money, matchScore } from "../../lib/format";
import { useLive } from "../../context/LiveContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const STATUS_TONE = { open: "info", assigned: "accent", submitted: "violet", completed: "success", cancelled: "danger", expired: "neutral" };

export function StatusBadge({ status }) {
  return <Chip tone={STATUS_TONE[status] || "neutral"}>{STATUS_LABEL[status] || status}</Chip>;
}

export function TaskMeta({ task, className = "" }) {
  const dl = task.status === "open" ? deadlineLabel(task.deadline) : null;
  return (
    <div className={cx("flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted", className)}>
      {task.location ? (
        <span className="inline-flex items-center gap-1.5"><Icon name="map-pin" size={14} />{task.location}</span>
      ) : null}
      {dl ? (
        <span className={cx("inline-flex items-center gap-1.5", dl.tone === "warning" && "font-semibold text-accent-ink", dl.tone === "danger" && "text-danger")}>
          <Icon name="clock" size={14} />{dl.text}
        </span>
      ) : null}
      {task.employer ? (
        <span className="inline-flex items-center gap-1.5"><Icon name="user" size={14} />{task.employer.name}</span>
      ) : null}
    </div>
  );
}

export function SaveButton({ taskId, className = "" }) {
  const { favorites, toggleFavorite } = useLive();
  const toast = useToast();
  const saved = favorites.has(taskId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save for later"}
      title={saved ? "Saved" : "Save for later"}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const now = await toggleFavorite(taskId);
          toast.success(now ? "Saved for later." : "Removed from saved.");
        } catch (err) {
          toast.error(err.message);
        }
      }}
      className={cx("flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90", saved ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-accent-soft hover:text-fg", className)}
    >
      <Icon name="heart" size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

export function TaskCard({ task, showSave = true, showMatch = true, footer }) {
  const { profile, user } = useAuth();
  const match = showMatch && user?.role === "freelancer" ? matchScore(profile?.skills, task) : null;
  return (
    <Card hover className="group relative flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {task.category ? <Chip tone="accent">{task.category}</Chip> : null}
          {task.status !== "open" ? <StatusBadge status={task.status} /> : null}
        </div>
        <div className="flex items-center gap-1.5">
          {match ? <ProgressRing value={match} /> : null}
          {showSave && user?.role !== "admin" ? <SaveButton taskId={task._id} /> : null}
        </div>
      </div>
      <h3 className="mt-3 font-display text-xl font-medium leading-snug">
        <Link to={`/tasks/${task._id}`} className="after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none">
          {task.title}
        </Link>
      </h3>
      <TaskMeta task={task} className="mt-2" />
      {task.skills?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.skills.slice(0, 3).map((s) => (
            <span key={s} className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">{s}</span>
          ))}
          {task.skills.length > 3 ? <span className="px-1 text-xs text-muted">+{task.skills.length - 3}</span> : null}
        </div>
      ) : null}
      <div className="mt-auto flex items-end justify-between pt-5">
        <div>
          <div className="text-xs text-muted">{task.agreedPrice != null && task.status !== "open" ? "Agreed" : "Budget"}</div>
          <div className="font-display text-2xl font-medium">{money(task.agreedPrice != null && task.status !== "open" ? task.agreedPrice : task.price)}</div>
        </div>
        <span className="relative z-10 flex items-center gap-1 text-sm font-semibold text-accent-ink transition group-hover:gap-2">
          {footer || "View details"} <Icon name="arrow-right" size={16} />
        </span>
      </div>
    </Card>
  );
}

export function TaskRow({ task, right, sub }) {
  return (
    <Card hover padded={false} className="relative">
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            {task.category ? <span className="text-xs font-medium text-muted">{task.category}</span> : null}
          </div>
          <h3 className="mt-1.5 truncate font-display text-lg font-medium">
            <Link to={`/tasks/${task._id}`} className="after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none">{task.title}</Link>
          </h3>
          <div className="mt-1 text-[13px] text-muted">{sub || <TaskMeta task={task} />}</div>
        </div>
        <div className="relative z-10 shrink-0 text-right">
          <div className="font-display text-xl font-medium">{money(task.agreedPrice != null && task.status !== "open" ? task.agreedPrice : task.price)}</div>
          {right}
        </div>
      </div>
    </Card>
  );
}

/** Lifecycle path. Cancelled/expired tasks show a banner instead. */
export function TaskStepper({ status }) {
  if (status === "cancelled" || status === "expired") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
        <Icon name={status === "expired" ? "clock" : "ban"} size={18} />
        {status === "expired" ? "This task passed its deadline and is no longer open." : "This task was cancelled."}
      </div>
    );
  }
  const order = ["open", "assigned", "submitted", "completed"];
  const idx = order.indexOf(status);
  const labels = ["Posted", "In progress", "In review", "Done"];
  return (
    <Stepper
      steps={labels.map((label, i) => ({ label, state: i < idx || status === "completed" ? "done" : i === idx ? "current" : "todo" }))}
    />
  );
}
