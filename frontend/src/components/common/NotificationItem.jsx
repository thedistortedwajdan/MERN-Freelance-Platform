import { Link } from "react-router-dom";
import Icon from "../ui/Icon";
import { cx } from "../ui/primitives";
import { notifyHref, notifyMeta } from "../../lib/notify";
import { timeAgo } from "../../lib/format";

const TONE = {
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  violet: "bg-violet-soft text-violet",
  accent: "bg-accent-soft text-accent-ink",
  neutral: "bg-surface-2 text-muted",
};

export default function NotificationItem({ n, role, onOpen, compact = false }) {
  const meta = notifyMeta(n.type);
  return (
    <Link
      to={notifyHref(n, role)}
      onClick={() => onOpen?.(n)}
      className={cx("flex items-start gap-3 rounded-2xl transition hover:bg-accent-soft/60", compact ? "px-3 py-2.5" : "p-4", !n.read && "bg-accent-soft/40")}
    >
      <span className={cx("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", TONE[meta.tone])}>
        <Icon name={meta.icon} size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cx("block text-sm leading-snug", !n.read && "font-semibold")}>{n.message}</span>
        <span className="mt-0.5 block text-xs text-muted">{timeAgo(n.createdAt)}</span>
      </span>
      {!n.read ? <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-label="Unread" /> : null}
    </Link>
  );
}
