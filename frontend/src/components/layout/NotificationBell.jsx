import { Link } from "react-router-dom";
import Icon from "../ui/Icon";
import { Popover } from "../ui/overlay";
import { IconButton, Spinner } from "../ui/primitives";
import NotificationItem from "../common/NotificationItem";
import { useAuth } from "../../context/AuthContext";
import { useLive } from "../../context/LiveContext";
import { useAsync } from "../../lib/hooks";
import api from "../../data/client";

function Panel({ close }) {
  const { user } = useAuth();
  const { refresh } = useLive();
  const { data, loading, reload } = useAsync(() => api.notifications.list({ size: 6 }), []);

  const markAll = async () => {
    await api.notifications.markAllRead();
    await Promise.all([reload(true), refresh()]);
  };
  const open = async (n) => {
    if (!n.read) await api.notifications.markRead(n._id).catch(() => {});
    refresh();
    close();
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <h3 className="font-display text-lg font-medium">Notifications</h3>
        <button onClick={markAll} className="text-xs font-semibold text-accent-ink hover:underline">Mark all as read</button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {loading && !data ? (
          <div className="flex justify-center py-10 text-muted"><Spinner /></div>
        ) : data?.data.length ? (
          data.data.map((n) => <NotificationItem key={n._id} n={n} role={user.role} onOpen={open} compact />)
        ) : (
          <div className="px-4 py-10 text-center text-sm text-muted">You are all caught up. Good things are on the way.</div>
        )}
      </div>
      <Link to="/notifications" onClick={close} className="flex items-center justify-center gap-1.5 border-t border-line py-3 text-sm font-semibold text-accent-ink hover:bg-accent-soft/50">
        See all notifications <Icon name="arrow-right" size={15} />
      </Link>
    </div>
  );
}

export default function NotificationBell() {
  const { alerts } = useLive();
  return (
    <Popover width="w-[min(92vw,24rem)]" trigger={({ toggle, open }) => (
      <div className="relative">
        <IconButton icon="bell" label="Notifications" onClick={toggle} active={open} />
        {alerts > 0 ? (
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-accent ring-2 ring-bg">
            {alerts > 9 ? "9+" : alerts}
          </span>
        ) : null}
      </div>
    )}>
      {({ close }) => <Panel close={close} />}
    </Popover>
  );
}
