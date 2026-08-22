import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

const navigation = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Our approach", href: "/about" },
	  { label: "Family & Wali", href: "/family-circle" },
  { label: "Membership", href: "/membership" },
  { label: "Safety", href: "/safety" },
  { label: "Stories", href: "/stories" },
  { label: "FAQ", href: "/faq" },
];

const publicMetadata: Record<string, { title: string; description: string }> = {
  "/": { title: "Bantabato — Where Love Takes Root", description: "A private, marriage-first space for Gambians at home and abroad to meet with faith, clarity, and serious intention." },
  "/about": { title: "About Bantabato — A considered matrimonial space", description: "Learn how Bantabato brings a privacy-first, family-aware approach to serious marriage intentions." },
  "/how-it-works": { title: "How Bantabato works — Thoughtful introductions", description: "Understand the considered journey from a private profile through mutual introductions and optional family involvement." },
	  "/family-circle": { title: "Family Circle and Wali — Bantabato", description: "Understand Bantabato’s optional, member-controlled Family Circle and Wali/Guardian boundaries." },
  "/safety": { title: "Safety and verification — Bantabato", description: "Explore Bantabato’s manual verification, privacy controls, reporting, blocking, and member-safety boundaries." },
  "/membership": { title: "Membership — Bantabato", description: "Review Bantabato’s provider-neutral membership terms and the protections Premium can never override." },
  "/stories": { title: "Member stories — Bantabato", description: "Read only voluntary, reviewed, and currently published Bantabato member stories." },
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
      <div className="container flex h-[74px] items-center justify-between gap-5">
        <Brand hoverMotion />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          {navigation.map(item => <Link key={item.href} href={item.href} aria-current={location === item.href ? "page" : undefined} className={`nav-link ${location === item.href ? "nav-link-active" : ""}`}>{item.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-3 lg:flex"><Link href="/login" className="nav-link">Sign in</Link><Button asChild className="btn-gold"><Link href="/register">Join Bantabato</Link></Button></div>
        <button ref={menuButtonRef} onClick={() => setMenuOpen(open => !open)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white lg:hidden" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-controls="mobile-navigation" aria-expanded={menuOpen}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
      </div>
      {menuOpen ? <div className="border-t border-ink/10 bg-cream px-5 py-5 lg:hidden"><nav ref={mobileNavigationRef} id="mobile-navigation" className="container flex flex-col gap-1" aria-label="Mobile navigation">{navigation.map(item => <Link onClick={() => setMenuOpen(false)} key={item.href} href={item.href} aria-current={location === item.href ? "page" : undefined} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-ink/5">{item.label}</Link>)}<div className="my-2 border-t border-ink/10" /><Link onClick={() => setMenuOpen(false)} href="/login" className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-ink/5">Sign in</Link><Button asChild className="mt-2 w-full btn-gold"><Link onClick={() => setMenuOpen(false)} href="/register">Join Bantabato</Link></Button></nav></div> : null}
    </header>
    <div id="public-main-content" tabIndex={-1}>{children}</div>
	    <footer className="border-t border-white/10 bg-forest text-cream"><div className="container grid gap-10 py-12 md:grid-cols-[1.1fr_2fr] md:py-16"><div><Brand inverse /><p className="mt-4 max-w-sm text-sm leading-6 text-cream/68">A considered space for Gambians at home and abroad to begin a path toward lasting marriage.</p><div className="mt-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-gold"><ShieldCheck size={16} /> Marriage begins with trust</div></div><div className="grid grid-cols-2 gap-7 sm:grid-cols-3"><FooterLinks title="Explore" links={[{ label: "How it works", href: "/how-it-works" }, { label: "Our approach", href: "/about" }, { label: "Family Circle & Wali", href: "/family-circle" }, { label: "Membership", href: "/membership" }, { label: "Member stories", href: "/stories" }, { label: "Safety & verification", href: "/safety" }]} /><FooterLinks title="Support" links={[{ label: "Privacy", href: "/privacy" }, { label: "FAQ", href: "/faq" }, { label: "Contact", href: "/contact" }]} /><FooterLinks title="Legal" links={[{ label: "Terms", href: "/terms" }, { label: "Member standards", href: "/safety" }]} /></div></div><div className="container border-t border-white/10 py-5 text-xs text-cream/55">© {new Date().getFullYear()} Bantabato. Where Love Takes Root.</div></footer>
  </div>;
}

function FooterLinks({ title, links }: { title: string; links: { label: string; href: string }[] }) { return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{title}</p><div className="mt-4 flex flex-col gap-3">{links.map(link => <Link key={link.href} href={link.href} className="text-sm text-cream/72 transition-colors hover:text-cream">{link.label}</Link>)}</div></div>; }
