import type { ReactNode } from "react";

export function PageEnter({ children }: { children: ReactNode }) {
  return <div className="motion-page-enter">{children}</div>;
}

export function Reveal({ children, delay = "" }: { children: ReactNode; delay?: "" | "motion-delay-1" | "motion-delay-2" | "motion-delay-3" }) {
  return <div className={`motion-reveal ${delay}`}>{children}</div>;
}

export function Stagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`motion-stagger ${className}`}>{children}</div>;
}

export function BrandedRouteLoading() {
  return <main className="brand-route-loading" role="status" aria-live="polite" aria-label="Loading Bantabato">
    <div className="brand-loader-mark" aria-hidden="true"><span /><span /><span /></div>
    <p className="mt-5 text-sm font-medium text-forest">Preparing your private Bantabato space…</p>
  </main>;
}
