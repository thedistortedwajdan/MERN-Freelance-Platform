export const money = (n) =>
  n == null || Number.isNaN(Number(n)) ? "—" : `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

const DAY = 86400000;

export function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function deadlineLabel(iso) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return { text: "Deadline passed", tone: "danger" };
  const days = Math.ceil(diff / DAY);
  if (days <= 1) return { text: "Due today", tone: "warning" };
  if (days <= 3) return { text: `${days} days left`, tone: "warning" };
  return { text: `${days} days left`, tone: "neutral" };
}

export const fullDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "";

export const clock = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

export function fileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Share of the task's skills the freelancer lists, as a 55-99 score. Null when it cannot be computed. */
export function matchScore(userSkills = [], task) {
  const wanted = (task?.skills || []).map((s) => s.toLowerCase());
  if (!userSkills.length || !wanted.length) return null;
  const have = new Set(userSkills.map((s) => s.toLowerCase()));
  const hits = wanted.filter((s) => have.has(s)).length;
  return Math.min(99, Math.round(55 + (hits / wanted.length) * 44));
}

export const STATUS_LABEL = {
  open: "Open",
  assigned: "In progress",
  submitted: "Awaiting review",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function greeting(name) {
  const h = new Date().getHours();
  const part = h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name.split(" ")[0]}` : part;
}
