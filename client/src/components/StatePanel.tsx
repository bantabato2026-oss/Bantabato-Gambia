import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Inbox, LoaderCircle } from "lucide-react";

type StateKind = "empty" | "error" | "success" | "loading";

const stateIcon = { empty: Inbox, error: AlertTriangle, success: CheckCircle2, loading: LoaderCircle } as const;

export function StatePanel({ kind, title, description, action, className = "" }: { kind: StateKind; title: string; description: string; action?: ReactNode; className?: string }) {
  const Icon = stateIcon[kind];
  return <section className={`state-panel state-panel-${kind} ${className}`} role={kind === "error" ? "alert" : "status"} aria-live={kind === "error" ? "assertive" : "polite"}><Icon className={kind === "loading" ? "state-panel-icon state-panel-icon-loading" : "state-panel-icon"} aria-hidden="true" size={23} /><div className="min-w-0"><h2 className="font-display text-3xl text-ink">{title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>{action ? <div className="mt-6">{action}</div> : null}</div></section>;
}

export function StateSkeleton({ label = "Loading content" }: { label?: string }) {
  return <section className="state-skeleton" role="status" aria-live="polite" aria-label={label}><span className="sr-only">{label}</span><span /><span /><span /></section>;
}
