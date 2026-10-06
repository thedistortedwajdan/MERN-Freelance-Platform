import { useCallback, useEffect, useRef, useState } from "react";

/** Runs an async loader and tracks loading / error / data. Re-runs when deps change; reload() refreshes. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const ticketRef = useRef(0);
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback((silent = false) => {
    const ticket = ++ticketRef.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    return loaderRef
      .current()
      .then((data) => {
        if (ticket === ticketRef.current) setState({ data, loading: false, error: null });
        return data;
      })
      .catch((error) => {
        if (ticket === ticketRef.current) setState((s) => ({ data: silent ? s.data : null, loading: false, error }));
      });
  }, []);

  useEffect(() => {
    run();
    const current = ticketRef;
    return () => {
      current.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  const setData = useCallback((data) => setState((s) => ({ ...s, data })), []);
  return { ...state, reload: run, setData };
}

/** Calls fn every `ms` while the tab is visible and `enabled` is true. */
export function usePolling(fn, ms, enabled = true) {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  });
  useEffect(() => {
    if (!enabled) return undefined;
    let busy = false;
    const tick = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        await saved.current();
      } catch {
        // transient failure (offline, session switched): the next tick simply tries again
      } finally {
        busy = false;
      }
    };
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function useClickOutside(ref, handler, active = true) {
  const saved = useRef(handler);
  useEffect(() => {
    saved.current = handler;
  });
  useEffect(() => {
    if (!active) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) saved.current(e);
    };
    const onKey = (e) => e.key === "Escape" && saved.current(e);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, active]);
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · GigPilot` : "GigPilot";
  }, [title]);
}
