import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Suspense, useEffect } from "react";
import Icon from "../ui/Icon";
import { Avatar, Button, IconButton, Spinner, cx } from "../ui/primitives";
import { MenuItem, Popover } from "../ui/overlay";
import { Logo } from "../common/Brand";
import QuickAccess from "../common/QuickAccess";
import NotificationBell from "./NotificationBell";
import { NAV, TABS } from "./nav";
import { homePathFor, useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useLive } from "../../context/LiveContext";

export function ThemeToggle({ className = "" }) {
  const { resolved, toggle } = useTheme();
  return (
    <IconButton
      icon={resolved === "dark" ? "sun" : "moon"}
      label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className={className}
    />
  );
}

function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-accent">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function UserMenu() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <Popover width="w-60" trigger={({ toggle }) => (
      <button onClick={toggle} className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition hover:bg-accent-soft" aria-label="Account menu">
        <Avatar name={user.name} src={profile?.avatarUrl} size={34} />
        <Icon name="chevron-down" size={15} className="hidden text-muted sm:block" />
      </button>
    )}>
      {({ close }) => (
        <div className="p-2">
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar name={user.name} src={profile?.avatarUrl} size={40} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="text-xs capitalize text-muted">{user.role}</div>
            </div>
          </div>
          <div className="my-1 border-t border-line" />
          {user.role !== "admin" ? (
            <>
              <MenuItem icon="user" to="/profile" onClick={close}>Your profile</MenuItem>
              <MenuItem icon="gavel" to="/disputes" onClick={close}>Disputes</MenuItem>
            </>
          ) : null}
          <MenuItem icon="sliders" to="/settings" onClick={close}>Settings</MenuItem>
          <div className="my-1 border-t border-line" />
          <MenuItem icon="log-out" onClick={async () => { close(); await logout(); navigate("/"); }}>Sign out</MenuItem>
        </div>
      )}
    </Popover>
  );
}

function TopNav() {
  const { user } = useAuth();
  const live = useLive();
  const links = user ? NAV[user.role] : [];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo to={user ? homePathFor(user.role) : "/"} />
        {user ? (
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cx("flex items-center rounded-full px-3.5 py-2 text-sm font-semibold transition", isActive ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-accent-soft/60 hover:text-fg")
                }
              >
                {l.label}
                {l.badge === "messages" ? <Badge count={live.unreadMessages} /> : null}
              </NavLink>
            ))}
          </nav>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          {user?.role === "employer" ? (
            <span className="mr-1 hidden sm:inline-flex"><Button to="/tasks/new" size="sm" icon="plus">Post a task</Button></span>
          ) : null}
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <>
              <span className="hidden sm:inline-flex"><Button to="/login" variant="ghost" size="sm">Sign in</Button></span>
              <Button to="/register" size="sm">Get started</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function TabBar() {
  const { user } = useAuth();
  const live = useLive();
  if (!user) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Primary">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {TABS[user.role].map((t) => {
          const count = t.badge === "messages" ? live.unreadMessages : t.badge === "alerts" ? live.alerts : 0;
          return (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                end={t.end}
                className={({ isActive }) => cx("relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition", isActive ? "text-accent-ink" : "text-muted")}
              >
                {({ isActive }) => (
                  <>
                    <span className={cx("relative flex h-8 w-14 items-center justify-center rounded-full transition", isActive && "bg-accent-soft")}>
                      <Icon name={t.icon} size={21} strokeWidth={isActive ? 2.2 : 1.8} />
                      {count ? (
                        <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">{count > 9 ? "9+" : count}</span>
                      ) : null}
                    </span>
                    {t.label}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 hidden border-t border-line py-8 text-sm text-muted md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <span>© {new Date().getFullYear()} GigPilot. Every day is a chance to begin.</span>
        <span className="flex gap-5">
          <Link to="/settings" className="hover:text-fg">Settings</Link>
          <Link to="/" className="hover:text-fg">Home</Link>
        </span>
      </div>
    </footer>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function AppShell() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent">
        Skip to content
      </a>
      <ScrollToTop />
      <TopNav />
      <main id="main" className={cx("flex-1", user && "pb-24 md:pb-0")}>
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center text-muted">
              <Spinner size={26} />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <TabBar />
      <QuickAccess />
    </div>
  );
}
