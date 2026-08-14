import { useAuth } from "@/_core/hooks/useAuth";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { ArrowLeft, ClipboardCheck, Flag, LayoutDashboard, Settings2, ShieldCheck, Sparkles, UsersRound, Video } from "lucide-react";
import { Link, useLocation } from "wouter";

const adminNavigation = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: ClipboardCheck, label: "Verification", href: "/admin/verification" },
	  { icon: Flag, label: "Reports", href: "/admin/reports" },
	  { icon: Video, label: "Connection review", href: "/admin/connections" },
	  { icon: UsersRound, label: "Family Circle", href: "/admin/family" },
	  { icon: Sparkles, label: "Recommendation policy", href: "/admin/recommendations" },
	  { icon: UsersRound, label: "Members", href: "/admin" },
  { icon: ShieldCheck, label: "Trust & Safety", href: "/admin/reports" },
  { icon: Settings2, label: "Settings", href: "/admin" },
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
  return <div className="admin-shell"><aside className="admin-sidebar"><Brand inverse /><p className="mt-10 text-xs font-semibold uppercase tracking-[.16em] text-gold">Administration</p><nav className="mt-4 space-y-1">{adminNavigation.map(item => { const Icon = item.icon; const active = item.href === location || (item.href !== "/admin" && location.startsWith(item.href)); return <Link key={item.label} href={item.href} className={`admin-nav-item ${active ? "admin-nav-active" : ""}`}><Icon size={17} /> {item.label}</Link>; })}</nav><Link href="/app" className="mt-auto flex items-center gap-2 text-sm text-cream/70 hover:text-cream"><ArrowLeft size={16} /> Member space</Link></aside><main className="admin-main"><p className="eyebrow text-gold-dark">{eyebrow}</p><h1 className="mt-3 font-display text-4xl text-ink">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>{children}</main></div>;
}
