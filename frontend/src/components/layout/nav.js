export const NAV = {
  freelancer: [
    { to: "/find", label: "Find work", icon: "compass" },
    { to: "/my-tasks", label: "My work", icon: "briefcase" },
    { to: "/proposals", label: "Proposals", icon: "send" },
    { to: "/saved", label: "Saved", icon: "bookmark" },
    { to: "/messages", label: "Messages", icon: "message", badge: "messages" },
  ],
  employer: [
    { to: "/my-tasks", label: "My tasks", icon: "briefcase" },
    { to: "/find", label: "Browse", icon: "compass" },
    { to: "/messages", label: "Messages", icon: "message", badge: "messages" },
  ],
  admin: [
    { to: "/admin", label: "Overview", icon: "layout", end: true },
    { to: "/admin/users", label: "People", icon: "users" },
    { to: "/admin/tasks", label: "Tasks", icon: "briefcase" },
    { to: "/admin/disputes", label: "Disputes", icon: "gavel" },
    { to: "/admin/reports", label: "Reports", icon: "flag" },
    { to: "/admin/audit", label: "Activity", icon: "list" },
  ],
};

export const TABS = {
  freelancer: [
    { to: "/find", label: "Find", icon: "compass" },
    { to: "/my-tasks", label: "My work", icon: "briefcase" },
    { to: "/messages", label: "Chat", icon: "message", badge: "messages" },
    { to: "/notifications", label: "Alerts", icon: "bell", badge: "alerts" },
    { to: "/profile", label: "Me", icon: "user" },
  ],
  employer: [
    { to: "/my-tasks", label: "Tasks", icon: "briefcase" },
    { to: "/tasks/new", label: "Post", icon: "plus" },
    { to: "/messages", label: "Chat", icon: "message", badge: "messages" },
    { to: "/notifications", label: "Alerts", icon: "bell", badge: "alerts" },
    { to: "/profile", label: "Me", icon: "user" },
  ],
  admin: [
    { to: "/admin", label: "Overview", icon: "layout", end: true },
    { to: "/admin/users", label: "People", icon: "users" },
    { to: "/admin/tasks", label: "Tasks", icon: "briefcase" },
    { to: "/admin/disputes", label: "Disputes", icon: "gavel" },
    { to: "/admin/reports", label: "Reports", icon: "flag" },
  ],
};
