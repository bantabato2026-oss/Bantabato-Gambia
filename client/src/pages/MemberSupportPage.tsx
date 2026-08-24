import { MemberShell } from "@/components/MemberShell";
import { StatePanel, StateSkeleton } from "@/components/StatePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNetworkState } from "@/hooks/useDeviceExperience";
import { trpc } from "@/lib/trpc";
import { Headphones, LifeBuoy, RotateCcw, Send, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const categories = [
  ["account_access", "Account access"],
  ["profile", "Profile and onboarding"],
  ["verification", "Verification"],
  ["membership", "Membership"],
  ["payment", "Billing"],
  ["notifications", "Notifications"],
  ["family_circle", "Family Circle"],
  ["technical_issue", "Technical issue"],
  ["safety_concern", "Safety concern"],
  ["other", "Other"],
] as const;

type Category = (typeof categories)[number][0];

type SupportTicket = {
  id: number;
  category: string;
  subject: string;
  description: string;
  status: string;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
};

function statusLabel(status: string) {
  return status === "waiting_for_member" ? "Action required" : status.replace(/_/g, " ");
}

function nextAction(ticket: SupportTicket) {
  if (ticket.status === "waiting_for_member") return "Review the request and follow any member action described here.";
  if (ticket.status === "resolved") return "Review the factual resolution. You can reopen this request if the issue remains.";
  if (ticket.status === "withdrawn") return "This request is withdrawn. Reopen it if you still need help.";
  if (ticket.status === "closed") return "This request is closed. Start a new request if you need help with a different issue.";
  return "Your request is in the support queue. No private messages, documents, or safety evidence are needed here.";
}

export default function MemberSupportPage() {
  const network = useNetworkState();
  const online = network === "online";
  const tickets = trpc.support.mine.useQuery();
  const utils = trpc.useUtils();
  const [category, setCategory] = useState<Category>("other");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const create = trpc.support.create.useMutation({
    onSuccess: result => {
      void utils.support.mine.invalidate();
      setSubject("");
      setDescription("");
      setRequestKey(crypto.randomUUID());
      toast.success(result.duplicate ? "Your existing support request is still open." : "Your support request was received.");
    },
    onError: error => toast.error(error.message || "Your support request was not confirmed. Nothing was submitted unless you see it listed below."),
  });
  const withdraw = trpc.support.withdraw.useMutation({
    onSuccess: () => { void utils.support.mine.invalidate(); toast.success("Your support request was withdrawn."); },
    onError: error => toast.error(error.message || "The request changed before it could be withdrawn. Refresh to review it."),
  });
  const reopen = trpc.support.reopen.useMutation({
    onSuccess: () => { void utils.support.mine.invalidate(); toast.success("Your support request was reopened."); },
    onError: error => toast.error(error.message || "The request changed before it could be reopened. Refresh to review it."),
  });
  const busy = create.isPending || withdraw.isPending || reopen.isPending;
  const submitDisabled = !online || busy || subject.trim().length < 3 || description.trim().length < 10;
  const rows = useMemo(() => (tickets.data ?? []) as SupportTicket[], [tickets.data]);

  if (tickets.isLoading) return <MemberShell eyebrow="Support" title="Help with a clear handoff." description="Review your private support requests and recover safely when a member workflow cannot progress."><StateSkeleton label="Preparing support…" /></MemberShell>;
  if (tickets.isError) return <MemberShell eyebrow="Support" title="Help with a clear handoff." description="Support status is temporarily unavailable. No request or member state was changed."><StatePanel kind="error" title="Support requests are unavailable right now." description="Reconnect and try again. Nothing was submitted or changed." action={<Button className="btn-forest" onClick={() => tickets.refetch()}><RotateCcw size={16} /> Try again</Button>} /></MemberShell>;

  return <MemberShell eyebrow="Support" title="Help with a clear handoff." description="Ask for help with an existing Bantabato workflow. Support can guide you, but it cannot bypass verification, eligibility, safety, privacy, consent, or account security.">
    <div className="space-y-7">
      {!online ? <StatePanel kind="error" title="You’re offline." description="Support requests are not queued while offline. Reconnect before submitting; nothing has been sent." /> : null}
      <div aria-live="polite" className="sr-only">{busy ? "Bantabato is confirming your support request." : ""}</div>
      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="surface-card">
          <div className="flex items-start gap-4"><div className="rounded-2xl bg-gold/15 p-3 text-gold-dark"><Headphones size={22} /></div><div><p className="eyebrow text-gold-dark">Member support</p><h2 className="mt-2 font-display text-3xl text-ink">Tell us what is blocking you.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose the closest category and describe only what is needed. Do not include passwords, payment secrets, identity documents, private messages, or safety evidence.</p></div></div>
          <div className="mt-6 space-y-4">
            <div><Label htmlFor="member-support-category">Category</Label><select id="member-support-category" value={category} onChange={event => setCategory(event.target.value as Category)} disabled={!online || busy} className="mt-2 flex h-10 w-full rounded-md border border-input bg-white px-3 text-sm">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div><Label htmlFor="member-support-subject">Subject</Label><Input id="member-support-subject" value={subject} onChange={event => setSubject(event.target.value)} disabled={!online || busy} className="mt-2 bg-white" placeholder="What do you need help with?" maxLength={200} /></div>
            <div><Label htmlFor="member-support-description">What happened?</Label><Textarea id="member-support-description" value={description} onChange={event => setDescription(event.target.value)} disabled={!online || busy} className="mt-2 min-h-32 bg-white" placeholder="Share the minimum detail needed for a support officer to guide you." maxLength={5000} /></div>
            <Button className="btn-forest" disabled={submitDisabled} onClick={() => create.mutate({ category, subject: subject.trim(), description: description.trim(), idempotencyKey: requestKey })}><Send size={16} /> {create.isPending ? "Confirming…" : "Send support request"}</Button>
          </div>
        </div>
        <div className="space-y-5">
          <section className="surface-card"><LifeBuoy className="text-gold-dark" /><h2 className="mt-4 font-display text-2xl text-ink">Safe recovery first</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Support will direct you back to the correct profile, photo, verification, visibility, account, or discovery recovery step. It cannot create a connection, approve verification, remove a restriction, or expose another member’s private information.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/app/account" className="btn-outline inline-flex items-center">Account Center</Link><Link href="/app/safety" className="btn-outline inline-flex items-center">Safety Center</Link></div></section>
          <section className="surface-card"><ShieldCheck className="text-gold-dark" /><h2 className="mt-4 font-display text-2xl text-ink">What members can expect</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">You see factual request status only. Staff notes, safety evidence, verification documents, private conversations, Family Circle content, and payment credentials stay outside this view.</p></section>
        </div>
      </section>
      <section className="space-y-4"><div><p className="eyebrow text-gold-dark">Your requests</p><h2 className="mt-2 font-display text-3xl text-ink">A private status history.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Only support requests created from this account are shown.</p></div>{rows.length ? <div className="grid gap-4">{rows.map(ticket => <article key={ticket.id} className="surface-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-display text-2xl text-ink">{ticket.subject}</p><p className="mt-1 text-xs uppercase tracking-[.12em] text-gold-dark">{categories.find(([value]) => value === ticket.category)?.[1] ?? "Support"} · updated {new Date(ticket.updatedAt).toLocaleString()}</p></div><span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold capitalize text-ink">{statusLabel(ticket.status)}</span></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{ticket.description}</p>{ticket.resolution ? <div className="mt-4 rounded-xl bg-cream/70 p-4"><p className="text-xs font-semibold uppercase tracking-[.12em] text-gold-dark">Factual resolution</p><p className="mt-2 text-sm leading-6 text-ink">{ticket.resolution}</p></div> : null}<p className="mt-4 text-xs leading-5 text-muted-foreground">{nextAction(ticket)}</p><div className="mt-4 flex flex-wrap gap-2">{["new", "open", "waiting_for_staff", "waiting_for_member", "escalated"].includes(ticket.status) ? <Button variant="outline" disabled={!online || busy} onClick={() => withdraw.mutate({ ticketId: ticket.id, expectedUpdatedAt: ticket.updatedAt })}><X size={15} /> Withdraw request</Button> : null}{["resolved", "withdrawn"].includes(ticket.status) ? <Button variant="outline" disabled={!online || busy} onClick={() => reopen.mutate({ ticketId: ticket.id, expectedUpdatedAt: ticket.updatedAt })}><RotateCcw size={15} /> Reopen request</Button> : null}</div></article>)}</div> : <StatePanel kind="empty" title="No support requests yet." description="If a protected Bantabato workflow cannot progress, choose a category above and send a support-safe request." />}</section>
    </div>
  </MemberShell>;
}
