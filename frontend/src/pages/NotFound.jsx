import { Button } from "../components/ui/primitives";
import { SunriseHero } from "../components/common/Brand";
import { useDocumentTitle } from "../lib/hooks";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <SunriseHero minHeight="min-h-[calc(100vh-4rem)]" sunX={50}>
      <div className="mx-auto flex max-w-xl flex-col items-center px-6 pt-24 text-center sm:pt-32">
        <div className="font-display text-7xl font-medium text-[color:var(--hero-fg)] sm:text-8xl">404</div>
        <h1 className="font-display mt-2 text-3xl font-medium text-[color:var(--hero-fg)] sm:text-4xl">This path leads nowhere. Yet.</h1>
        <p className="mt-3 text-[color:var(--hero-fg)] opacity-80">The page you are looking for moved or never existed. Let us get you back on track.</p>
        <Button to="/" size="lg" className="mt-7">Back to the start</Button>
      </div>
    </SunriseHero>
  );
}
