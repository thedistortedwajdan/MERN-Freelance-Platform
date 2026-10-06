import { Link } from "react-router-dom";
import Icon from "./Icon";
import { initials } from "../../lib/format";

const cx = (...parts) => parts.filter(Boolean).join(" ");
// eslint-disable-next-line react-refresh/only-export-components
export { cx };

const BTN = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover font-semibold shadow-sm",
  secondary: "bg-surface text-fg border border-line hover:bg-surface-2 font-medium",
  soft: "bg-accent-soft text-accent-ink hover:brightness-95 font-semibold",
  ghost: "text-fg hover:bg-accent-soft/70 font-medium",
  danger: "bg-danger text-white hover:brightness-110 font-semibold",
  "danger-soft": "bg-danger-soft text-danger hover:brightness-95 font-semibold",
};
const BTN_SIZE = { sm: "h-8 px-3.5 text-[13px] gap-1.5", md: "h-10 px-5 text-sm gap-2", lg: "h-12 px-7 text-base gap-2.5" };

export function Button({ variant = "primary", size = "md", loading = false, icon, iconRight, as, to, href, className = "", children, disabled, ...rest }) {
  const cls = cx(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full transition duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    BTN[variant],
    BTN_SIZE[size],
    className
  );
  const inner = (
    <>
      {loading ? <Spinner size={size === "lg" ? 18 : 15} /> : icon ? <Icon name={icon} size={size === "sm" ? 15 : 17} /> : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} size={size === "sm" ? 15 : 17} /> : null}
    </>
  );
  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{inner}</a>;
  const Tag = as || "button";
  return (
    <Tag className={cls} disabled={disabled || loading} type={Tag === "button" ? rest.type || "button" : undefined} {...rest}>
      {inner}
    </Tag>
  );
}

export function IconButton({ icon, label, className = "", size = 36, active, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={cx(
        "relative inline-flex items-center justify-center rounded-full text-muted transition hover:bg-accent-soft hover:text-fg active:scale-95",
        active && "bg-accent-soft text-accent-ink",
        className
      )}
      {...rest}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

export function Card({ as, className = "", padded = true, hover = false, children, ...rest }) {
  const Tag = as || "div";
  return (
    <Tag
      className={cx(
        "rounded-[20px] border border-line bg-surface shadow-card",
        padded && "p-5",
        hover && "transition duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-pop",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const CHIP = {
  neutral: "bg-surface-2 text-muted",
  accent: "bg-accent-soft text-accent-ink",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
  warning: "bg-accent-soft text-accent-ink",
  outline: "border border-line text-muted bg-transparent",
};

export function Chip({ tone = "neutral", icon, className = "", children }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", CHIP[tone], className)}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

export function Avatar({ name = "", src, size = 36, className = "", ring = false }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
  return src ? (
    <img src={src} alt="" style={style} className={cx("shrink-0 rounded-full object-cover", ring && "ring-2 ring-surface", className)} />
  ) : (
    <span
      style={style}
      aria-hidden="true"
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent-ink", ring && "ring-2 ring-surface", className)}
    >
      {initials(name)}
    </span>
  );
}

export function Spinner({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cx("animate-spin", className)} fill="none" aria-label="Loading" role="status">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={cx("skeleton", className)} aria-hidden="true" />;
}

export function CardSkeleton({ rows = 3 }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-5 w-4/5" />
      {Array.from({ length: rows - 1 }).map((_, i) => (
        <Skeleton key={i} className="mt-2.5 h-4 w-3/5" />
      ))}
      <div className="mt-5 flex items-center justify-between">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </Card>
  );
}

export function EmptyState({ icon = "sparkles", title, children, action, className = "" }) {
  return (
    <div className={cx("flex flex-col items-center px-6 py-14 text-center", className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
        <Icon name={icon} size={26} />
      </div>
      <h3 className="font-display text-xl font-medium">{title}</h3>
      {children ? <p className="mt-1.5 max-w-sm text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <EmptyState icon="alert" title="We could not load this" action={onRetry ? <Button variant="secondary" icon="refresh" onClick={onRetry}>Try again</Button> : null}>
      {message}
    </EmptyState>
  );
}

export function ProgressRing({ value = 0, size = 40, stroke = 4, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${value}% match`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--accent-soft)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--accent)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * value) / 100}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-accent-ink">{label ?? `${value}%`}</span>
    </span>
  );
}

export function Bar({ value = 0, className = "" }) {
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-accent-soft", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Stat({ label, value, icon, hint, tone = "accent" }) {
  const tones = { accent: "bg-accent-soft text-accent-ink", success: "bg-success-soft text-success", info: "bg-info-soft text-info", violet: "bg-violet-soft text-violet", danger: "bg-danger-soft text-danger" };
  return (
    <Card className="flex items-center gap-3 !p-4 sm:gap-4 sm:!p-5">
      {icon ? (
        <span className={cx("hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl min-[420px]:flex", tones[tone])}>
          <Icon name={icon} size={20} />
        </span>
      ) : null}
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted">{label}</div>
        <div className="font-display text-2xl font-medium leading-tight">{value}</div>
        {hint ? <div className="text-xs text-muted">{hint}</div> : null}
      </div>
    </Card>
  );
}

export function Toggle({ checked, onChange, label, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-accent" : "bg-line")}
    >
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function SectionTitle({ title, hint, action, className = "" }) {
  return (
    <div className={cx("mb-4 flex items-end justify-between gap-3", className)}>
      <div>
        <h2 className="font-display text-xl font-medium sm:text-2xl">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, back }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back ? (
          <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-fg">
            <Icon name="arrow-left" size={15} />
            {back.label}
          </Link>
        ) : null}
        <h1 className="font-display text-3xl font-medium sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
