import { useAuth } from "@/_core/hooks/useAuth";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

const navigation = [
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
  { label: "Safety & privacy", href: "/safety" },
  { label: "Family & Wali", href: "/family-circle" },
  { label: "Membership", href: "/membership" },
  { label: "Stories", href: "/stories" },
  { label: "FAQ", href: "/faq" },
];

const publicMetadata: Record<string, { title: string; description: string }> = {
  "/": { title: "Bantabato — Where Love Takes Root", description: "A private, marriage-first space for Gambians in The Gambia, Senegal, and the diaspora to meet with faith, clarity, and serious intention." },
  "/about": { title: "About Bantabato — A considered matrimonial space", description: "Discover Bantabato’s privacy-first, marriage-focused approach for Gambians and the diaspora." },
  "/how-it-works": { title: "How Bantabato works — Thoughtful introductions", description: "Follow Bantabato’s considered journey from private profile to mutual introduction, communication, and optional family involvement." },
  "/family-circle": { title: "Family Circle and Wali — Bantabato", description: "Understand Bantabato’s optional, member-controlled Family Circle and Wali/Guardian privacy boundaries." },
  "/safety": { title: "Safety, privacy and verification — Bantabato", description: "Explore manual identity review, privacy choices, mutual communication, reporting, blocking, and Bantabato’s safety limits." },
  "/privacy": { title: "Privacy choices — Bantabato", description: "See how Bantabato keeps profile choices, private documents, media, communication, and Family Circle permissions appropriately separated." },
  "/membership": { title: "Membership — Bantabato", description: "Review current effective Bantabato membership terms, available currencies, and provider-neutral checkout availability." },
  "/stories": { title: "Member stories — Bantabato", description: "Read only voluntary, independently reviewed, currently published Bantabato member stories." },
  "/faq": { title: "Bantabato FAQ — Clear answers before you begin", description: "Find factual answers about membership, photos, privacy, verification, Family Circle, communication, safety, and account controls." },
  "/contact": { title: "Support and contact — Bantabato", description: "Find Bantabato’s public guidance for general questions, secure account support, privacy, and safety concerns." },
  "/terms": { title: "Member standards — Bantabato", description: "Review the current public foundation for Bantabato’s respectful, marriage-first community standards." },
  "/register": { title: "Join Bantabato — Begin with intention", description: "Begin a private Bantabato profile journey with clear guidance, privacy, and your own pace." },
  "/login": { title: "Sign in — Bantabato", description: "Return to your private Bantabato profile, introductions, and conversations through a secure entry boundary." },
};

function applyPublicMetadata(location: string) {
  const item = publicMetadata[location] ?? publicMetadata["/"];
  const canonical = `https://bantabato-pkgkalne.manus.space${location === "/" ? "/" : location}`;
  document.title = item.title;
  const setMeta = (selector: string, content: string) => document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
  setMeta('meta[name="description"]', item.description);
  setMeta('meta[property="og:title"]', item.title);
  setMeta('meta[property="og:description"]', item.description);
  setMeta('meta[property="og:url"]', canonical);
  setMeta('meta[name="twitter:title"]', item.title);
  setMeta('meta[name="twitter:description"]', item.description);
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", canonical);
}

