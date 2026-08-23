import { AdminAccessGate, AdminShell } from "@/components/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatePanel, StateSkeleton } from "@/components/StatePanel";
import { trpc } from "@/lib/trpc";
import { BellRing, ClipboardCheck, FileCheck2, ImageOff, Landmark, ShieldAlert, Sparkles, UsersRound, WalletCards } from "lucide-react";
import { Link } from "wouter";

const cards = [
  { key: "verification", label: "Verification queue", text: "Submitted, in review, or escalated identity work.", href: "/admin/verification", permission: "verification.view", icon: FileCheck2 },
  { key: "safety", label: "Open safety cases", text: "Operationally active cases; no member details are shown here.", href: "/admin/safety", permission: "safety.cases.view", icon: ShieldAlert },
  { key: "support", label: "Support queue", text: "Member-support requests, separately scoped from safety evidence.", href: "/admin/support", permission: "support.view", icon: ClipboardCheck },
  { key: "approvals", label: "Pending approvals", text: "High-impact requests awaiting a separate decision-maker.", href: "/admin/approvals", permission: "approvals.view", icon: FileCheck2 },
  { key: "incidents", label: "Open incidents", text: "Service and provider issues currently under operational handling.", href: "/admin/incidents", permission: "incidents.view", icon: ShieldAlert },
  { key: "notificationFailures", label: "Unread notification records", text: "Privacy-safe operational record count only; no payload is exposed.", href: "/admin/notifications", permission: "notifications.view", icon: BellRing },
  { key: "photoReviews", label: "Photo review queue", text: "Pending private profile photos awaiting an authorized review.", href: "/admin/photos", permission: "photos.review", icon: ImageOff },
  { key: "appeals", label: "Pending safety appeals", text: "Member-owned appeals requiring permitted safety review.", href: "/admin/safety", permission: "safety.cases.view", icon: ShieldAlert },
  { key: "safetyActions", label: "Safety actions", text: "Pending or active proportionate enforcement controls.", href: "/admin/safety", permission: "safety.cases.view", icon: ShieldAlert },
  { key: "family", label: "Family Circle attention", text: "Invitation, Wali verification, or restriction metadata only.", href: "/admin/family", permission: "members.view", icon: UsersRound },
  { key: "editorial", label: "Editorial submissions", text: "Consent-scoped stories awaiting review or independent sign-off.", href: "/admin/success-stories", permission: "success_stories.review", icon: Sparkles },
  { key: "refunds", label: "Refund review", text: "Provider-bound finance requests; no money moves here.", href: "/admin/billing", permission: "finance.transactions.view", icon: WalletCards },
  { key: "reconciliations", label: "Reconciliation review", text: "Internal consistency findings for authorized finance follow-up.", href: "/admin/billing", permission: "finance.transactions.view", icon: WalletCards },
  { key: "memberships", label: "Membership attention", text: "Past-due, grace, or suspended lifecycle records only.", href: "/admin/billing", permission: "subscriptions.view", icon: WalletCards },
  { key: "betaInvitations", label: "Pending beta invitations", text: "Invite-only enrollment records; no tokens are displayed.", href: "/admin/beta", permission: "beta.view", icon: UsersRound },
] as const;

export default function AdminPage() { return <AdminAccessGate><AdminOperationsHome /></AdminAccessGate>; }

function AdminOperationsHome() {
  const overview = trpc.admin.operationsOverview.useQuery();
  const access = trpc.admin.operationsAccess.useQuery();
  const permissions = new Set<string>(access.data?.permissions ?? []);
  const retry = () => { void overview.refetch(); void access.refetch(); };

  return <AdminShell eyebrow="Admin & Operations Center" title="Operational clarity, not vanity." description="This role-based control layer shows only the queues and records your active staff identity is authorized to handle. Private messages, secret configuration, and unrelated member information remain unavailable.">
    {overview.isLoading || access.isLoading ? <div className="mt-8"><StateSkeleton label="Loading your authorized operations overview…" /></div> : overview.isError || access.isError ? <div className="mt-8"><StatePanel kind="error" title="Your operations overview is unavailable right now." description="No queue count, role detail, or permission state has been changed. Please try again." action={<Button onClick={retry} className="btn-forest">Try again</Button>} /></div> : <>
      <section className="mt-8 welcome-panel"><Landmark size={24} className="text-gold" /><p className="mt-5 text-xs font-semibold uppercase tracking-[.16em] text-gold">Active staff context</p><h2 className="mt-2 font-display text-3xl text-cream">{overview.data?.access.staffRole.replace(/_/g, " ")}</h2><p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: "#fcf8ef" }}>Authorization is evaluated on the server for every action. Interface visibility supports clarity; it never replaces permission checks, resource scoping, fresh reauthentication, or approval controls.</p></section>
      <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{cards.filter(card => permissions.has(card.permission)).map(card => { const Icon = card.icon; const count = (overview.data?.queues as Record<string, number | undefined> | undefined)?.[card.key]; return <Link key={card.key} href={card.href} className="action-tile"><div className="flex items-center justify-between"><div className="icon-plate"><Icon size={19} /></div><Badge className="badge-quiet">{count ?? 0} active</Badge></div><h2 className="mt-5 font-display text-2xl text-ink">{card.label}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{card.text}</p><p className="mt-5 text-sm font-semibold text-forest">Open authorized workspace</p></Link>; })}</section>
      <section className="mt-7 grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><div className="surface-card"><p className="eyebrow text-gold-dark">Operational boundaries</p><h2 className="mt-2 font-display text-3xl text-ink">Actions remain deliberate.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">High-impact safety actions, staff changes, policy changes, refunds, and configuration changes are routed through an approval boundary. A requester cannot approve their own request.</p></div><div className="surface-card"><UsersRound className="text-gold-dark" size={22} /><h2 className="mt-4 font-display text-2xl text-ink">Search is scoped.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Member lookup is limited to authorized staff, returns support-safe operational fields, is paginated, and records a minimized audit event.</p></div></section>
    </>}
  </AdminShell>;
}
