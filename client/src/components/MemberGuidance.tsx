import { useLocalization } from "@/contexts/LocalizationContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AudioLines, BookOpenText, CheckCircle2, CircleAlert, Languages, RotateCcw, type LucideIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type VoiceGuidanceState = "available" | "unavailable" | "playing" | "paused" | "stopped" | "failed";

const voiceTone: Record<VoiceGuidanceState, "complete" | "action" | "pending"> = {
  available: "complete", unavailable: "action", playing: "pending", paused: "pending", stopped: "action", failed: "action",
};

export function LanguagePreferenceControl({ onChange, compact = false }: { onChange?: (locale: string) => void; compact?: boolean }) {
  const { availableLocales, copy, locale, setLocale } = useLocalization();
  const update = (next: string) => { const result = setLocale(next); onChange?.(result.locale); };
  return <section className={compact ? "rounded-xl bg-cream/60 p-4" : "surface-card"} aria-labelledby="language-preference-title"><div className="flex items-start gap-3"><div className="icon-plate"><Languages size={18} /></div><div className="min-w-0 flex-1"><p className="eyebrow text-gold-dark">Language</p><h2 id="language-preference-title" className={compact ? "mt-1 text-lg font-semibold text-ink" : "mt-2 font-display text-2xl text-ink"}>Choose your reading language</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.language.englishOnly} {copy.language.reviewedOnly}</p><Select value={locale} onValueChange={update}><SelectTrigger className="mt-4 max-w-xs bg-white" aria-label="Language preference"><SelectValue /></SelectTrigger><SelectContent>{availableLocales.map(item => <SelectItem key={item.code} value={item.code}>{item.nativeLabel}</SelectItem>)}</SelectContent></Select><p className="mt-2 text-xs leading-5 text-muted-foreground">{copy.language.saved} This does not change your profile, messages, privacy, or membership.</p></div></div></section>;
}

export function PlainLanguagePanel({ title = "One step at a time", what, why, next, icon: Icon = CheckCircle2, className = "" }: { title?: string; what: string; why: string; next: string; icon?: LucideIcon; className?: string }) {
  return <section className={`rounded-[1.35rem] border border-forest/10 bg-cream/55 p-5 ${className}`} aria-label={title}><div className="flex items-center gap-3"><Icon className="text-gold-dark" size={20} /><h2 className="font-display text-2xl text-ink">{title}</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><GuidanceItem label="What you need" text={what} /><GuidanceItem label="Why it matters" text={why} /><GuidanceItem label="What to do now" text={next} /></div></section>;
}

function GuidanceItem({ label, text }: { label: string; text: string }) { return <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-gold-dark">{label}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>; }

export function VoiceGuidancePanel({ textAlternative, state = "unavailable", onRetry, title = "Guidance by voice and text" }: { textAlternative: string; state?: VoiceGuidanceState; onRetry?: () => void; title?: string }) {
  const { copy } = useLocalization();
  const description = copy.voice[state];
  const tone = voiceTone[state];
  return <section className="rounded-[1.35rem] border border-forest/10 bg-white p-5" aria-labelledby="voice-guidance-title"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="icon-plate"><AudioLines size={19} /></div><div><p className="eyebrow text-gold-dark">Guidance</p><h2 id="voice-guidance-title" className="mt-1 font-display text-2xl text-ink">{title}</h2></div></div><Badge className={tone === "complete" ? "badge-quiet" : "border border-gold/25 bg-gold/10 text-gold-dark"}>{state === "unavailable" ? "Voice unavailable" : state}</Badge></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{description}</p>{state === "failed" && onRetry ? <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}><RotateCcw size={15} /> {copy.voice.retry}</Button> : null}<div className="mt-4 rounded-xl bg-cream/60 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-ink"><BookOpenText size={16} className="text-gold-dark" /> {copy.voice.textAlternative}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{textAlternative}</p></div>{state === "unavailable" ? <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><CircleAlert className="mt-0.5 shrink-0 text-gold-dark" size={14} />No audio is loaded, recorded, or sent from this panel.</p> : null}</section>;
}
