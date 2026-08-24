import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlainLanguagePanel, VoiceGuidancePanel } from "@/components/MemberGuidance";
import { CheckCircle2, CircleAlert, Clock3, Compass, FileCheck2, Image, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

type Eligibility = {
  onboardingState?: string;
  profileComplete?: boolean;
  photosComplete?: boolean;
  approvedPhotoCount?: number;
  photosRemaining?: number;
  discoveryEligible?: boolean;
  title?: string;
  detail?: string;
  nextAction?: string;
};

type Props = {
  eligibility?: Eligibility | null;
  verificationStatus?: string | null;
  hasPreferences?: boolean;
  className?: string;
  compact?: boolean;
};

function verificationCopy(status?: string | null) {
  if (status === "approved") return { label: "Identity review completed", detail: "An identity document has been approved after manual review. This does not guarantee safety, compatibility, character, or another member’s choices.", tone: "complete" as const };
  if (["submitted", "under_review", "escalated"].includes(status ?? "")) return { label: "Under review", detail: "A private document is in manual review. This is not a badge or a guarantee.", tone: "pending" as const };
  if (["rejected", "requires_resubmission", "expired", "restricted"].includes(status ?? "")) return { label: "Action required", detail: "A current supported document may be needed. Private review details are not shown.", tone: "action" as const };
  return { label: "Not started", detail: "Identity verification is optional until you choose to submit a supported document for manual review.", tone: "action" as const };
}

function ReadinessRow({ icon: Icon, label, state, detail, tone }: { icon: typeof FileCheck2; label: string; state: string; detail: string; tone: "complete" | "pending" | "action" }) {
  const colour = tone === "complete" ? "text-forest" : tone === "pending" ? "text-gold-dark" : "text-muted-foreground";
  return <div className="flex items-start gap-3 rounded-xl bg-cream/60 px-3 py-3"><Icon className={`mt-0.5 shrink-0 ${colour}`} size={17} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-ink">{label}</p><Badge className="badge-quiet">{state}</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div></div>;
}

export function ProfileReadinessPanel({ eligibility, verificationStatus, hasPreferences = false, className = "", compact = false }: Props) {
  const verification = verificationCopy(verificationStatus);
  const approved = eligibility?.approvedPhotoCount ?? 0;
  const remaining = eligibility?.photosRemaining ?? Math.max(0, 5 - approved);
  const profileState = eligibility?.profileComplete ? "Complete" : "Action required";
  const discoveryState = eligibility?.discoveryEligible ? "Eligible" : eligibility?.profileComplete ? "Unavailable now" : "Not eligible";
  const rows = [
    { icon: FileCheck2, label: "Profile foundation", state: profileState, detail: eligibility?.profileComplete ? "Required profile details and the approved-photo policy are currently complete." : eligibility?.detail || "Complete the available profile and photo requirements to continue.", tone: eligibility?.profileComplete ? "complete" as const : "action" as const },
    { icon: Image, label: "Profile photos", state: `${approved}/5 approved`, detail: remaining ? `${remaining} more approved photo${remaining === 1 ? "" : "s"} is needed for the five-photo requirement.` : "The five approved-photo requirement is complete.", tone: eligibility?.photosComplete ? "complete" as const : "action" as const },
    { icon: ShieldCheck, label: "Identity verification", state: verification.label, detail: verification.detail, tone: verification.tone },
    { icon: Compass, label: "Marriage preferences", state: hasPreferences ? "Complete" : "Action required", detail: hasPreferences ? "Your stated preferences are saved for considered introductions." : "Review your preferences so your discovery settings reflect your intentions.", tone: hasPreferences ? "complete" as const : "action" as const },
    { icon: eligibility?.discoveryEligible ? CheckCircle2 : CircleAlert, label: "Discovery", state: discoveryState, detail: eligibility?.discoveryEligible ? "Your current profile can take part in discovery, subject to privacy, safety, and relationship boundaries." : eligibility?.title || "Discovery remains unavailable until the current server-authoritative requirements are met.", tone: eligibility?.discoveryEligible ? "complete" as const : "action" as const },
  ];

  return <section className={`surface-card ${className}`} aria-labelledby="profile-readiness-title"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow text-gold-dark">Factual readiness</p><h2 id="profile-readiness-title" className="mt-2 font-display text-2xl text-ink">Clear next steps, not a score.</h2></div>{verification.tone === "pending" ? <Clock3 className="text-gold-dark" size={21} aria-hidden="true" /> : null}</div><p className="mt-3 text-sm leading-6 text-muted-foreground">This view shows only the steps that are currently complete or still needed. It does not rank you, show private safety information, or promise an outcome.</p>{eligibility?.onboardingState ? <p role="status" className="mt-3 rounded-xl bg-cream/70 px-3 py-2 text-xs font-semibold text-forest">Current journey state: {eligibility.onboardingState.replace(/_/g, " ").toLowerCase()}.</p> : null}{!compact ? <PlainLanguagePanel className="mt-5" title="Your next profile step" what={eligibility?.profileComplete ? "Your main profile details are complete." : eligibility?.title || "Some profile details or photos are still needed."} why="These details help keep introductions private, clear, and respectful." next={eligibility?.nextAction || "Review the steps below and choose one action."} /> : null}<div className="mt-5 space-y-3">{(compact ? rows.slice(1) : rows).map(row => <ReadinessRow key={row.label} {...row} />)}</div>{!compact ? <><VoiceGuidancePanel title="Readiness guidance" textAlternative="Read each step in this readiness list. Choose one unfinished item, complete it, and return here. Voice guidance is not connected, so the written steps remain the guide." /><div className="mt-5 flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link href="/app/photos">Manage photos</Link></Button><Button asChild size="sm" variant="outline"><Link href="/app/verification">Review verification</Link></Button><Button asChild size="sm" variant="outline"><Link href="/app/compatibility">Review preferences</Link></Button>{!eligibility?.profileComplete ? <Button asChild size="sm" className="btn-forest"><Link href={eligibility?.photosRemaining ? "/app/photos" : "/app/onboarding"}>{eligibility?.nextAction || "Continue profile"}</Link></Button> : null}</div></> : null}</section>;
}
