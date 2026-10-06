import { useId, useRef, useState } from "react";
import Icon from "./Icon";
import { Spinner, cx } from "./primitives";
import { fileSize } from "../../lib/format";
import api from "../../data/client";
import { useToast } from "../../context/ToastContext";

const FIELD =
  "w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-fg transition placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 disabled:opacity-60";

export function Field({ label, hint, error, optional, children, className = "", htmlFor }) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-sm font-semibold">
          <span>{label}</span>
          {optional ? <span className="text-xs font-normal text-muted">Optional</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-[13px] text-danger" role="alert">
          <Icon name="alert" size={13} />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ icon, className = "", invalid, ...rest }) {
  return (
    <div className="relative">
      {icon ? <Icon name={icon} size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /> : null}
      <input className={cx(FIELD, "h-11", icon && "pl-10", invalid && "border-danger", className)} {...rest} />
    </div>
  );
}

export function Textarea({ className = "", rows = 4, invalid, ...rest }) {
  return <textarea rows={rows} className={cx(FIELD, "resize-y py-3 leading-relaxed", invalid && "border-danger", className)} {...rest} />;
}

export function Select({ className = "", children, ...rest }) {
  return (
    <div className="relative">
      <select className={cx(FIELD, "h-11 appearance-none pr-10", className)} {...rest}>
        {children}
      </select>
      <Icon name="chevron-down" size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function SearchInput({ className = "", ...rest }) {
  return <Input icon="search" type="search" className={className} {...rest} />;
}

export function TagInput({ value = [], onChange, placeholder = "Type and press Enter", suggestions = [], max = 15, id }) {
  const [draft, setDraft] = useState("");
  const add = (raw) => {
    const t = raw.trim().replace(/,$/, "");
    if (!t) return;
    if (value.some((v) => v.toLowerCase() === t.toLowerCase()) || value.length >= max) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  };
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8);
  return (
    <div>
      <div className={cx(FIELD, "flex min-h-11 flex-wrap items-center gap-1.5 py-1.5 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/20")}>
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-3 pr-1.5 text-[13px] font-semibold text-accent-ink">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((v) => v !== t))} className="rounded-full p-0.5 hover:bg-accent/30">
              <Icon name="x" size={13} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-[15px] outline-none placeholder:text-muted/70"
        />
      </div>
      {remaining.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent-ink">
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StarRating({ value = 0, onChange, size = 20, readOnly = false, label = "Rating" }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="inline-flex items-center gap-0.5" role={readOnly ? "img" : "radiogroup"} aria-label={`${label}: ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          role={readOnly ? undefined : "radio"}
          aria-checked={!readOnly ? value === n : undefined}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange?.(n)}
          className={cx("rounded p-0.5 transition", !readOnly && "hover:scale-110", n <= shown ? "text-accent" : "text-line")}
        >
          <Icon name="star" size={size} fill={n <= shown ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

export function Segmented({ options, value, onChange, className = "", size = "md" }) {
  return (
    <div className={cx("inline-flex rounded-full border border-line bg-surface p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-full font-semibold transition",
            size === "sm" ? "px-3 py-1 text-[13px]" : "px-4 py-1.5 text-sm",
            value === o.value ? "bg-accent text-on-accent shadow-sm" : "text-muted hover:text-fg"
          )}
        >
          {o.icon ? <Icon name={o.icon} size={15} /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Checkbox({ checked, onChange, label }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="flex h-5 w-5 items-center justify-center rounded-md border border-line bg-surface text-on-accent transition peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-4 peer-focus-visible:ring-accent/30">
        {checked ? <Icon name="check" size={13} strokeWidth={3} /> : null}
      </span>
      {label}
    </label>
  );
}

/** Uploads files immediately and reports the uploaded file records through onChange. */
export function FileUploader({ files = [], onChange, max = 10, hint = "PDF, images, documents or ZIP, up to 10 MB each" }) {
  const toast = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(0);
  const [drag, setDrag] = useState(false);

  const upload = async (list) => {
    const incoming = Array.from(list).slice(0, Math.max(0, max - files.length));
    if (list.length > incoming.length) toast.info(`You can attach up to ${max} files.`);
    const added = [];
    for (const f of incoming) {
      setBusy((n) => n + 1);
      try {
        added.push(await api.files.upload(f));
      } catch (e) {
        toast.error(`${f.name}: ${e.message}`);
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (added.length) onChange([...files, ...added]);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(e.dataTransfer.files);
        }}
        className={cx("flex flex-col items-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition", drag ? "border-accent bg-accent-soft" : "border-line bg-surface-2/60")}
      >
        <Icon name="upload" size={22} className="text-accent-ink" />
        <p className="mt-2 text-sm font-semibold">
          Drag files here or{" "}
          <button type="button" className="text-accent-ink underline underline-offset-2" onClick={() => input.current?.click()}>
            browse
          </button>
        </p>
        <p className="text-xs text-muted">{hint}</p>
        <input ref={input} type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      </div>
      {files.length || busy ? (
        <ul className="mt-3 space-y-2">
          {files.map((f) => (
            <li key={f._id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
              <Icon name="file" size={18} className="text-muted" />
              <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
              <span className="text-xs text-muted">{fileSize(f.size)}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((x) => x._id !== f._id))} className="text-muted hover:text-danger">
                <Icon name="x" size={16} />
              </button>
            </li>
          ))}
          {busy ? (
            <li className="flex items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2 text-sm text-muted">
              <Spinner size={16} /> Uploading…
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function FileList({ files = [], className = "" }) {
  const toast = useToast();
  if (!files.length) return null;
  return (
    <ul className={cx("space-y-2", className)}>
      {files.map((f) => (
        <li key={f._id}>
          <button
            type="button"
            onClick={() => api.files.download(f._id).catch((e) => toast.error(e.message))}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm transition hover:border-accent"
          >
            <Icon name="file" size={18} className="text-accent-ink" />
            <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
            <span className="text-xs text-muted">{fileSize(f.size)}</span>
            <Icon name="download" size={16} className="text-muted" />
          </button>
        </li>
      ))}
    </ul>
  );
}
