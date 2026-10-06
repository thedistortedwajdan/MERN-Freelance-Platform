import { Link } from "react-router-dom";

export function SunMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="var(--fg)" />
      <circle cx="16" cy="18.5" r="7" fill="var(--sun)" />
      <path d="M4 23c4-1.5 7-3.5 12-3.5S24 21.500 28 23v5H4z" fill="var(--bg)" />
    </svg>
  );
}

export function Logo({ to = "/", className = "", light = false }) {
  return (
    <Link to={to} className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="GigPilot home">
      <SunMark />
      <span className={`font-display text-[22px] font-semibold tracking-tight ${light ? "text-[color:var(--hero-fg)]" : ""}`}>GigPilot</span>
    </Link>
  );
}

/** A sky that is always just about to get brighter. Content sits above the horizon. */
export function SunriseHero({ children, className = "", minHeight = "min-h-[340px]", sunX = 72 }) {
  return (
    <section className={`sky relative isolate overflow-hidden ${minHeight} ${className}`}>
      <svg className="stars absolute inset-0 -z-0 h-full w-full" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 60">
        {[[8, 10], [18, 22], [31, 8], [44, 18], [57, 6], [66, 20], [79, 9], [90, 16], [95, 5], [24, 34], [50, 30], [85, 32]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.28 : 0.18} fill="#fff" opacity={0.5 + (i % 4) * 0.12} />
        ))}
      </svg>
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 -z-0 h-[62%] min-h-[170px] w-full" viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <g className="anim-rise" style={{ transformOrigin: "50% 100%" }}>
          <circle className="anim-glow" cx={(sunX / 100) * 1440} cy="238" r="190" fill="var(--sun)" opacity="0.14" />
          <circle cx={(sunX / 100) * 1440} cy="238" r="130" fill="var(--sun)" opacity="0.2" />
          <circle cx={(sunX / 100) * 1440} cy="238" r="84" fill="var(--sun)" />
        </g>
        <path d="M0 260V176c120-22 220-6 330 10 120 18 214 38 340 22 130-16 214-52 350-44 150 8 260 40 420 24v112z" fill="var(--hill)" opacity="0.55" />
        <path d="M0 260v-52c110-18 190-34 300-26 140 10 226 34 380 24 160-10 250-38 400-30 140 8 250 24 360 12v72z" fill="var(--hill)" />
      </svg>
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function Container({ children, className = "", narrow = false }) {
  return <div className={`mx-auto w-full px-4 sm:px-6 ${narrow ? "max-w-3xl" : "max-w-6xl"} ${className}`}>{children}</div>;
}
