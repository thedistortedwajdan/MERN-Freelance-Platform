import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { Button, cx } from "./primitives";
import { useClickOutside } from "../../lib/hooks";

export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[#0b1230]/55" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className={cx("anim-pop relative flex max-h-[92vh] w-full flex-col rounded-t-[28px] bg-surface shadow-pop outline-none sm:rounded-[28px]", widths[size])}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
          <div>
            <h2 className="font-display text-2xl font-medium">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-2 rounded-full p-2 text-muted transition hover:bg-accent-soft hover:text-fg">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-3">{children}</div>
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div> : <div className="h-3" />}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = "Confirm", tone = "primary", loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Not now</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="text-sm text-muted">{children}</div>
    </Modal>
  );
}

export function Popover({ trigger, children, align = "right", width = "w-72", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), close: () => setOpen(false) })}
      {open ? (
        <div className={cx("anim-pop absolute z-50 mt-2 rounded-2xl border border-line bg-surface shadow-pop", align === "right" ? "right-0" : "left-0", width, className)}>
          {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({ icon, children, danger, onClick, to, ...rest }) {
  const cls = cx(
    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition",
    danger ? "text-danger hover:bg-danger-soft" : "hover:bg-accent-soft"
  );
  const inner = (
    <>
      {icon ? <Icon name={icon} size={17} className={danger ? "" : "text-muted"} /> : null}
      {children}
    </>
  );
  if (to) {
    return (
      <Link to={to} onClick={onClick} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} {...rest}>
      {inner}
    </button>
  );
}

export function Tabs({ tabs, value, onChange, className = "" }) {
  return (
    <div className={cx("no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1", className)} role="tablist">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cx(
              "relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition",
              active ? "text-fg" : "text-muted hover:text-fg"
            )}
          >
            {t.label}
            {t.count != null ? (
              <span className={cx("rounded-full px-2 text-xs", active ? "bg-accent text-on-accent" : "bg-surface-2 text-muted")}>{t.count}</span>
            ) : null}
            {active ? <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, pages, onChange, total, size }) {
  if (pages <= 1) return null;
  const nums = [];
  for (let i = 0; i < pages; i++) {
    if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  const from = page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  return (
    <nav className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Pagination">
      <p className="text-sm text-muted">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)} icon="chevron-left">
          Prev
        </Button>
        {nums.map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-1 text-muted">…</span>
          ) : (
            <button
              key={n}
              onClick={() => onChange(n)}
              aria-current={n === page ? "page" : undefined}
              className={cx("h-8 min-w-8 rounded-full px-2 text-[13px] font-semibold transition", n === page ? "bg-accent text-on-accent" : "text-muted hover:bg-accent-soft hover:text-fg")}
            >
              {n + 1}
            </button>
          )
        )}
        <Button variant="secondary" size="sm" disabled={page >= pages - 1} onClick={() => onChange(page + 1)} iconRight="chevron-right">
          Next
        </Button>
      </div>
    </nav>
  );
}

/** Horizontal progress path: steps = [{ label, state: 'done' | 'current' | 'todo' }] */
export function Stepper({ steps, className = "" }) {
  return (
    <ol className={cx("flex items-start", className)}>
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex flex-1 flex-col items-center text-center">
          {i > 0 ? (
            <span className={cx("absolute right-1/2 top-[13px] h-0.5 w-full", s.state === "todo" ? "bg-line" : "bg-accent")} aria-hidden="true" />
          ) : null}
          <span
            className={cx(
              "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition",
              s.state === "done" && "border-accent bg-accent text-on-accent",
              s.state === "current" && "border-accent bg-surface text-accent-ink ring-4 ring-accent/25",
              s.state === "todo" && "border-line bg-surface text-muted"
            )}
          >
            {s.state === "done" ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}
          </span>
          <span className={cx("mt-2 text-xs font-semibold", s.state === "todo" ? "text-muted" : "text-fg")}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
