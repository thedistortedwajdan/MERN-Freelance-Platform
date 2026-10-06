import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../ui/Icon";
import { Avatar, Button, Card } from "../ui/primitives";
import { Field, StarRating, Textarea } from "../ui/forms";
import { useToast } from "../../context/ToastContext";
import { timeAgo } from "../../lib/format";
import api from "../../data/client";

export function RatingForm({ initial, onSubmit, onCancel, submitLabel = "Send review", busy }) {
  const [score, setScore] = useState(initial?.score || 0);
  const [comment, setComment] = useState(initial?.comment || "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (score) onSubmit({ score, comment });
      }}
      className="space-y-3"
    >
      <div className="flex items-center gap-3">
        <StarRating value={score} onChange={setScore} size={28} label="Your rating" />
        <span className="text-sm font-semibold text-muted">{["Tap a star", "Not great", "Could be better", "Good", "Very good", "Excellent"][score]}</span>
      </div>
      <Field>
        <Textarea rows={3} maxLength={1000} placeholder="Share what it was like to work together (optional)" value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Review" />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" loading={busy} disabled={!score}>{submitLabel}</Button>
        {onCancel ? <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button> : null}
      </div>
    </form>
  );
}

function ReplyForm({ ratingId, onDone }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.ratings.reply(ratingId, { reply: text });
      toast.success("Your reply is now public.");
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={send} className="mt-3 flex gap-2">
      <Textarea rows={1} maxLength={1000} placeholder="Write a public reply" value={text} onChange={(e) => setText(e.target.value)} aria-label="Reply" className="!min-h-10 !py-2" />
      <Button type="submit" size="sm" loading={busy} disabled={!text.trim()} className="self-start">Reply</Button>
    </form>
  );
}

/** One review. The author can edit, the rated person can reply, admins can remove. */
export function ReviewItem({ r, viewer, onChanged, taskTitle }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = viewer && r.from?._id === viewer._id;
  const toMe = viewer && r.to === viewer._id;

  const update = async (body) => {
    setBusy(true);
    try {
      await api.ratings.update(r._id, body);
      toast.success("Review updated.");
      setEditing(false);
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await api.admin.deleteRating(r._id);
      toast.success("Review removed.");
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <Avatar name={r.from?.name} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {r.from ? <Link to={`/users/${r.from._id}`} className="text-sm font-bold hover:underline">{r.from.name}</Link> : <span className="text-sm font-bold">Someone</span>}
            <StarRating value={r.score} readOnly size={15} />
            <span className="text-xs text-muted">{timeAgo(r.createdAt)}{r.updatedAt !== r.createdAt && !r.reply ? " · edited" : ""}</span>
          </div>
          {taskTitle ? <div className="mt-0.5 text-xs text-muted">For {taskTitle}</div> : null}
          {editing ? (
            <div className="mt-3"><RatingForm initial={r} onSubmit={update} onCancel={() => setEditing(false)} submitLabel="Save changes" busy={busy} /></div>
          ) : r.comment ? (
            <p className="mt-2 text-[15px] leading-relaxed">{r.comment}</p>
          ) : null}
          {r.reply ? (
            <div className="mt-3 rounded-xl bg-accent-soft/60 p-3 text-sm">
              <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-accent-ink"><Icon name="message" size={13} /> Reply · {timeAgo(r.repliedAt)}</div>
              {r.reply}
            </div>
          ) : toMe ? (
            <ReplyForm ratingId={r._id} onDone={() => onChanged?.()} />
          ) : null}
        </div>
        {(mine && !editing) || viewer?.role === "admin" ? (
          <div className="flex shrink-0 gap-1">
            {mine && !editing ? (
              <button onClick={() => setEditing(true)} aria-label="Edit review" className="rounded-full p-2 text-muted transition hover:bg-accent-soft hover:text-fg"><Icon name="edit" size={16} /></button>
            ) : null}
            {viewer?.role === "admin" ? (
              <button onClick={remove} aria-label="Remove review" className="rounded-full p-2 text-muted transition hover:bg-danger-soft hover:text-danger"><Icon name="trash" size={16} /></button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

/** Both sides of a finished task: rate the other person, and see what they said about you. */
export function TaskRatings({ task, viewer, ratings, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const other = viewer._id === task.employer?._id ? task.freelancer : task.employer;
  const given = ratings.find((r) => r.from?._id === viewer._id);
  const received = ratings.find((r) => r.to === viewer._id);

  const create = async ({ score, comment }) => {
    setBusy(true);
    try {
      await api.ratings.create({ to: other._id, task: task._id, score, comment });
      toast.success("Thank you. Your review helps others.");
      setOpen(false);
      onChanged();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="font-display text-xl font-medium">How did it go?</h2>
      {given ? (
        <div className="mt-4">
          <p className="mb-2 text-sm text-muted">Your review of {other.name}</p>
          <ReviewItem r={given} viewer={viewer} onChanged={onChanged} />
        </div>
      ) : open ? (
        <div className="mt-4">
          <p className="mb-3 text-sm text-muted">Rate your experience with <strong className="text-fg">{other.name}</strong>.</p>
          <RatingForm onSubmit={create} onCancel={() => setOpen(false)} busy={busy} />
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">A short review helps {other.name} build their name.</p>
          <Button icon="star" onClick={() => setOpen(true)}>Leave a review</Button>
        </div>
      )}
      {received ? (
        <div className="mt-6">
          <p className="mb-2 text-sm text-muted">What {other.name} said about you</p>
          <ReviewItem r={received} viewer={viewer} onChanged={onChanged} />
        </div>
      ) : null}
    </Card>
  );
}
