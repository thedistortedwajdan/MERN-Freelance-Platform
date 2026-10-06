import { Navigate } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { Button, Card, Chip, ProgressRing } from "../components/ui/primitives";
import { Container, SunriseHero } from "../components/common/Brand";
import { homePathFor, useAuth } from "../context/AuthContext";
import { useDocumentTitle } from "../lib/hooks";

const STEPS = [
  { icon: "compass", title: "Find a good fit", text: "Browse tasks near you or from anywhere, filtered by the skills you actually have." },
  { icon: "send", title: "Send a proposal", text: "Name your price and say hello. Employers pick the person, not just the lowest bid." },
  { icon: "briefcase", title: "Do the work", text: "Chat in one place, share files, and hand your work in when it is ready." },
  { icon: "star", title: "Build your name", text: "Every finished task earns a review. Your reputation grows with you." },
];

const VALUES = [
  { icon: "sprout", title: "Grow at your own pace", text: "Start with small tasks, collect reviews, and watch your profile grow into something clients trust." },
  { icon: "shield", title: "Safe by design", text: "Block, report or raise a dispute at any time. A real person looks at every report." },
  { icon: "heart", title: "People first", text: "Fair bidding, clear messages and honest feedback, so good work gets noticed." },
];

const SAMPLES = [
  { title: "Repaint a two-bedroom apartment", place: "Karachi", price: "$420", tag: "Painting", match: 94 },
  { title: "Logo and brand sheet for a bakery", place: "Remote", price: "$250", tag: "Design", match: 88 },
  { title: "Fix a leaking kitchen tap", place: "Lahore", price: "$60", tag: "Plumbing", match: 81 },
];

export default function Home() {
  const { user } = useAuth();
  useDocumentTitle("");
  if (user) return <Navigate to={homePathFor(user.role)} replace />;

  return (
    <>
      <SunriseHero minHeight="min-h-[520px] sm:min-h-[600px]" sunX={74}>
        <Container className="pb-40 pt-14 sm:pb-52 sm:pt-24">
          <Chip tone="outline" className="!border-[color:var(--hero-fg)]/30 !text-[color:var(--hero-fg)]">
            <Icon name="sparkles" size={12} /> Local work, real people
          </Chip>
          <h1 className="font-display mt-5 max-w-2xl text-[40px] font-medium leading-[1.08] text-[color:var(--hero-fg)] sm:text-6xl">
            Your next opportunity is already waiting.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[color:var(--hero-fg)] opacity-85">
            GigPilot connects people who need things done with people ready to do them. Painting, plumbing, design, writing. Start today, on your terms.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/register?role=freelancer" size="lg" iconRight="arrow-right">Find work</Button>
            <Button to="/register?role=employer" size="lg" variant="secondary">Post a task</Button>
          </div>
        </Container>
      </SunriseHero>

      <Container className="-mt-24 sm:-mt-28 relative z-10">
        <div className="grid gap-4 md:grid-cols-3">
          {SAMPLES.map((s, i) => (
            <Card key={s.title} className="anim-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="flex items-start justify-between">
                <Chip tone="accent">{s.tag}</Chip>
                <ProgressRing value={s.match} />
              </div>
              <h3 className="mt-3 font-display text-xl font-medium">{s.title}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Icon name="map-pin" size={14} />{s.place}</p>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <div className="text-xs text-muted">Budget</div>
                  <div className="font-display text-2xl font-medium">{s.price}</div>
                </div>
                <span className="text-sm font-semibold text-accent-ink">{s.match}% match</span>
              </div>
            </Card>
          ))}
        </div>
      </Container>

      <Container className="py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-medium sm:text-4xl">From “maybe” to “hired” in four steps</h2>
          <p className="mt-3 text-muted">No gatekeepers, no fees to start. Just a clear path from where you are to where you want to be.</p>
        </div>
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink"><Icon name={s.icon} size={22} /></span>
                <span className="font-display text-sm font-medium text-muted">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Container>

      <section className="bg-surface-2/70 py-20">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="font-display text-3xl font-medium sm:text-4xl">A place that wants you to grow</h2>
              <p className="mt-4 max-w-md text-muted">
                Everyone starts somewhere. GigPilot shows how far you have come, celebrates each finished task, and always points to your next step.
              </p>
              <Button to="/register" className="mt-7" iconRight="arrow-right">Begin today</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {VALUES.map((v) => (
                <Card key={v.title} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink"><Icon name={v.icon} size={21} /></span>
                  <div>
                    <h3 className="font-bold">{v.title}</h3>
                    <p className="mt-1 text-sm text-muted">{v.text}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-20">
        <SunriseHero minHeight="min-h-[300px]" className="rounded-[32px]" sunX={50}>
          <div className="px-6 pb-24 pt-12 text-center sm:px-12">
            <h2 className="mx-auto max-w-xl font-display text-3xl font-medium text-[color:var(--hero-fg)] sm:text-5xl">Tomorrow can start differently.</h2>
            <div className="mt-6 flex justify-center gap-3">
              <Button to="/register" size="lg">Create your free account</Button>
            </div>
          </div>
        </SunriseHero>
      </Container>
    </>
  );
}
