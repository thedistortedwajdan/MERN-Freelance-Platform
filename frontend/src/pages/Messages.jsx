import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { Avatar, Button, EmptyState, Skeleton, Spinner, cx } from "../components/ui/primitives";
import { StatusBadge } from "../components/task/TaskBits";
import { Container } from "../components/common/Brand";
import { useAuth } from "../context/AuthContext";
import { useLive } from "../context/LiveContext";
import { useToast } from "../context/ToastContext";
import { useAsync, usePolling, useDocumentTitle } from "../lib/hooks";
import { clock, timeAgo } from "../lib/format";
import api from "../data/client";

const POLL_MS = 500;
const WRITABLE = ["assigned", "submitted", "completed"];

const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((new Date(today.toDateString()) - new Date(d.toDateString())) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};

function ConversationList({ convos, activeId, loading }) {
  if (loading && !convos) {
    return <div className="space-y-2 p-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>;
  }
  if (!convos?.length) {
    return (
      <EmptyState icon="message" title="No conversations yet" className="!py-12">
        Chats open as soon as a task is assigned. Your first one is closer than you think.
      </EmptyState>
    );
  }
  return (
    <ul className="space-y-1 p-2">
      {convos.map((c) => (
        <li key={c.taskId}>
          <Link
            to={`/messages/${c.taskId}`}
            className={cx("flex items-center gap-3 rounded-2xl p-3 transition", activeId === c.taskId ? "bg-accent-soft" : "hover:bg-accent-soft/50")}
          >
            <Avatar name={c.otherUser?.name} size={44} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className={cx("truncate text-sm", c.unread ? "font-bold" : "font-semibold")}>{c.otherUser?.name}</span>
                {c.lastMessage ? <span className="shrink-0 text-[11px] text-muted">{timeAgo(c.lastMessage.createdAt)}</span> : null}
              </span>
              <span className="block truncate text-xs text-muted">{c.taskTitle}</span>
              <span className={cx("block truncate text-[13px]", c.unread ? "font-semibold text-fg" : "text-muted")}>
                {c.lastMessage ? c.lastMessage.text : "Say hello"}
              </span>
            </span>
            {c.unread ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-on-accent">{c.unread}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Thread({ taskId, meta, meId }) {
  const toast = useToast();
  const { refresh } = useLive();
  const [msgs, setMsgs] = useState(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef(null);
  const stick = useRef(true);
  const input = useRef(null);

  useEffect(() => {
    let alive = true;
    api.messages
      .list(taskId)
      .then((list) => {
        if (!alive) return;
        setMsgs(list);
        api.messages.markRead(taskId).then(refresh);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [taskId, refresh]);

  // Cheap poll: only messages newer than the last one we have.
  const poll = useCallback(async () => {
    if (msgs === null) return;
    const after = msgs.length ? msgs[msgs.length - 1]._id : undefined;
    const fresh = await api.messages.list(taskId, { after });
    if (!fresh.length) return;
    setMsgs((prev) => {
      const known = new Set(prev.map((m) => m._id));
      const add = fresh.filter((m) => !known.has(m._id));
      return add.length ? [...prev, ...add] : prev;
    });
    if (fresh.some((m) => m.sender !== meId)) {
      api.messages.markRead(taskId).then(refresh);
    }
  }, [msgs, taskId, meId, refresh]);
  usePolling(poll, POLL_MS, msgs !== null);

  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const m = await api.messages.send(taskId, text);
      setDraft("");
      stick.current = true;
      setMsgs((prev) => (prev.some((x) => x._id === m._id) ? prev : [...prev, m]));
      input.current?.focus();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const writable = WRITABLE.includes(meta?.taskStatus);

  if (error) return <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted">{error}</div>;
  if (msgs === null) return <div className="flex flex-1 items-center justify-center text-muted"><Spinner size={24} /></div>;

  let lastDay = "";
  const lastMineIdx = msgs.map((m) => m.sender === meId).lastIndexOf(true);

  return (
    <>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
        }}
        className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {msgs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted">
            <Icon name="sparkles" size={26} className="mb-2 text-accent-ink" />
            Start the conversation. A friendly hello goes a long way.
          </div>
        ) : null}
        {msgs.map((m, i) => {
          const mine = m.sender === meId;
          const day = dayLabel(m.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          const prev = msgs[i - 1];
          const grouped = prev && prev.sender === m.sender && !showDay;
          return (
            <div key={m._id}>
              {showDay ? <div className="my-4 text-center text-xs font-semibold text-muted">{day}</div> : null}
              <div className={cx("flex", mine ? "justify-end" : "justify-start", grouped ? "mt-0.5" : "mt-3")}>
                <div
                  className={cx(
                    "max-w-[82%] whitespace-pre-wrap break-words rounded-[20px] px-4 py-2.5 text-[15px] leading-snug sm:max-w-[70%]",
                    mine ? "rounded-br-md bg-accent text-on-accent" : "rounded-bl-md bg-surface-2"
                  )}
                  title={clock(m.createdAt)}
                >
                  {m.text}
                </div>
              </div>
              {i === lastMineIdx || !msgs[i + 1] || msgs[i + 1].sender !== m.sender ? (
                <div className={cx("mt-1 px-1 text-[11px] text-muted", mine ? "text-right" : "text-left")}>
                  {clock(m.createdAt)}{mine && i === lastMineIdx && m.readAt ? " · Seen" : ""}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {writable ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2 border-t border-line p-3"
        >
          <textarea
            ref={input}
            value={draft}
            rows={1}
            maxLength={2000}
            aria-label="Write a message"
            placeholder="Write a message…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-line bg-surface px-4 py-2.5 text-[15px] leading-snug outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/20"
          />
          <Button type="submit" className="!h-11 !w-11 !px-0" aria-label="Send message" loading={sending} disabled={!draft.trim()}>
            {!sending ? <Icon name="send" size={18} /> : null}
          </Button>
        </form>
      ) : (
        <div className="border-t border-line px-4 py-3 text-center text-sm text-muted">This conversation is closed.</div>
      )}
    </>
  );
}

export default function Messages() {
  useDocumentTitle("Messages");
  const { taskId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const convos = useAsync(() => api.messages.conversations(), []);
  usePolling(() => convos.reload(true), 1500);

  const active = convos.data?.find((c) => c.taskId === taskId);

  return (
    <Container className="py-4 sm:py-8">
      <div className="mb-4 hidden items-end justify-between sm:flex">
        <h1 className="font-display text-3xl font-medium sm:text-4xl">Messages</h1>
      </div>
      <div className="grid h-[calc(100dvh-10.5rem)] overflow-hidden rounded-[24px] border border-line bg-surface shadow-card sm:h-[calc(100dvh-12rem)] md:grid-cols-[340px_1fr] md:h-[calc(100dvh-14rem)] md:min-h-[480px]">
        <div className={cx("flex-col border-line md:flex md:border-r", taskId ? "hidden" : "flex")}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-lg font-medium md:hidden">Messages</h2>
            <h2 className="hidden text-sm font-bold md:block">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList convos={convos.data} activeId={taskId} loading={convos.loading} />
          </div>
        </div>

        <div className={cx("min-h-0 min-w-0 flex-col md:flex", taskId ? "flex" : "hidden")}>
          {taskId ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-5">
                <button onClick={() => navigate("/messages")} className="rounded-full p-2 text-muted hover:bg-accent-soft md:hidden" aria-label="Back to conversations">
                  <Icon name="arrow-left" size={18} />
                </button>
                <Avatar name={active?.otherUser?.name} size={40} />
                <div className="min-w-0 flex-1">
                  <Link to={`/users/${active?.otherUser?._id}`} className="block truncate text-sm font-bold hover:underline">{active?.otherUser?.name || "Conversation"}</Link>
                  <Link to={`/tasks/${taskId}`} className="block truncate text-xs text-muted hover:text-fg hover:underline">{active?.taskTitle}</Link>
                </div>
                {active ? <span className="hidden sm:block"><StatusBadge status={active.taskStatus} /></span> : null}
                <span className="hidden sm:inline-flex"><Button size="sm" variant="secondary" to={`/tasks/${taskId}`}>View task</Button></span>
              </div>
              <Thread key={taskId} taskId={taskId} meta={active} meId={user._id} />
            </>
          ) : (
            <div className="hidden flex-1 items-center justify-center md:flex">
              <EmptyState icon="message" title="Pick a conversation">Choose someone on the left to read and reply.</EmptyState>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
