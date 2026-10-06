import Icon from "../ui/Icon";
import { Avatar, Bar, Card, Chip } from "../ui/primitives";
import { StarRating } from "../ui/forms";

const FREELANCER_LEVELS = [
  { min: 0, name: "Just getting started" },
  { min: 1, name: "Rising freelancer" },
  { min: 3, name: "Trusted" },
  { min: 5, name: "Top rated" },
  { min: 10, name: "Community favourite" },
];
const EMPLOYER_LEVELS = [
  { min: 0, name: "New to GigPilot" },
  { min: 1, name: "Active employer" },
  { min: 3, name: "Trusted employer" },
  { min: 8, name: "Community champion" },
];

function levelFor(role, completed) {
  const levels = role === "freelancer" ? FREELANCER_LEVELS : EMPLOYER_LEVELS;
  let idx = 0;
  levels.forEach((l, i) => {
    if (completed >= l.min) idx = i;
  });
  const cur = levels[idx];
  const next = levels[idx + 1];
  return {
    name: cur.name,
    next: next?.name,
    remaining: next ? next.min - completed : 0,
    percent: next ? Math.round(((completed - cur.min) / (next.min - cur.min)) * 100) : 100,
    index: idx,
    total: levels.length,
  };
}

export function GrowthCard({ role, completed }) {
  const lv = levelFor(role, completed);
  return (
    <Card className="bg-accent-soft/50">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface">
          <svg viewBox="0 0 80 80" width="52" height="52" aria-hidden="true">
            <path d="M40 66 L40 36" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
            <path d="M40 46 C27 46 21 38 21 29 C32 29 40 35 40 46Z" fill="var(--accent)" />
            {lv.index >= 1 ? <path d="M40 38 C51 38 59 31 59 20 C48 20 40 27 40 38Z" fill="var(--accent)" opacity="0.75" /> : null}
            {lv.index >= 2 ? <circle cx="40" cy="14" r="6" fill="var(--sun)" /> : null}
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-accent-ink">Your growth</div>
          <div className="font-display text-xl font-medium">{lv.name}</div>
          {lv.next ? <p className="text-sm text-muted">{lv.remaining} more completed {lv.remaining === 1 ? "task" : "tasks"} to reach <strong className="text-fg">{lv.next}</strong></p> : <p className="text-sm text-muted">You have reached the top. Thank you for lifting others up.</p>}
        </div>
      </div>
      <Bar value={lv.percent} className="mt-4" />
    </Card>
  );
}

export function ProfileHero({ user, avg, total, actions, role }) {
  return (
    <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <Avatar name={user.name} src={user.avatarUrl} size={88} className="!text-3xl" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl font-medium sm:text-4xl">{user.name}</h1>
          <Chip tone="accent" className="capitalize">{user.role}</Chip>
          {user.emailVerified === false && role === "self" ? <Chip tone="outline">Email not verified</Chip> : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
          {user.location ? <span className="inline-flex items-center gap-1.5"><Icon name="map-pin" size={15} />{user.location}</span> : null}
          {user.hourlyRate != null && user.role === "freelancer" ? <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={15} />${user.hourlyRate}/hour</span> : null}
          <span className="inline-flex items-center gap-2">
            {avg ? <><StarRating value={Math.round(Number(avg))} readOnly size={16} /><strong className="text-fg">{avg}</strong></> : <span>No reviews yet</span>}
            {total ? <span>({total})</span> : null}
          </span>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </Card>
  );
}

export function SkillsBlock({ skills }) {
  if (!skills?.length) return null;
  return (
    <Card>
      <h2 className="mb-3 font-display text-xl font-medium">Skills</h2>
      <div className="flex flex-wrap gap-2">{skills.map((s) => <Chip key={s} tone="accent" className="!px-3 !py-1 !text-sm">{s}</Chip>)}</div>
    </Card>
  );
}

export function PortfolioBlock({ items }) {
  if (!items?.length) return null;
  return (
    <Card>
      <h2 className="mb-3 font-display text-xl font-medium">Portfolio</h2>
      <ul className="space-y-3">
        {items.map((p, i) => (
          <li key={`${p.title}${i}`} className="rounded-2xl border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold">{p.title}</div>
                {p.description ? <p className="mt-0.5 text-sm text-muted">{p.description}</p> : null}
              </div>
              {p.url ? (
                <a href={p.url} target="_blank" rel="noreferrer noopener" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-accent-ink hover:underline">
                  View <Icon name="link" size={14} />
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
