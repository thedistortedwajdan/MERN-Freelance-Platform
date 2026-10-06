import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { Button, Card, EmptyState, Skeleton, Stat } from "../components/ui/primitives";
import { Field, Input, TagInput, Textarea } from "../components/ui/forms";
import { Container } from "../components/common/Brand";
import { GrowthCard, PortfolioBlock, ProfileHero, SkillsBlock } from "../components/profile/ProfileParts";
import { ReviewItem } from "../components/rating/Reviews";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync, useDocumentTitle } from "../lib/hooks";
import { SKILL_SUGGESTIONS } from "../lib/constants";
import api from "../data/client";

function Editor({ me, onDone }) {
  const toast = useToast();
  const { refreshProfile } = useAuth();
  const freelancer = me.role === "freelancer";
  const [f, setF] = useState({
    name: me.name || "",
    bio: me.bio || "",
    location: me.location || "",
    avatarUrl: me.avatarUrl || "",
    hourlyRate: me.hourlyRate ?? "",
    skills: me.skills || [],
    portfolio: (me.portfolio || []).map((p) => ({ ...p })),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const setItem = (i, patch) => set({ portfolio: f.portfolio.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { name: f.name, bio: f.bio, location: f.location, avatarUrl: f.avatarUrl };
      if (freelancer) Object.assign(body, { skills: f.skills, hourlyRate: f.hourlyRate === "" ? null : Number(f.hourlyRate), portfolio: f.portfolio.filter((p) => p.title.trim() || p.url.trim()) });
      await api.users.updateMe(body);
      await refreshProfile();
      toast.success("Profile updated.");
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div> : null}
      <Card className="space-y-5">
        <h2 className="font-display text-xl font-medium">About you</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="pf-name"><Input id="pf-name" required value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={100} /></Field>
          <Field label="Based in" htmlFor="pf-loc" optional><Input id="pf-loc" icon="map-pin" placeholder="Karachi" value={f.location} onChange={(e) => set({ location: e.target.value })} /></Field>
        </div>
        <Field label="Bio" htmlFor="pf-bio" hint="A couple of friendly sentences is plenty." optional>
          <Textarea id="pf-bio" rows={4} maxLength={1000} value={f.bio} onChange={(e) => set({ bio: e.target.value })} />
        </Field>
        <Field label="Photo link" htmlFor="pf-avatar" hint="A link to an image that starts with https://" optional>
          <Input id="pf-avatar" icon="link" placeholder="https://…" value={f.avatarUrl} onChange={(e) => set({ avatarUrl: e.target.value })} />
        </Field>
      </Card>

      {freelancer ? (
        <>
          <Card className="space-y-5">
            <h2 className="font-display text-xl font-medium">What you do</h2>
            <Field label="Skills" hint="These power your match score on tasks.">
              <TagInput value={f.skills} onChange={(skills) => set({ skills })} suggestions={SKILL_SUGGESTIONS} max={30} />
            </Field>
            <Field label="Hourly rate (USD)" htmlFor="pf-rate" optional>
              <Input id="pf-rate" type="number" min="0" step="1" inputMode="numeric" value={f.hourlyRate} onChange={(e) => set({ hourlyRate: e.target.value })} className="max-w-40" />
            </Field>
          </Card>
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-medium">Portfolio</h2>
              <Button type="button" size="sm" variant="secondary" icon="plus" onClick={() => set({ portfolio: [...f.portfolio, { title: "", url: "", description: "" }] })} disabled={f.portfolio.length >= 20}>Add item</Button>
            </div>
            {f.portfolio.length === 0 ? <p className="text-sm text-muted">Show off work you are proud of. Links to photos, sites or documents all work.</p> : null}
            {f.portfolio.map((p, i) => (
              <div key={i} className="space-y-3 rounded-2xl border border-line p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input aria-label="Title" placeholder="Title" value={p.title} maxLength={100} onChange={(e) => setItem(i, { title: e.target.value })} />
                  <Input aria-label="Link" placeholder="https://…" value={p.url} onChange={(e) => setItem(i, { url: e.target.value })} />
                </div>
                <Textarea rows={2} aria-label="Description" placeholder="What was it?" value={p.description} maxLength={500} onChange={(e) => setItem(i, { description: e.target.value })} />
                <button type="button" onClick={() => set({ portfolio: f.portfolio.filter((_, idx) => idx !== i) })} className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-danger"><Icon name="trash" size={14} /> Remove</button>
              </div>
            ))}
          </Card>
        </>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="lg" loading={busy}>Save profile</Button>
      </div>
    </form>
  );
}

export default function Profile() {
  useDocumentTitle("Your profile");
  const { user, profile } = useAuth();
  const [editing, setEditing] = useState(false);
  const me = useAsync(() => api.users.me(), [profile?.updatedAt]);
  const reviews = useAsync(() => api.ratings.forUser(user._id), [user._id]);

  useEffect(() => {
    if (editing) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [editing]);

  if (me.loading && !me.data) return <Container className="space-y-5 py-10"><Skeleton className="h-40 rounded-[20px]" /><Skeleton className="h-64 rounded-[20px]" /></Container>;
  if (!me.data) return null;
  const { user: u, stats } = me.data;

  return (
    <Container className="space-y-6 py-8 sm:py-12">
      {u.emailVerified === false ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-soft px-5 py-3.5 text-sm">
          <span className="flex items-center gap-2 font-semibold text-accent-ink"><Icon name="mail" size={17} /> Confirm your email so people can trust who you are.</span>
          <Button size="sm" variant="secondary" to="/settings">Confirm now</Button>
        </div>
      ) : null}

      <ProfileHero
        user={u}
        role="self"
        avg={stats.avgRating}
        total={stats.totalRatings}
        actions={!editing ? <><Button variant="secondary" icon="edit" onClick={() => setEditing(true)}>Edit profile</Button><Button variant="ghost" to={`/users/${u._id}`}>Public view</Button></> : null}
      />

      {editing ? (
        <Editor me={u} onDone={() => { setEditing(false); me.reload(true); }} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card>
              <h2 className="mb-2 font-display text-xl font-medium">About</h2>
              {u.bio ? <p className="whitespace-pre-line leading-relaxed">{u.bio}</p> : <p className="text-sm text-muted">Add a short bio so people know who you are. <button onClick={() => setEditing(true)} className="font-semibold text-accent-ink hover:underline">Write one</button></p>}
            </Card>
            <SkillsBlock skills={u.skills} />
            <PortfolioBlock items={u.portfolio} />
            <Card>
              <h2 className="mb-4 font-display text-xl font-medium">Reviews <span className="text-base text-muted">({reviews.data?.length ?? 0})</span></h2>
              {reviews.data?.length ? (
                <div className="space-y-3">{reviews.data.map((r) => <ReviewItem key={r._id} r={r} viewer={user} onChanged={() => { reviews.reload(true); me.reload(true); }} />)}</div>
              ) : (
                <EmptyState icon="star" title="Your first review is coming" className="!py-8">Complete a task and ask for feedback. Every review builds your name.</EmptyState>
              )}
            </Card>
          </div>
          <aside className="space-y-4 lg:sticky lg:top-24">
            <GrowthCard role={u.role} completed={stats.completedTasks} />
            <div className="grid grid-cols-2 gap-3">
              <Stat icon="briefcase" label={u.role === "employer" ? "Tasks posted" : "Tasks taken"} value={stats.totalTasks} tone="info" />
              <Stat icon="check-circle" label="Completed" value={stats.completedTasks} tone="success" />
            </div>
            <Card className="text-sm">
              <div className="flex items-center justify-between"><span className="text-muted">Email</span><span className="font-medium">{u.email}</span></div>
              <div className="mt-2 flex items-center justify-between"><span className="text-muted">Member since</span><span className="font-medium">{new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span></div>
              <Link to="/settings" className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 font-semibold transition hover:bg-accent-soft"><span><Icon name="sliders" size={15} className="mr-2 inline" />Settings and security</span><Icon name="chevron-right" size={16} /></Link>
            </Card>
          </aside>
        </div>
      )}
    </Container>
  );
}
