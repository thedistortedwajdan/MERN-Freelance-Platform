import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Icon from "../components/ui/Icon";

const ToastContext = createContext(null);

const TONES = {
  success: { icon: "check-circle", cls: "text-success" },
  error: { icon: "alert", cls: "text-danger" },
  info: { icon: "info", cls: "text-info" },
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone, message) => {
      const id = ++idRef.current;
      setItems((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3800);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="anim-pop pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-pop"
          >
            <Icon name={TONES[t.tone].icon} size={18} className={`mt-0.5 shrink-0 ${TONES[t.tone].cls}`} />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-muted hover:text-fg" aria-label="Dismiss">
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}
