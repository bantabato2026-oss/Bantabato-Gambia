import { MemberShell } from "@/components/MemberShell";
import { StatePanel, StateSkeleton } from "@/components/StatePanel";
import { Button } from "@/components/ui/button";
import { useNetworkState } from "@/hooks/useDeviceExperience";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, LockKeyhole, WifiOff } from "lucide-react";
import { Link } from "wouter";

const freeFeatures = [
  "Profile creation and readiness guidance",
  "Approved photos and identity-review submission",
  "Thoughtful discovery, compatibility, and recommendations",
  "Mutual interests, connections, and permitted messaging",
  "Family Circle, Wali/Guardian participation, and marriage intent",
  "Privacy, Safety Center, support, notifications, and data rights",
];

export default function BillingPage() {
  const profile = trpc.profile.mine.useQuery();
  const profileReady = Boolean(profile.data?.id);
  const summary = trpc.billing.summary.useQuery(undefined, { enabled: profileReady });
  const network = useNetworkState();

  if (profile.isLoading) return <MemberShell eyebrow="Membership" title="Free access, serious intentions." description="Preparing your private membership status."><StateSkeleton label="Checking access status…" /></MemberShell>;
  if (!profileReady) return <MemberShell eyebrow="Membership" title="Free access, serious intentions." description="Bantabato is currently free during our initial launch period."><StatePanel kind="empty" title="Start your profile first." description="No payment, subscription, checkout, or membership change was requested. Your profile remains subject to the usual eligibility and safety rules." action={<Button asChild className="btn-forest"><Link href="/app/onboarding">Start profile <ArrowRight size={16} /></Link></Button>} /></MemberShell>;
  if (summary.isLoading) return <MemberShell eyebrow="Membership" title="Free access, serious intentions." description="Preparing your private membership status."><StateSkeleton label="Loading access status…" /></MemberShell>;
  if (summary.isError) return <MemberShell eyebrow="Membership" title="Free access, serious intentions." description="Bantabato is currently free during our initial launch period."><StatePanel kind="error" title="Membership status is unavailable right now." description="No payment, subscription, checkout, or account state was changed. Try again when you are connected." action={<Button className="btn-forest" onClick={() => summary.refetch()}>Try again</Button>} /></MemberShell>;

  const transactionCount = summary.data?.transactions.length ?? 0;
  return <MemberShell eyebrow="Membership" title="Free access, serious intentions." description="Bantabato is currently free during our initial launch period. Core access never removes the rules that keep members safe and respected.">
    {network !== "online" ? <section className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-4" role="status"><div className="flex gap-3"><WifiOff className="shrink-0 text-gold-dark" size={19} /><p className="text-sm leading-6 text-muted-foreground">You are offline. No billing action is available or queued, and no financial state can change without server confirmation.</p></div></section> : null}
    <section className="mt-7 welcome-panel"><LockKeyhole size={25} className="text-gold" /><p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-gold">Free Launch access</p><h2 className="mt-3 max-w-3xl font-display text-3xl text-cream">Membership is currently free.</h2><p className="mt-4 max-w-3xl text-sm leading-6 text-cream/80">You do not need a subscription, payment method, checkout, or paid status to use the core Bantabato journey. Eligibility, privacy, verification, consent, relationship, and safety authorities still apply.</p></section>
    <section className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><div className="surface-card"><p className="eyebrow text-gold-dark">What is included</p><h2 className="mt-2 font-display text-3xl text-ink">The core journey is available without payment.</h2><div className="mt-6 space-y-3">{freeFeatures.map(feature => <p key={feature} className="flex gap-3 text-sm leading-6 text-muted-foreground"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-forest" />{feature}</p>)}</div></div><div className="surface-card"><p className="eyebrow text-gold-dark">Billing status</p><h2 className="mt-2 font-display text-3xl text-ink">Free access</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">Billing is dormant for now. Its provider-neutral architecture is retained only for a possible future release. It does not create a commercial obligation now, and no provider has been activated.</p><div className="mt-5 rounded-xl bg-cream/60 p-4 text-sm leading-6 text-muted-foreground"><p><strong className="text-ink">Payment provider:</strong> No payment provider is active.</p><p><strong className="text-ink">Checkout:</strong> Unavailable during Free Launch</p><p><strong className="text-ink">Payment records:</strong> {transactionCount ? `${transactionCount} historical record${transactionCount === 1 ? "" : "s"} observed; no new payment is requested.` : "No payment records observed."}</p></div><p className="mt-5 text-xs leading-5 text-muted-foreground">No invoice, renewal date, charge, receipt, or paid-subscription action is presented here.</p></div></section>
    <section className="mt-7 rounded-2xl border border-forest/10 bg-white p-5"><p className="text-sm leading-6 text-muted-foreground">Free access does not mean unverified or unrestricted. Bantabato continues to apply age, profile readiness, approved-photo, identity-review, privacy, consent, relationship, and Safety Center rules.</p></section>
  </MemberShell>;
}
