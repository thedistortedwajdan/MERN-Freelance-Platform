import { NavLink } from "react-router-dom";
import { Container } from "../../components/common/Brand";
import { cx } from "../../components/ui/primitives";
import { NAV } from "../../components/layout/nav";

export function AdminPage({ title, subtitle, children, action }) {
  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium sm:text-5xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <nav className="no-scrollbar -mx-1 mb-8 flex gap-1 overflow-x-auto px-1" aria-label="Admin sections">
        {NAV.admin.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              cx("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition", isActive ? "bg-accent text-on-accent" : "bg-surface text-muted border border-line hover:text-fg")
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </Container>
  );
}
