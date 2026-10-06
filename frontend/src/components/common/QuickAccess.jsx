import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../ui/Icon";
import { Avatar, Button, cx } from "../ui/primitives";
import { ConfirmDialog } from "../ui/overlay";
import { homePathFor, useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useClickOutside, usePolling } from "../../lib/hooks";
import api from "../../data/client";

const KEY = "gp.quick-access";

const GROUPS = [
  { role: "freelancer", title: "Freelancers", hint: "Find work, bid, deliver" },
  { role: "employer", title: "Employers", hint: "Post, hire, review" },
  { role: "admin", title: "Admin", hint: "Moderate everything" },
];

const NOTES = {
  "ayesha@example.com": "Has proposals, a task in progress and an unread chat",
  "hamza@example.com": "Bid on two tasks, has a dispute to answer",
  "noor@example.com": "Delivered work that is waiting for review",
  "bilal@example.com": "Has proposals to review and a freelancer working",
  "sara@example.com": "Has finished work to approve and review",
  "omar@example.com": "Opened a dispute, email not yet confirmed",
  "quick@example.com": "Reported account, good for moderation",
  "admin@example.com": "Disputes, reports, people, activity log",
};

const CODE_LABEL = { password_reset: "Password reset", email_verification: "Email confirmation" };

function CopyButton({ value }) {
  const toast = useToast();
  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success("Copied.");
        } catch {
          toast.info(value);
        }
      }}
      className="rounded-full p-1.5 text-muted transition hover:bg-accent-soft hover:text-fg"
    >
      <Icon name="copy" size={14} />
    </button>
  );
}

/** Floating helper that gives anyone everything they need to try every part of the app. */
export default function QuickAccess() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const ref = useRef(null);
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "open";
    } catch {
      return false;
    }
  });
  const [people, setPeople] = useState(() => api.dev.personas());
  const [codes, setCodes] = useState(() => api.dev.codes());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(KEY, open ? "open" : "closed");
    } catch {
      // ignore
    }
  }, [open]);

  usePolling(
    () => {
      setPeople(api.dev.personas());
      setCodes(api.dev.codes());
    },
    1500,
    open
  );

  useClickOutside(ref, () => setOpen(false), open && window.matchMedia("(max-width: 767px)").matches);

  const signInAs = async (p) => {
    setBusy(p._id);
    try {
      if (user) await logout();
      const u = await login(p.email, p.password);
      navigate(homePathFor(u.role), { replace: true });
      toast.success(`Signed in as ${u.name}.`);
      if (window.matchMedia("(max-width: 767px)").matches) setOpen(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  };

  const startOver = async () => {
    await logout().catch(() => {});
    api.dev.reset();
    setConfirm(false);
    setPeople(api.dev.personas());
    setCodes([]);
    navigate("/", { replace: true });
    toast.success("Everything is back to how it started.");
  };

  return (
    <div ref={ref} className={cx("fixed left-3 z-[60] sm:left-4", user ? "bottom-[5.25rem] md:bottom-4" : "bottom-4")}>
      {open ? (
        <div className="anim-pop mb-3 flex max-h-[min(72vh,34rem)] w-[min(92vw,21rem)] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-pop" role="dialog" aria-label="Quick access">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 pb-3 pt-4">
            <div>
              <h2 className="font-display text-lg font-medium leading-tight">Quick access</h2>
              <p className="text-xs text-muted">Everything you need to try the whole app. Password for all: <code className="rounded bg-surface-2 px-1 font-semibold text-fg">password123</code></p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close quick access" className="-mr-1 rounded-full p-1.5 text-muted transition hover:bg-accent-soft hover:text-fg">
              <Icon name="x" size={18} />
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto px-3 py-4">
            {user ? (
              <div className="flex items-center gap-3 rounded-2xl bg-accent-soft/60 px-3 py-2.5">
                <Avatar name={user.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{user.name}</div>
                  <div className="text-xs text-muted">Signed in · <span className="capitalize">{user.role}</span></div>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="text-xs font-semibold text-accent-ink hover:underline"
                >
                  Sign out
                </button>
              </div>
            ) : null}

            {GROUPS.map((g) => {
              const list = people.filter((p) => p.role === g.role);
              if (!list.length) return null;
              return (
                <section key={g.role}>
                  <div className="mb-1.5 flex items-baseline justify-between px-2">
                    <h3 className="text-[13px] font-bold">{g.title}</h3>
                    <span className="text-[11px] text-muted">{g.hint}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {list.map((p) => {
                      const current = user?._id === p._id;
                      return (
                        <li key={p._id}>
                          <button
                            onClick={() => signInAs(p)}
                            disabled={busy === p._id || p.status === "suspended"}
                            className={cx("flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-accent-soft disabled:opacity-50", current && "bg-accent-soft")}
                          >
                            <Avatar name={p.name} size={34} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5 text-sm font-semibold">
                                <span className="truncate">{p.name}</span>
                                {current ? <Icon name="check" size={14} className="shrink-0 text-accent-ink" /> : null}
                                {p.status === "suspended" ? <span className="rounded-full bg-danger-soft px-1.5 text-[10px] font-bold text-danger">Suspended</span> : null}
                              </span>
                              <span className="block truncate text-[11px] text-muted">{p.email}</span>
                              <span className="block text-[11px] text-muted">{NOTES[p.email] || "Sample account"}</span>
                            </span>
                            <Icon name="arrow-right" size={15} className="shrink-0 text-muted" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}

            <section>
              <div className="mb-1.5 px-2">
                <h3 className="text-[13px] font-bold">Codes</h3>
                <p className="text-[11px] text-muted">Codes that would normally arrive by email show up here. Try “Forgot your password?” or “Send me a code” in Settings.</p>
              </div>
              {codes.length ? (
                <ul className="space-y-1.5">
                  {codes.map((c) => (
                    <li key={`${c.type}${c.token}`} className="rounded-2xl border border-line px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{CODE_LABEL[c.type]}</span>
                        <span className="truncate text-[11px] text-muted">{c.email}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <code className="rounded-lg bg-surface-2 px-2 py-0.5 text-sm font-bold tracking-wider">{c.token}</code>
                        <span className="flex items-center gap-1">
                          <CopyButton value={c.token} />
                          <Link
                            to={`${c.type === "password_reset" ? "/reset-password" : "/verify-email"}?token=${c.token}`}
                            onClick={() => setOpen(false)}
                            className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent-ink hover:brightness-95"
                          >
                            Use it
                          </Link>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl bg-surface-2 px-3 py-2.5 text-xs text-muted">No codes yet.</p>
              )}
            </section>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
            <span className="text-[11px] text-muted">Changes are kept on this device.</span>
            <Button size="sm" variant="secondary" icon="refresh" onClick={() => setConfirm(true)}>Start over</Button>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close quick access" : "Open quick access"}
        className={cx(
          "flex h-12 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-bold shadow-pop transition hover:-translate-y-0.5 active:scale-95",
          open && "bg-accent-soft"
        )}
      >
        <Icon name="key" size={17} className="text-accent-ink" />
        <span className="hidden sm:inline">Quick access</span>
      </button>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={startOver} loading={busy === "reset"} title="Start over?" confirmLabel="Start over">
        Everything you added or changed will be cleared and the people and tasks will return to how they began. You will be signed out.
      </ConfirmDialog>
    </div>
  );
}
