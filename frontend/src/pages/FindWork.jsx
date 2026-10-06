import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { Button, CardSkeleton, Chip, EmptyState, ErrorState, cx } from "../components/ui/primitives";
import { Field, Input, Select, TagInput } from "../components/ui/forms";
import { Modal, Pagination } from "../components/ui/overlay";
import { Container, SunriseHero } from "../components/common/Brand";
import { TaskCard } from "../components/task/TaskBits";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync, useDebounced, useDocumentTitle } from "../lib/hooks";
import { CATEGORIES, CITIES, SKILL_SUGGESTIONS, SORTS } from "../lib/constants";
import { greeting, plural } from "../lib/format";
import api from "../data/client";

const PAGE_SIZE = 9;
const EMPTY = { q: "", location: "", category: "", skills: [], minPrice: "", maxPrice: "", lat: "", lng: "", radiusKm: 25, sort: "newest" };

function Filters({ f, set, onUseLocation, locating }) {
  const nearCity = CITIES.find((c) => String(c.lat) === String(f.lat))?.label || (f.lat ? "mine" : "");
  return (
    <div className="space-y-6">
      <Field label="Category">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => set({ category: "" })} className={cx("rounded-full border px-3 py-1 text-[13px] font-semibold transition", !f.category ? "border-accent bg-accent text-on-accent" : "border-line text-muted hover:border-accent")}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => set({ category: f.category === c ? "" : c })} className={cx("rounded-full border px-3 py-1 text-[13px] font-semibold transition", f.category === c ? "border-accent bg-accent text-on-accent" : "border-line text-muted hover:border-accent")}>
              {c}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Budget">
        <div className="flex items-center gap-2">
          <Input type="number" min="0" inputMode="numeric" placeholder="Min" value={f.minPrice} onChange={(e) => set({ minPrice: e.target.value })} aria-label="Minimum budget" />
          <span className="text-muted">–</span>
          <Input type="number" min="0" inputMode="numeric" placeholder="Max" value={f.maxPrice} onChange={(e) => set({ maxPrice: e.target.value })} aria-label="Maximum budget" />
        </div>
      </Field>
      <Field label="Skills" hint="Show tasks that need any of these.">
        <TagInput value={f.skills} onChange={(skills) => set({ skills })} suggestions={SKILL_SUGGESTIONS} placeholder="Add a skill" />
      </Field>
      <Field label="Place">
        <Input icon="map-pin" placeholder="City or “Remote”" value={f.location} onChange={(e) => set({ location: e.target.value })} />
      </Field>
      <Field label="Near" hint={f.lat ? `Within ${f.radiusKm} km` : "Find tasks within a distance."}>
        <Select
          value={nearCity}
          onChange={(e) => {
            const city = CITIES.find((c) => c.label === e.target.value);
            if (e.target.value === "mine") onUseLocation();
            else if (city) set({ lat: city.lat, lng: city.lng });
            else set({ lat: "", lng: "" });
          }}
          aria-label="Search near"
        >
          <option value="">Anywhere</option>
          {CITIES.map((c) => <option key={c.label} value={c.label}>{c.label}</option>)}
          <option value="mine">{locating ? "Finding you…" : "My location"}</option>
        </Select>
        {f.lat ? (
          <input type="range" min="5" max="100" step="5" value={f.radiusKm} onChange={(e) => set({ radiusKm: Number(e.target.value) })} className="mt-3 w-full accent-[var(--accent)]" aria-label="Distance in kilometres" />
        ) : null}
      </Field>
    </div>
  );
}

