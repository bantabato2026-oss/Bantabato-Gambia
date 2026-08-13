import { MemberShell } from "@/components/MemberShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CircleAlert, HeartHandshake, ImageOff, LockKeyhole, MessageCircle, Send, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export function MemberProfileDetailPage({ profileId }: { profileId: number }) {
  const profile = trpc.profile.view.useQuery({ profileId });
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const [, setLocation] = useLocation();
  const sendInterest = trpc.interests.send.useMutation({ onSuccess: () => setLocation("/app/matches") });
  const report = trpc.safety.report.useMutation();
  const block = trpc.safety.block.useMutation({ onSuccess: () => { utils.discovery.list.invalidate(); setLocation("/app/discover"); } });
  const member = profile.data;

  return <MemberShell eyebrow="Member profile" title={member?.displayName || "Considered profile"} description="Review the details a member has chosen to share. You control whether to send an introduction request.">
    {profile.isLoading ? <div className="h-96 animate-pulse rounded-[1.5rem] bg-forest/8" /> : !member ? <div className="empty-state"><ShieldAlert size={25} /><h2 className="mt-6 font-display text-3xl">This profile is unavailable.</h2><p className="mt-3 text-sm text-muted-foreground">The member may be hidden, paused, or no longer eligible for discovery.</p></div> : <div className="grid gap-7 xl:grid-cols-[1.1fr_.9fr]">
      <section className="surface-card">
        <div className="profile-photo-placeholder"><ImageOff size={26} /><span>{member.hasMutualMatch ? "Photos may be shown according to the member’s settings" : "Photos remain private until a mutual match"}</span></div>
        <div className="mt-7 flex flex-wrap gap-2">{[member.religion, member.practiceLevel, member.educationLevel, member.profession, member.tribe].filter(Boolean).map(tag => <Badge key={tag} variant="outline" className="border-forest/15 bg-cream text-forest">{tag}</Badge>)}</div>
        <h2 className="mt-7 font-display text-3xl text-ink">About this member</h2>
        <p className="mt-3 leading-7 text-muted-foreground">{member.about || "This member has chosen not to add a written introduction yet."}</p>
        <div className="mt-7 grid gap-4 border-t border-forest/10 pt-7 sm:grid-cols-2"><Detail label="Location" value={[member.city, member.country].filter(Boolean).join(", ") || (member.residenceType === "gambia" ? "The Gambia" : "Gambian diaspora")} /><Detail label="Marriage timeline" value={member.marriageTimeline || "To be discussed"} /><Detail label="Relocation" value={member.relocationWillingness?.replace(/_/g, " ") || "To be discussed"} /><Detail label="Family background" value={member.familyBackground || "Private until a permitted connection is established"} /></div>
      </section>
      <aside className="space-y-5">
        <section className="surface-card"><div className="icon-plate"><HeartHandshake size={20} /></div><h2 className="mt-6 font-display text-3xl">Send an introduction.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">A respectful note is optional. Messaging stays unavailable unless this member accepts the request and a mutual match is created.</p><Textarea value={note} onChange={event => setNote(event.target.value)} maxLength={500} className="mt-5 min-h-28 bg-cream/50" placeholder="A brief, considerate introduction (optional)" /><Button onClick={() => sendInterest.mutate({ recipientProfileId: profileId, message: note || undefined })} disabled={sendInterest.isPending} className="mt-4 w-full btn-forest">{sendInterest.isPending ? "Sending…" : "Send introduction request"} <Send size={16} /></Button></section>
        <section className="surface-card"><div className="flex gap-3"><LockKeyhole className="shrink-0 text-gold-dark" size={19} /><div><p className="text-sm font-semibold text-ink">Privacy respected</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Protected photos and family details are never force-revealed by an interest request.</p></div></div></section>
        <section className="surface-card"><p className="text-sm font-semibold text-ink">Safety controls</p><p className="mt-2 text-xs leading-5 text-muted-foreground">You can remove this profile from your experience or flag a concern for the Trust & Safety team.</p><div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => report.mutate({ reportedProfileId: profileId, reason: "other" })} variant="outline" size="sm"><CircleAlert size={15} /> Report</Button><Button onClick={() => block.mutate({ blockedProfileId: profileId })} variant="outline" size="sm" className="text-destructive hover:text-destructive"><ShieldAlert size={15} /> Block</Button></div></section>
      </aside>
    </div>}
  </MemberShell>;
}

export function MessageThreadPage({ conversationId }: { conversationId: number }) {
  const messages = trpc.messaging.messages.useQuery({ conversationId });
  const conversations = trpc.messaging.conversations.useQuery();
  const utils = trpc.useUtils();
  const [body, setBody] = useState("");
  const send = trpc.messaging.sendText.useMutation({ onSuccess: () => { setBody(""); utils.messaging.messages.invalidate({ conversationId }); utils.messaging.conversations.invalidate(); } });
  const report = trpc.safety.report.useMutation();
  const profile = trpc.profile.mine.useQuery();
  const block = trpc.safety.block.useMutation();
  const conversation = conversations.data?.find(item => item.id === conversationId);
  const otherProfileId = conversation && profile.data ? (conversation.match?.memberOneProfileId === profile.data.id ? conversation.match.memberTwoProfileId : conversation.match?.memberOneProfileId) : undefined;

  return <MemberShell eyebrow="Private conversation" title={conversation?.match?.otherProfile?.displayName || "Your mutual match"} description="A respectful space available because both members chose to connect.">
    <section className="surface-card overflow-hidden p-0"><div className="flex items-center justify-between border-b border-forest/10 px-6 py-5"><div className="flex items-center gap-3"><div className="icon-plate"><MessageCircle size={18} /></div><div><p className="text-sm font-semibold text-ink">Private mutual match</p><p className="mt-1 text-xs text-muted-foreground">Messages are visible only to you and this member.</p></div></div><div className="flex gap-1"><Button onClick={() => report.mutate({ conversationId, reason: "other" })} variant="ghost" size="sm" className="text-muted-foreground"><CircleAlert size={15} /> Report</Button>{otherProfileId ? <Button onClick={() => block.mutate({ blockedProfileId: otherProfileId })} variant="ghost" size="sm" className="text-destructive hover:text-destructive"><ShieldAlert size={15} /> Block</Button> : null}</div></div><div className="message-thread">{messages.isLoading ? <div className="h-20 animate-pulse rounded-2xl bg-forest/8" /> : messages.data?.length ? messages.data.map(message => <div key={message.id} className="message-bubble"><p>{message.body}</p><span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>) : <div className="py-10 text-center"><ShieldCheck className="mx-auto text-gold-dark" size={24} /><p className="mt-4 font-display text-2xl text-ink">Begin with courtesy.</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">This private conversation opened only after a mutual match. Keep communication respectful and report any concern when needed.</p></div>}</div><form onSubmit={event => { event.preventDefault(); if (body.trim()) send.mutate({ conversationId, body: body.trim() }); }} className="border-t border-forest/10 bg-cream/50 p-4"><div className="flex gap-3"><Textarea value={body} onChange={event => setBody(event.target.value)} maxLength={2000} className="min-h-[52px] resize-none bg-white" placeholder="Write a respectful message…" /><Button type="submit" disabled={send.isPending || !body.trim()} className="btn-forest self-end"><Send size={16} /></Button></div><p className="mt-2 text-xs text-muted-foreground">Voice notes and approved media are planned extension points; text messages are available in this foundation.</p></form></section>
  </MemberShell>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] font-semibold uppercase tracking-[.13em] text-gold-dark">{label}</p><p className="mt-1 text-sm capitalize leading-6 text-ink">{value}</p></div>; }