function SecureEntryLink({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <span className={mobile ? "rounded-xl px-3 py-3 text-sm text-muted-foreground" : "text-xs text-muted-foreground"}>Checking secure entry…</span>;
  if (isAuthenticated) {
    if (mobile) return <Button asChild className="mt-2 w-full btn-forest"><Link onClick={onNavigate} href="/app">Your member space <ArrowRight size={16} /></Link></Button>;
    return <Button asChild variant="outline" className="border-forest/20 bg-white text-forest hover:bg-forest/5"><Link href="/app">Your member space</Link></Button>;
  }
  if (mobile) return <><Link onClick={onNavigate} href="/login" className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-ink/5">Sign in</Link><Button asChild className="mt-2 w-full btn-gold"><Link onClick={onNavigate} href="/register">Join Bantabato</Link></Button></>;
  return <><Link href="/login" className="nav-link">Sign in</Link><Button asChild className="btn-gold"><Link href="/register">Join Bantabato</Link></Button></>;
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavigationRef = useRef<HTMLElement>(null);

  useEffect(() => { setMenuOpen(false); }, [location]);
  useEffect(() => { applyPublicMetadata(location); }, [location]);
  useEffect(() => {
    if (!menuOpen) return;
    mobileNavigationRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); menuButtonRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return <div className="min-h-screen bg-cream text-ink">
    <a href="#public-main-content" className="sr-only z-50 rounded-md bg-forest px-4 py-3 text-sm font-semibold text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>
    <header className="public-header">
      <div className="container flex h-[74px] items-center justify-between gap-4">
        <Brand hoverMotion />
        <nav className="hidden items-center gap-5 xl:flex" aria-label="Primary navigation">
          {navigation.map(item => <Link key={item.href} href={item.href} aria-current={location === item.href ? "page" : undefined} className={`nav-link ${location === item.href ? "nav-link-active" : ""}`}>{item.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-3 xl:flex"><SecureEntryLink /></div>
        <button ref={menuButtonRef} onClick={() => setMenuOpen(open => !open)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white lg:hidden" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-controls="mobile-navigation" aria-expanded={menuOpen}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
      </div>
      {menuOpen ? <div className="border-t border-ink/10 bg-cream px-5 py-5 lg:hidden"><nav ref={mobileNavigationRef} id="mobile-navigation" className="container flex flex-col gap-1" aria-label="Mobile navigation">{navigation.map(item => <Link onClick={() => setMenuOpen(false)} key={item.href} href={item.href} aria-current={location === item.href ? "page" : undefined} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-ink/5">{item.label}</Link>)}<div className="my-2 border-t border-ink/10" /><SecureEntryLink mobile onNavigate={() => setMenuOpen(false)} /></nav></div> : null}
    </header>
    <div id="public-main-content" tabIndex={-1}>{children}</div>
    <footer className="border-t border-white/10 bg-forest text-cream"><div className="container grid gap-10 py-12 md:grid-cols-[1.1fr_2fr] md:py-16"><div><Brand inverse /><p className="mt-4 max-w-sm text-sm leading-6 text-cream/68">A considered space for Gambians in The Gambia, Senegal, and the diaspora to begin a path toward lasting marriage.</p><div className="mt-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-gold"><ShieldCheck size={16} /> Marriage begins with trust</div></div><div className="grid grid-cols-2 gap-7 sm:grid-cols-3"><FooterLinks title="Explore" links={[{ label: "How it works", href: "/how-it-works" }, { label: "About Bantabato", href: "/about" }, { label: "Family Circle & Wali", href: "/family-circle" }, { label: "Membership", href: "/membership" }, { label: "Member stories", href: "/stories" }, { label: "Safety & verification", href: "/safety" }]} /><FooterLinks title="Support" links={[{ label: "Privacy choices", href: "/privacy" }, { label: "FAQ", href: "/faq" }, { label: "Contact & support", href: "/contact" }]} /><FooterLinks title="Standards" links={[{ label: "Member standards", href: "/terms" }, { label: "Secure entry", href: "/login" }]} /></div></div><div className="container border-t border-white/10 py-5 text-xs text-cream/55">© {new Date().getFullYear()} Bantabato. Where Love Takes Root.</div></footer>
  </div>;
}

function FooterLinks({ title, links }: { title: string; links: { label: string; href: string }[] }) { return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{title}</p><div className="mt-4 flex flex-col gap-3">{links.map(link => <Link key={link.href} href={link.href} className="text-sm text-cream/72 transition-colors hover:text-cream">{link.label}</Link>)}</div></div>; }