export default function FindWork() {
  useDocumentTitle("Find work");
  const { user, profile } = useAuth();
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [page, setPage] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [locating, setLocating] = useState(false);
  const debounced = useDebounced(f, 350);
  const location = useLocation();

  const set = (patch) => {
    setF((prev) => ({ ...prev, ...patch }));
    setPage(0);
  };

  const { data, loading, error, reload } = useAsync(
    () => api.tasks.search({ ...debounced, skills: debounced.skills, size: PAGE_SIZE, page }),
    [debounced, page]
  );
  const saved = useAsync(() => (user.role === "freelancer" ? api.savedSearches.list() : Promise.resolve([])), [user.role]);

  useEffect(() => {
    const s = location.state?.savedSearch;
    if (!s) return;
    const x = s.filters;
    setF({ ...EMPTY, q: x.q || "", location: x.location || "", category: x.category || "", skills: x.skills || [], minPrice: x.minPrice ?? "", maxPrice: x.maxPrice ?? "", lat: x.latitude ?? "", lng: x.longitude ?? "", radiusKm: x.radiusKm || 25 });
    window.history.replaceState({}, "");
  }, [location.state]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.info("Your browser cannot share a location.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({ lat: Number(pos.coords.latitude.toFixed(4)), lng: Number(pos.coords.longitude.toFixed(4)) });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.info("We could not get your location. Pick a city instead.");
      },
      { timeout: 6000 }
    );
  };

  const active = useMemo(() => {
    const chips = [];
    if (f.category) chips.push({ label: f.category, clear: () => set({ category: "" }) });
    if (f.location) chips.push({ label: f.location, clear: () => set({ location: "" }) });
    f.skills.forEach((s) => chips.push({ label: s, clear: () => set({ skills: f.skills.filter((x) => x !== s) }) }));
    if (f.minPrice || f.maxPrice) chips.push({ label: `$${f.minPrice || 0}–${f.maxPrice || "any"}`, clear: () => set({ minPrice: "", maxPrice: "" }) });
    if (f.lat) chips.push({ label: `Within ${f.radiusKm} km`, clear: () => set({ lat: "", lng: "" }) });
    return chips;
  }, [f]);

  const applySaved = (s) => {
    const x = s.filters;
    setF({ ...EMPTY, q: x.q || "", location: x.location || "", category: x.category || "", skills: x.skills || [], minPrice: x.minPrice ?? "", maxPrice: x.maxPrice ?? "", lat: x.latitude ?? "", lng: x.longitude ?? "", radiusKm: x.radiusKm || 25 });
    setPage(0);
    toast.info(`Showing “${s.name}”.`);
  };

  const saveSearch = async () => {
    setSaving(true);
    try {
      await api.savedSearches.create({ name: saveName, q: f.q, location: f.location, category: f.category, skills: f.skills, minPrice: f.minPrice, maxPrice: f.maxPrice, lat: f.lat || null, lng: f.lng || null, radiusKm: f.lat ? f.radiusKm : null });
      toast.success("Search saved. Find it under Saved.");
      setSheet(false);
      setSaveName("");
      saved.reload(true);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const total = data?.total ?? 0;

  return (
    <>
      <SunriseHero minHeight="min-h-[250px]" sunX={78}>
        <Container className="pb-24 pt-9 sm:pt-12">
          <h1 className="font-display max-w-xl text-3xl font-medium leading-tight text-[color:var(--hero-fg)] sm:text-5xl">
            {greeting(user.name)}.
            <br className="hidden sm:block" /> Your next opportunity is already waiting.
          </h1>
        </Container>
      </SunriseHero>

      <Container className="relative z-10 -mt-9 pb-10">
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-5 shadow-pop">
          <Icon name="search" size={19} className="shrink-0 text-muted" />
          <input
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search tasks, skills or places"
            aria-label="Search tasks"
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted/70"
          />
          <Button variant="soft" className="lg:hidden" icon="sliders" onClick={() => setSheet("filters")} aria-label="Filters">
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[270px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-[20px] border border-line bg-surface p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-medium">Filters</h2>
                {active.length ? <button onClick={() => { setF({ ...EMPTY, q: f.q, sort: f.sort }); setPage(0); }} className="text-xs font-semibold text-accent-ink hover:underline">Clear all</button> : null}
              </div>
              <Filters f={f} set={set} onUseLocation={useMyLocation} locating={locating} />
            </div>
          </aside>

          <section aria-live="polite">
            {saved.data?.length ? (
              <div className="no-scrollbar -mx-4 mb-5 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <span className="shrink-0 text-xs font-semibold text-muted">Your searches</span>
                {saved.data.map((s) => (
                  <button key={s._id} onClick={() => applySaved(s)} className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-[13px] font-semibold transition hover:border-accent">
                    <Icon name="bookmark" size={13} className="mr-1 inline text-accent-ink" />{s.name}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {loading && !data ? "Looking for opportunities…" : <><strong className="text-fg">{plural(total, "task")}</strong> waiting for the right person</>}
              </p>
              <div className="flex items-center gap-2">
                {user.role === "freelancer" && (active.length || f.q) ? (
                  <Button size="sm" variant="secondary" icon="bookmark" onClick={() => setSheet("save")}>Save search</Button>
                ) : null}
                <div className="w-44">
                  <Select value={f.sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort tasks" className="!h-9 !text-sm">
                    {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </div>
              </div>
            </div>

            {active.length ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {active.map((c) => (
                  <button key={c.label} onClick={c.clear} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-3 pr-2 text-[13px] font-semibold text-accent-ink">
                    {c.label}<Icon name="x" size={13} />
                  </button>
                ))}
              </div>
            ) : null}

            {error ? (
              <ErrorState message={error.message} onRetry={reload} />
            ) : loading && !data ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}</div>
            ) : data.data.length ? (
              <>
                <div className={cx("grid gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3", loading && "opacity-60")}>
                  {data.data.map((t, i) => (
                    <div key={t._id} className="anim-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                      <TaskCard task={t} showMatch={!!profile?.skills?.length} />
                    </div>
                  ))}
                </div>
                <Pagination page={page} pages={data.pages} total={total} size={PAGE_SIZE} onChange={(p) => { setPage(p); window.scrollTo({ top: 220, behavior: "smooth" }); }} />
              </>
            ) : (
              <EmptyState icon="compass" title="Nothing here just yet" action={active.length || f.q ? <Button variant="secondary" onClick={() => { setF(EMPTY); setPage(0); }}>Clear filters</Button> : null}>
                New tasks are posted every day. Try widening your search, or check back soon.
              </EmptyState>
            )}
          </section>
        </div>
      </Container>

      <Modal open={sheet === "filters"} onClose={() => setSheet(false)} title="Filters" footer={<Button onClick={() => setSheet(false)}>Show {plural(total, "task")}</Button>}>
        <Filters f={f} set={set} onUseLocation={useMyLocation} locating={locating} />
      </Modal>
      <Modal
        open={sheet === "save"}
        onClose={() => setSheet(false)}
        title="Save this search"
        subtitle="We will keep these filters ready for you."
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setSheet(false)}>Cancel</Button><Button loading={saving} disabled={!saveName.trim()} onClick={saveSearch}>Save search</Button></>}
      >
        <Field label="Name" htmlFor="ss-name">
          <Input id="ss-name" autoFocus placeholder="e.g. Painting in Karachi" value={saveName} onChange={(e) => setSaveName(e.target.value)} maxLength={80} />
        </Field>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {active.map((c) => <Chip key={c.label} tone="accent">{c.label}</Chip>)}
          {f.q ? <Chip tone="neutral">“{f.q}”</Chip> : null}
        </div>
      </Modal>
    </>
  );
}
