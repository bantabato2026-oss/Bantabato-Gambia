import { useAuth } from "@/_core/hooks/useAuth";
import { Brand } from "@/components/Brand";
import { StatePanel, StateSkeleton } from "@/components/StatePanel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useNetworkState } from "@/hooks/useDeviceExperience";
import { useIsMobile } from "@/hooks/useMobile";
import { clearAllMobileDrafts } from "@/lib/mobileExperience";
import { Bell, Camera, ChevronRight, CircleUserRound, Compass, CreditCard, Eye, Globe2, HeartHandshake, Home, Lightbulb, LogOut, Menu, MessageCircle, Settings, ShieldCheck, SlidersHorizontal, UsersRound, WifiOff, Smartphone } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const primaryLinks = [
  { label: "Home", href: "/app", icon: Home },
  { label: "Discover", href: "/app/discover", icon: Compass },
	  { label: "For you", href: "/app/recommendations", icon: Lightbulb },
  { label: "Introductions", href: "/app/matches", icon: HeartHandshake },
  { label: "Messages", href: "/app/messages", icon: MessageCircle },
];
const secondaryLinks = [
  { label: "My profile", href: "/app/profile", icon: CircleUserRound },
	  { label: "Profile preview", href: "/app/profile/preview", icon: Eye },
	  { label: "Compatibility", href: "/app/compatibility", icon: SlidersHorizontal },
	  { label: "International", href: "/app/international", icon: Globe2 },
	  { label: "Profile photos", href: "/app/photos", icon: Camera },
  { label: "Family circle", href: "/app/family", icon: UsersRound },
	  { label: "Membership & billing", href: "/app/billing", icon: CreditCard },
	  { label: "Verification", href: "/app/verification", icon: ShieldCheck },
	  { label: "Safety Center", href: "/app/safety", icon: ShieldCheck },
	  { label: "Settings", href: "/app/settings", icon: Settings },
	  { label: "Device & data", href: "/app/device", icon: Smartphone },
];
const mobileBottomLinks = [
  { label: "Home", href: "/app", icon: Home },
  { label: "Discover", href: "/app/discover", icon: Compass },
  { label: "Matches", href: "/app/matches", icon: HeartHandshake },
  { label: "Messages", href: "/app/messages", icon: MessageCircle },
  { label: "Profile", href: "/app/profile", icon: CircleUserRound },
];

export function MemberShell({ children, eyebrow, title, description }: { children: React.ReactNode; eyebrow?: string; title: string; description?: string }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const mobile = useIsMobile();
  const network = useNetworkState();

  if (loading) return <div className="app-loading"><StateSkeleton label="Loading your Bantabato experience" /></div>;
  if (!isAuthenticated) return <div className="app-guard"><div className="app-guard-card"><Brand /><StatePanel className="mt-8" kind="empty" title="A private space for serious intentions." description="Sign in to continue your Bantabato journey. Your profile and conversations remain private to you and the members you choose to connect with." action={<div className="space-y-4"><Button onClick={() => startLogin()} className="w-full btn-forest">Sign in to continue <ChevronRight size={16} /></Button><Link href="/" className="block text-center text-sm font-medium text-forest hover:underline">Return to Bantabato</Link></div>} /></div></div>;

  const links = mobile ? primaryLinks : [...primaryLinks, ...secondaryLinks];
  return (
    <div className="min-h-screen bg-app">
      <aside className={`member-sidebar ${menuOpen ? "member-sidebar-open" : ""}`}>
        <div className="flex items-center justify-between px-6 pb-7 pt-6"><Brand /><button onClick={() => setMenuOpen(false)} className="rounded-full p-2 text-forest hover:bg-forest/5 lg:hidden" aria-label="Close navigation"><Menu size={18} /></button></div>
        <nav className="px-3" aria-label="Member navigation">
          <p className="nav-section-label">Your Bantaba</p>
          <div className="mt-2 space-y-1">{links.map(link => <NavItem key={link.href} active={location === link.href} item={link} navigate={setLocation} />)}</div>
          {!mobile ? <><p className="nav-section-label mt-8">Your account</p><div className="mt-2 space-y-1">{secondaryLinks.map(link => <NavItem key={link.href} active={location === link.href} item={link} navigate={setLocation} />)}</div></> : null}
        </nav>
	        <div className="mt-auto border-t border-forest/10 p-4">
	          <button onClick={() => { clearAllMobileDrafts(); logout(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-forest/5 hover:text-forest"><LogOut size={17} /> Sign out</button>
        </div>
      </aside>
      {menuOpen ? <button className="member-overlay lg:hidden" aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} /> : null}
	      <main className="member-main">
        {network === "offline" ? <div role="status" aria-live="polite" className="member-network-status"><WifiOff size={16} /><span>You’re offline. We’ll reconnect when your connection returns. Private information is not available offline.</span></div> : null}
        <header className="member-topbar">
          <div className="flex items-center gap-3"><button onClick={() => setMenuOpen(true)} className="rounded-full p-2.5 hover:bg-forest/5 lg:hidden" aria-label="Open navigation"><Menu size={19} /></button><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">{eyebrow ?? "Member space"}</p><h1 className="font-display text-2xl text-ink sm:text-3xl">{title}</h1></div></div>
          <div className="flex items-center gap-3"><Link href="/app/notifications" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-forest/10 bg-white text-forest transition-colors hover:bg-forest/5" aria-label="Notifications"><Bell size={18} /></Link><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-ink">{user?.name || "Member"}</p><p className="text-xs text-muted-foreground">Bantabato member</p></div><Avatar className="h-10 w-10 border border-gold/30"><AvatarFallback className="bg-gold/15 text-sm font-semibold text-gold-dark">{user?.name?.slice(0, 1).toUpperCase() || "B"}</AvatarFallback></Avatar></div>
        </header>
        <div className="member-content"><p className="mb-7 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>{children}</div>
	      </main>
	      {mobile ? <nav className="mobile-bottom-nav" aria-label="Primary member navigation">{mobileBottomLinks.map(link => <NavItem key={link.href} active={location === link.href || (link.href !== "/app" && location.startsWith(`${link.href}/`))} item={link} navigate={to => { setMenuOpen(false); setLocation(to); }} />)}</nav> : null}
    </div>
  );
}

function NavItem({ item, active, navigate }: { item: { label: string; href: string; icon: React.ComponentType<{ size?: number }> }; active: boolean; navigate: (to: string) => void }) {
  const Icon = item.icon;
  return <button onClick={() => navigate(item.href)} aria-current={active ? "page" : undefined} className={`member-nav-item ${active ? "member-nav-active" : ""}`}><Icon size={18} /><span>{item.label}</span></button>;
}
