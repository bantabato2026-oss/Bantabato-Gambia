import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, HeartHandshake, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "wouter";

const pillars = [
  { icon: ShieldCheck, title: "Trust before introductions", text: "Verification and member standards put dignity and safety at the heart of every step." },
  { icon: HeartHandshake, title: "Marriage with intention", text: "Thoughtful discovery replaces swiping, giving each introduction the attention it deserves." },
  { icon: UsersRound, title: "Family, by your choice", text: "Invite a trusted parent or wali when it feels right—without giving up your private space." },
];

export default function Home() {
  return <PublicLayout>
    <main>
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
        <div className="container relative grid items-end gap-12 pb-16 pt-16 lg:grid-cols-[1.15fr_.85fr] lg:pb-24 lg:pt-24">
          <div className="max-w-3xl"><div className="eyebrow"><span className="eyebrow-dot" /> Matrimony, with meaning</div><h1 className="hero-title">Where love<br />takes <em>root.</em></h1><p className="hero-copy">A trusted place for Gambians at home and abroad to meet with faith, clarity, and a sincere intention toward marriage.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="btn-gold h-12 px-6"><Link href="/register">Begin with intention <ArrowRight size={17} /></Link></Button><Button asChild size="lg" variant="outline" className="h-12 border-forest/20 bg-transparent px-6 text-forest hover:bg-forest/5"><Link href="/how-it-works">How Bantabato works</Link></Button></div><p className="mt-6 flex items-center gap-2 text-sm text-forest/70"><LockKeyhole size={15} /> Private by default. Respectful by design.</p></div>
          <div className="hero-card"><div className="hero-card-top"><p className="font-display text-2xl text-cream">A considered beginning</p><div className="hero-orbit"><div /><div /><div /></div></div><div className="mt-auto"><div className="divider-gold" /><p className="mt-5 text-sm leading-6 text-cream/70">A shared path begins with mutual respect, verified identity, and the freedom to move at your own pace.</p><div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold"><CheckCircle2 size={15} /> Designed for serious adults</div></div></div>
        </div>
      </section>
      <section className="section-soft"><div className="container"><div className="max-w-2xl"><p className="eyebrow text-gold-dark">Built around what matters</p><h2 className="section-title mt-4">A quieter, more dignified way to meet.</h2><p className="mt-5 max-w-xl leading-7 text-muted-foreground">Bantabato is made for adults seeking a meaningful marriage. Every detail—from privacy settings to family involvement—is shaped to support a respectful journey.</p></div><div className="mt-12 grid gap-5 md:grid-cols-3">{pillars.map(pillar => <div key={pillar.title} className="value-card"><div className="icon-plate"><pillar.icon size={22} /></div><h3 className="mt-7 font-display text-2xl text-ink">{pillar.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{pillar.text}</p></div>)}</div></div></section>
      <section className="bg-cream py-16 md:py-24"><div className="container grid gap-10 lg:grid-cols-[.9fr_1.1fr]"><div><p className="eyebrow text-gold-dark">A deliberate journey</p><h2 className="section-title mt-4">From first profile to meaningful conversation.</h2><p className="mt-5 max-w-md leading-7 text-muted-foreground">No public social feed. No one-sided access to private conversations. Just a clear, guided way to get to know someone with care.</p><Link href="/how-it-works" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:gap-3">Explore the member journey <ArrowRight size={16} /></Link></div><ol className="journey-list"><JourneyStep number="01" title="Build a considered profile" text="Share the details that matter to you, with clear controls over who can see them." /><JourneyStep number="02" title="Discover with intention" text="Use thoughtful filters and member information to make an informed choice." /><JourneyStep number="03" title="Connect only when it is mutual" text="Messages open only after a sincere interest is accepted by both members." /></ol></div></section>
      <section className="pb-16 md:pb-24"><div className="container"><div className="cta-panel"><div><p className="eyebrow text-gold">For Gambians, wherever life has taken you</p><h2 className="mt-4 font-display text-4xl text-cream md:text-5xl">Your next chapter deserves care.</h2><p className="mt-5 max-w-xl text-cream/68">Create your profile and begin a journey shaped around trust, faith, family, and lasting commitment.</p></div><Button asChild size="lg" className="btn-gold shrink-0"><Link href="/register">Create your profile <ArrowRight size={17} /></Link></Button></div></div></section>
    </main>
  </PublicLayout>;
}

function JourneyStep({ number, title, text }: { number: string; title: string; text: string }) { return <li className="journey-item"><span>{number}</span><div><h3 className="font-display text-2xl text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div></li>; }
