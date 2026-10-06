import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { Button, Card, Chip, ErrorState, Skeleton } from "../components/ui/primitives";
import { Field, FileUploader, Input, Select, TagInput, Textarea } from "../components/ui/forms";
import { Container } from "../components/common/Brand";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { CATEGORIES, CITIES, SKILL_SUGGESTIONS } from "../lib/constants";
import { money } from "../lib/format";
import api from "../data/client";

const EMPTY = { title: "", description: "", price: "", category: "", location: "", skills: [], deadline: "", latitude: "", longitude: "" };

const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

function Preview({ f }) {
  return (
    <Card className="space-y-3">
      <div className="text-xs font-semibold text-muted">How people will see it</div>
      <div className="flex items-start justify-between">
        {f.category ? <Chip tone="accent">{f.category}</Chip> : <span className="h-5 w-16 rounded-full bg-surface-2" />}
      </div>
      <h3 className="font-display text-xl font-medium leading-snug">{f.title || "Your task title"}</h3>
      <div className="flex flex-wrap gap-x-4 text-[13px] text-muted">
        {f.location ? <span className="inline-flex items-center gap-1.5"><Icon name="map-pin" size={14} />{f.location}</span> : null}
        {f.deadline ? <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={14} />By {new Date(f.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span> : null}
      </div>
      {f.skills.length ? <div className="flex flex-wrap gap-1.5">{f.skills.slice(0, 4).map((s) => <span key={s} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">{s}</span>)}</div> : null}
      <div className="pt-1">
        <div className="text-xs text-muted">Budget</div>
        <div className="font-display text-2xl font-medium">{f.price ? money(f.price) : "$—"}</div>
      </div>
    </Card>
  );
}

export default function TaskForm() {
  const { id } = useParams();
  const editing = !!id;
  useDocumentTitle(editing ? "Edit task" : "Post a task");
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const existing = useAsync(() => (editing ? api.tasks.get(id) : Promise.resolve(null)), [id]);

  useEffect(() => {
    const t = existing.data;
    if (!t) return;
    setF({ title: t.title, description: t.description, price: t.price, category: t.category || "", location: t.location || "", skills: t.skills || [], deadline: toDateInput(t.deadline), latitude: t.latitude ?? "", longitude: t.longitude ?? "" });
    setFiles(t.attachments || []);
  }, [existing.data]);

  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const locate = () => {
    if (!navigator.geolocation) return toast.info("Your browser cannot share a location.");
    navigator.geolocation.getCurrentPosition(
      (p) => set({ latitude: Number(p.coords.latitude.toFixed(4)), longitude: Number(p.coords.longitude.toFixed(4)) }),
      () => toast.info("We could not get your location. Pick a city instead."),
      { timeout: 6000 }
    );
  };

  const validate = () => {
    const e = {};
    if (!f.title.trim()) e.title = "Give your task a clear title.";
    if (!f.description.trim()) e.description = "Describe what you need done.";
    if (f.price === "" || Number(f.price) < 0) e.price = "Enter a budget of zero or more.";
    if (f.deadline && f.deadline < new Date().toISOString().slice(0, 10)) e.deadline = "Pick a date in the future.";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const body = {
      ...f,
      price: Number(f.price),
      deadline: f.deadline ? new Date(`${f.deadline}T23:59:00`).toISOString() : null,
      latitude: f.latitude === "" ? null : Number(f.latitude),
      longitude: f.longitude === "" ? null : Number(f.longitude),
      attachmentIds: files.map((x) => x._id),
    };
    try {
      const saved = editing ? await api.tasks.update(id, body) : await api.tasks.create(body);
      toast.success(editing ? "Changes saved." : "Your task is live. People will start reaching out soon.");
      navigate(`/tasks/${saved._id}`, { replace: true });
    } catch (err) {
      setErrors({ form: err.message });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  if (editing && existing.loading) return <Container narrow className="py-10"><Skeleton className="h-[500px] rounded-[20px]" /></Container>;
  if (editing && existing.error) return <Container className="py-16"><ErrorState message={existing.error.message} /></Container>;
  if (editing && existing.data && (existing.data.employer?._id !== user._id || existing.data.status !== "open")) {
    return <Container className="py-16"><ErrorState message="Only open tasks you posted can be edited." /></Container>;
  }

  const city = CITIES.find((c) => c.lat === Number(f.latitude))?.label || (f.latitude !== "" ? "custom" : "");

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium sm:text-5xl">{editing ? "Edit your task" : "What do you need done?"}</h1>
        <p className="mt-2 text-muted">{editing ? "Update the details. Changes show up straight away." : "A clear, friendly description gets better proposals, faster."}</p>
      </div>
      <form onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {errors.form ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{errors.form}</div> : null}
          <Card className="space-y-5">
            <Field label="Title" htmlFor="title" error={errors.title}>
              <Input id="title" maxLength={200} placeholder="e.g. Repaint a two-bedroom apartment" value={f.title} onChange={(e) => set({ title: e.target.value })} invalid={!!errors.title} />
            </Field>
            <Field label="Description" htmlFor="desc" error={errors.description} hint="Include the size of the job, what you will provide, and when you would like it done.">
              <Textarea id="desc" rows={7} maxLength={5000} placeholder="Tell people what you need…" value={f.description} onChange={(e) => set({ description: e.target.value })} invalid={!!errors.description} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Category" htmlFor="cat" optional>
                <Select id="cat" value={f.category} onChange={(e) => set({ category: e.target.value })}>
                  <option value="">Choose a category</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Budget (USD)" htmlFor="price" error={errors.price}>
                <Input id="price" type="number" min="0" step="1" inputMode="numeric" placeholder="e.g. 150" value={f.price} onChange={(e) => set({ price: e.target.value })} invalid={!!errors.price} />
              </Field>
            </div>
            <Field label="Skills needed" hint="Press Enter after each one. People with these skills see a better match." optional>
              <TagInput value={f.skills} onChange={(skills) => set({ skills })} suggestions={SKILL_SUGGESTIONS} />
            </Field>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-display text-xl font-medium">When and where</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Place" htmlFor="loc" optional hint="A city, an area, or “Remote”.">
                <Input id="loc" icon="map-pin" placeholder="Karachi" value={f.location} onChange={(e) => set({ location: e.target.value })} />
              </Field>
              <Field label="Needed by" htmlFor="deadline" error={errors.deadline} optional hint="Open tasks expire after this date.">
                <Input id="deadline" type="date" min={tomorrow().slice(0, 10)} value={f.deadline} onChange={(e) => set({ deadline: e.target.value })} invalid={!!errors.deadline} />
              </Field>
            </div>
            <Field label="Map pin" hint="Lets people search for tasks near them." optional>
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-48 flex-1">
                  <Select
                    aria-label="Map pin"
                    value={city}
                    onChange={(e) => {
                      const c = CITIES.find((x) => x.label === e.target.value);
                      if (c) set({ latitude: c.lat, longitude: c.lng });
                      else set({ latitude: "", longitude: "" });
                    }}
                  >
                    <option value="">No pin</option>
                    {CITIES.map((c) => <option key={c.label}>{c.label}</option>)}
                    {city === "custom" ? <option value="custom">{f.latitude}, {f.longitude}</option> : null}
                  </Select>
                </div>
                <Button type="button" variant="secondary" icon="locate" onClick={locate}>Use my location</Button>
              </div>
            </Field>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-display text-xl font-medium">Files <span className="text-sm font-normal text-muted">(optional)</span></h2>
            <p className="text-sm text-muted">Photos, briefs or anything that helps people understand the job.</p>
            <FileUploader files={files} onChange={setFiles} />
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" size="lg" loading={busy} iconRight="arrow-right">{editing ? "Save changes" : "Publish task"}</Button>
          </div>
        </div>
        <div className="hidden lg:sticky lg:top-24 lg:block"><Preview f={f} /></div>
      </form>
    </Container>
  );
}
