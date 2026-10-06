import { SunriseHero } from "../../components/common/Brand";
import { useDocumentTitle } from "../../lib/hooks";

export default function AuthLayout({ title, subtitle, children, footer, heading = "Every day is a chance to begin.", quote }) {
  useDocumentTitle(title);
  return (
    <div className="mx-auto grid max-w-6xl gap-0 px-0 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:py-10">
      <SunriseHero minHeight="min-h-[190px] lg:min-h-[600px]" className="lg:rounded-[32px]" sunX={68}>
        <div className="flex h-full flex-col justify-start p-6 sm:p-10 lg:justify-between lg:pt-12">
          <h2 className="font-display text-3xl font-medium leading-tight text-[color:var(--hero-fg)] sm:text-4xl lg:max-w-sm lg:text-5xl">{heading}</h2>
          {quote ? (
            <p className="mt-4 hidden max-w-xs text-sm font-medium text-[color:var(--hero-fg)] opacity-80 lg:mt-0 lg:block">
              {quote}
            </p>
          ) : null}
        </div>
      </SunriseHero>
      <div className="flex items-center px-4 py-8 sm:px-2 lg:py-0">
        <div className="anim-fade-up mx-auto w-full max-w-md">
          <h1 className="font-display text-3xl font-medium sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
