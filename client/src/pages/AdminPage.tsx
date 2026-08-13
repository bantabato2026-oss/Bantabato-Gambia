import { useAuth } from "@/_core/hooks/useAuth";
import { Brand } from "@/components/Brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ClipboardCheck, Flag, LayoutDashboard, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "wouter";

const adminNavigation = [
  { icon: LayoutDashboard, label: "Overview" },
  { icon: UsersRound, label: "Members" },
  { icon: ClipboardCheck, label: "Verification" },
  { icon: Flag, label: "Reports" },
  { icon: ShieldCheck, label: "Trust & Safety" },
  { icon: Settings2, label: "Settings" },
];

export default function AdminPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const overview = trpc.admin.overview.useQuery(undefined, { enabled: Boolean(isAuthenticated && user?.role === "admin") });

  if (loading) return <div className="app-loading" />;
  if (!isAuthenticated) return <AdminSignIn />;
  if (user?.role !== "admin") return <AdminRestricted />;

  const verificationQueue = overview.data?.verificationQueue.map(record => ({
    id: record.id,
    label: `${record.verificationType.replace("_", " ")} · ${record.status.replace("_", " ")}`,
  })) ?? [];
  const reportsQueue = overview.data?.reportsQueue.map(record => ({
    id: record.id,
    label: `${record.reason.replace("_", " ")} · ${record.status.replace("_", " ")}`,
  })) ?? [];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Brand inverse />
        <p className="mt-10 text-xs font-semibold uppercase tracking-[.16em] text-gold">Administration</p>
        <nav className="mt-4 space-y-1">
          {adminNavigation.map(item => {
            const Icon = item.icon;
            return <div key={item.label} className={`admin-nav-item ${item.label === "Overview" ? "admin-nav-active" : ""}`}><Icon size={17} /> {item.label}</div>;
          })}
        </nav>
        <Link href="/app" className="mt-auto flex items-center gap-2 text-sm text-cream/70 hover:text-cream"><ArrowLeft size={16} /> Member space</Link>
      </aside>
      <main className="admin-main">
        <p className="eyebrow text-gold-dark">Bantabato operations</p>
        <h1 className="mt-3 font-display text-4xl text-ink">Trust & safety overview</h1>
        <p className="mt-3 text-sm text-muted-foreground">A role-aware shell for the operational work that protects the community.</p>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          <AdminStat label="Verification queue" value={verificationQueue.length} text="Submitted or in review" />
          <AdminStat label="Open reports" value={reportsQueue.length} text="Awaiting resolution" />
          <AdminStat label="Member management" value="—" text="Module prepared" />
        </div>
        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <QueuePanel title="Identity verification" icon={ClipboardCheck} records={verificationQueue} empty="No verification records are awaiting manual review." />
          <QueuePanel title="Trust & Safety reports" icon={Flag} records={reportsQueue} empty="No safety reports are awaiting review." />
        </div>
        <div className="mt-8 rounded-[1.5rem] border border-gold/35 bg-gold/10 p-6">
          <p className="font-display text-2xl text-ink">Foundation status</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">This Phase 1 console establishes navigation, access boundaries, verification and report queues, and auditable data structures. Detailed member management, moderation actions, subscription tools, and support workflows remain their own next modules.</p>
        </div>
      </main>
    </div>
  );
}

function AdminSignIn() {
  return <div className="app-guard"><div className="app-guard-card"><Brand /><h1 className="mt-9 font-display text-4xl">Administrator access</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Sign in using an authorized Bantabato administrator account.</p><Button onClick={() => startLogin()} className="mt-7 w-full btn-forest">Sign in securely</Button></div></div>;
}

function AdminRestricted() {
  return <div className="app-guard"><div className="app-guard-card"><Brand /><div className="mt-8 w-fit rounded-2xl bg-gold/15 p-4 text-gold-dark"><ShieldCheck /></div><h1 className="mt-6 font-display text-4xl">Restricted area.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">This administrative workspace is limited to authorized roles. Member accounts do not have access to operational data.</p><Link href="/app" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-forest"><ArrowLeft size={16} /> Return to member space</Link></div></div>;
}

function AdminStat({ label, value, text }: { label: string; value: string | number; text: string }) {
  return <div className="surface-card"><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-3 font-display text-5xl text-ink">{value}</p><p className="mt-2 text-xs text-muted-foreground">{text}</p></div>;
}

function QueuePanel({ title, icon: Icon, records, empty }: { title: string; icon: React.ComponentType<{ size?: number }>; records: { id: number; label: string }[]; empty: string }) {
  return <section className="surface-card"><div className="flex items-center gap-3"><div className="icon-plate"><Icon size={19} /></div><h2 className="font-display text-3xl text-ink">{title}</h2></div><div className="mt-6 space-y-3">{records.length ? records.map(record => <div key={record.id} className="flex items-center justify-between rounded-2xl bg-cream p-4"><span className="text-sm font-medium capitalize text-ink">{record.label}</span><Badge className="badge-quiet">Review</Badge></div>) : <p className="rounded-2xl bg-cream p-5 text-sm leading-6 text-muted-foreground">{empty}</p>}</div></section>;
}
