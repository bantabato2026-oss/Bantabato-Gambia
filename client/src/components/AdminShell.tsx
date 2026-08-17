import { useAuth } from "@/_core/hooks/useAuth";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BellRing, CircleDollarSign, ClipboardCheck, Flag, Globe2, LayoutDashboard, Settings2, ShieldCheck, Sparkles, UsersRound, Video } from "lucide-react";
import { Link, useLocation } from "wouter";

const adminNavigation = [
	  { icon: LayoutDashboard, label: "Overview", href: "/admin", permission: "members.view" }, { icon: UsersRound, label: "Members", href: "/admin/members", permission: "members.search" },
	  { icon: ClipboardCheck, label: "Verification", href: "/admin/verification", permission: "verification.view" }, { icon: Flag, label: "Reports", href: "/admin/reports", permission: "safety.cases.view" },
	  { icon: Video, label: "Connection review", href: "/admin/connections", permission: "safety.cases.view" }, { icon: UsersRound, label: "Family Circle", href: "/admin/family", permission: "members.view" },
	  { icon: Sparkles, label: "Recommendations", href: "/admin/recommendations", permission: "recommendations.policy.view" }, { icon: CircleDollarSign, label: "Billing", href: "/admin/billing", permission: "finance.transactions.view" },
	  { icon: BellRing, label: "Notifications", href: "/admin/notifications", permission: "notifications.view" }, { icon: ShieldCheck, label: "Safety Operations", href: "/admin/safety", permission: "safety.cases.view" },
	  { icon: ClipboardCheck, label: "Support", href: "/admin/support", permission: "support.view" }, { icon: ShieldCheck, label: "Approvals", href: "/admin/approvals", permission: "approvals.view" },
	  { icon: Settings2, label: "Incidents", href: "/admin/incidents", permission: "incidents.view" }, { icon: UsersRound, label: "Staff & permissions", href: "/admin/staff", permission: "staff.view" },
	  { icon: ClipboardCheck, label: "Audit logs", href: "/admin/audit", permission: "audit.view" }, { icon: Settings2, label: "Configuration", href: "/admin/configuration", permission: "settings.view" }, { icon: ShieldCheck, label: "Closed beta", href: "/admin/beta", permission: "beta.view" },
	  { icon: Globe2, label: "Countries", href: "/admin/countries", permission: "settings.view" },
];

export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <div className="app-loading" />;
  if (!isAuthenticated) return <div className="app-guard"><div className="app-guard-card"><Brand /><h1 className="mt-9 font-display text-4xl">Administrator access</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Sign in using an authorized Bantabato operational account.</p><Button onClick={() => startLogin()} className="mt-7 w-full btn-forest">Sign in securely</Button></div></div>;
  if (user?.role !== "admin") return <div className="app-guard"><div className="app-guard-card"><Brand /><div className="mt-8 w-fit rounded-2xl bg-gold/15 p-4 text-gold-dark"><ShieldCheck /></div><h1 className="mt-6 font-display text-4xl">Restricted area.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">This workspace is limited to authorized operational roles. Member accounts cannot access sensitive review information.</p><Link href="/app" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-forest"><ArrowLeft size={16} /> Return to member space</Link></div></div>;
  return <>{children}</>;
}

export function AdminShell({ eyebrow = "Bantabato operations", title, description, children }: { eyebrow?: string; title: string; description: string; children: React.ReactNode }) {
  const [location] = useLocation();
  const access = trpc.admin.operationsAccess.useQuery(); const permissions = new Set<string>(access.data?.permissions ?? []); const visibleNavigation = access.isLoading ? adminNavigation.filter(item => item.href === "/admin") : adminNavigation.filter(item => permissions.has(item.permission));
  return <div className="admin-shell"><aside className="admin-sidebar"><Brand inverse /><p className="mt-10 text-xs font-semibold uppercase tracking-[.16em] text-gold">Administration</p><nav className="mt-4 space-y-1">{visibleNavigation.map(item => { const Icon = item.icon; const active = item.href === location || (item.href !== "/admin" && location.startsWith(item.href)); return <Link key={item.label} href={item.href} className={`admin-nav-item ${active ? "admin-nav-active" : ""}`}><Icon size={17} /> {item.label}</Link>; })}</nav><Link href="/app" className="mt-auto flex items-center gap-2 text-sm text-cream/70 hover:text-cream"><ArrowLeft size={16} /> Member space</Link></aside><main className="admin-main"><p className="eyebrow text-gold-dark">{eyebrow}</p><h1 className="mt-3 font-display text-4xl text-ink">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>{children}</main></div>;
}
