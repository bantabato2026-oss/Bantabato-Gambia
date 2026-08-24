import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CircleAlert, Compass, Image, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

type Eligibility = { profileComplete?: boolean; photosComplete?: boolean; approvedPhotoCount?: number; photosRemaining?: number; discoveryEligible?: boolean; title?: string; detail?: string; nextAction?: string };

type Props = { eligibility?: Eligibility | null; verificationStatus?: string | null; hasPreferences?: boolean; compact?: boolean; className?: string };

function verificationSignal(status?: string | null) {
  if (status === "approved") return { label: "Identity review completed", detail: "A private identity document was approved after manual review.", tone: "complete" as const };
  if (["submitted", "under_review", "escalated"].includes(status ?? "")) return { label: "Identity review in progress", detail: "A private document is in manual review. This is not a safety or compatibility result.", tone: "pending" as const };
  if (["rejected", "requires_resubmission", "expired", "restricted"].includes(status ?? "")) return { label: "Identity review needs attention", detail: "A current supported document may be needed. Private reviewer details are not shown.", tone: "action" as const };
  return { label: "Identity review not started", detail: "Private identity review is optional unless a current policy asks you to complete it.", tone: "action" as const };
}

function Signal({ icon: Icon, label, detail, tone }: { icon: typeof ShieldCheck; label: string; detail: string; tone: "complete" | "pending" | "action" }) {
  const color = tone === "complete" ? "text-forest" : tone === "pending" ? "text-gold-dark" : "text-muted-foreground";
  return <div className="rounded-xl bg-cream/60 p-3"><div className="flex items-start gap-2"><Icon className={`mt-0.5 shrink-0 ${color}`} size={16} /><div className="min-w-0"><p className="text-sm font-semibold text-ink">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div></div></div>;
}

export function ProfileCredibilityPanel({ eligibility, verificationStatus, hasPreferences = false, compact = false, className = "" }: Props) {
  const approved = eligibility?.approvedPhotoCount ?? 0;
  const remaining = eligibility?.photosRemaining ?? Math.max(0, 5 - approved);
  const identity = verificationSignal(verificationStatus);
  const profileComplete = eligibility?.profileComplete === true;
  const discoveryEligible = eligibility?.discoveryEligible === true;
  const signals = [
    { icon: CheckCircle2, label: profileComplete ? "Profile foundation complete" : "Profile foundation in progress", detail: profileComplete ? "Required profile information and current photo policy are complete." : eligibility?.detail || "Add the remaining required information to continue.", tone: profileComplete ? "complete" as const : "action" as const },
    { icon: Image, label: `${approved}/5 approved profile photos`, detail: remaining ? `${remaining} more approved photo${remaining === 1 ? " is" : "s are"} needed for the five-photo requirement.` : "The five approved-photo requirement is complete.", tone: eligibility?.photosComplete ? "complete" as const : "action" as const },
    { icon: ShieldCheck, label: identity.label, detail: identity.detail, tone: identity.tone },
    { icon: Compass, label: hasPreferences ? "Marriage preferences saved" : "Marriage preferences need attention", detail: hasPreferences ? "Your stated preferences support considered, explainable introductions." : "Review your preferences so discovery settings can reflect your intentions.", tone: hasPreferences ? "complete" as const : "action" as const },
  ];
  return <section className={`surface-card ${className}`} aria-labelledby="profile-credibility-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow text-gold-dark">Factual profile credibility</p><h2 id="profile-credibility-title" className="mt-2 font-display text-2xl text-ink">Signals, not a score.</h2></div><Badge className={discoveryEligible ? "badge-quiet" : "border border-gold/25 bg-gold/10 text-gold-dark"}>{discoveryEligible ? "Discovery eligible" : "Discovery unavailable now"}</Badge></div><p className="mt-3 text-sm leading-6 text-muted-foreground">These are current factual profile signals. They do not rank you, prove safety, judge character, promise compatibility, reveal private documents, or place you above another member.</p><div className={`mt-5 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>{(compact ? signals.slice(1) : signals).map(signal => <Signal key={signal.label} {...signal} />)}</div>{!compact ? <><div className="mt-4 rounded-xl border border-forest/10 bg-white/70 p-4 text-xs leading-5 text-muted-foreground"><p><strong className="text-ink">What happens next:</strong> {discoveryEligible ? "Current discovery visibility still follows your privacy, safety, country, relationship, and each-member choice boundaries." : eligibility?.nextAction || "Choose one unfinished step, complete it, then return to review the server-confirmed status."}</p></div><div className="mt-5 flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link href="/app/profile/preview">Review profile preview</Link></Button><Button asChild size="sm" variant="outline"><Link href="/app/photos">Review photos</Link></Button><Button asChild size="sm" variant="outline"><Link href="/app/verification">Review identity status</Link></Button></div></> : null}</section>;
}
