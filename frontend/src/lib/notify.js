const META = {
  proposal_received: { icon: "briefcase", tone: "info" },
  proposal_accepted: { icon: "check-circle", tone: "success" },
  proposal_rejected: { icon: "x", tone: "neutral" },
  task_accepted: { icon: "check-circle", tone: "success" },
  task_submitted: { icon: "upload", tone: "violet" },
  revision_requested: { icon: "undo", tone: "accent" },
  task_completed: { icon: "sparkles", tone: "success" },
  task_cancelled: { icon: "ban", tone: "danger" },
  task_withdrawn: { icon: "undo", tone: "accent" },
  task_expired: { icon: "clock", tone: "neutral" },
  rating_received: { icon: "star", tone: "accent" },
  rating_reply: { icon: "message", tone: "info" },
  dispute_opened: { icon: "gavel", tone: "danger" },
  dispute_resolved: { icon: "gavel", tone: "success" },
  report_resolved: { icon: "flag", tone: "neutral" },
};

export const notifyMeta = (type) => META[type] || { icon: "bell", tone: "accent" };

export function notifyHref(n, role) {
  if (n.type.startsWith("dispute")) return role === "admin" ? "/admin/disputes" : "/disputes";
  if (n.task) return `/tasks/${n.task}`;
  return "/notifications";
}
