import { MemberShell } from "@/components/MemberShell";
import { ProfileReadinessPanel } from "@/components/ProfileReadinessPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatePanel, StateSkeleton } from "@/components/StatePanel";
import { useNetworkState } from "@/hooks/useDeviceExperience";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock3, FileUp, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type DocumentType = "national_id" | "passport";

export default function VerificationCenter() {
  const profile = trpc.profile.mine.useQuery();
  const profilePresent = Boolean(profile.data?.id);
  const summary = trpc.verification.summary.useQuery(undefined, { enabled: profilePresent });
  const utils = trpc.useUtils();
  const network = useNetworkState();
  const [documentType, setDocumentType] = useState<DocumentType>("national_id");
  const [file, setFile] = useState<File | null>(null);
  const [fileReadError, setFileReadError] = useState("");
  const [submissionFeedback, setSubmissionFeedback] = useState("");
  const upload = trpc.uploads.uploadIdentityDocument.useMutation({
    onSuccess: result => {
      void utils.verification.summary.invalidate();
      void utils.profile.mine.invalidate();
      setFile(null);
      const message = result.duplicate
        ? "Your existing private document is already in review. No duplicate was created."
        : "Your document was submitted for private manual review.";
      setSubmissionFeedback(message);
      toast.success(message);
    },
  });
  const latestIdentityRecord = summary.data?.find(item => item.verificationType === "identity_document");
  const eligibility = profile.data?.eligibility;
  const identityApproved = latestIdentityRecord?.status === "approved";
  const pending = Boolean(latestIdentityRecord && ["submitted", "under_review", "escalated"].includes(latestIdentityRecord.status));
  const canSubmit = !identityApproved && !pending;
  const latestStatus = verificationStatusCopy(latestIdentityRecord?.status, !latestIdentityRecord && !eligibility?.profileComplete);

  const selectFile = (candidate: File | null) => {
    setSubmissionFeedback("");
    setFileReadError("");
    if (!candidate) { setFile(null); return; }
    if (!["image/jpeg", "image/png", "application/pdf"].includes(candidate.type)) { setFile(null); setFileReadError("Choose a JPG, PNG, or PDF document."); return; }
    if (candidate.size > 10 * 1024 * 1024) { setFile(null); setFileReadError("This document is larger than 10 MB. Choose a smaller file and try again."); return; }
    setFile(candidate);
  };

  const submit = async () => {
    if (!file || !canSubmit) return;
    if (network === "offline") { setFileReadError("You appear to be offline. Your selected file stays only on this page; reconnect and retry when ready."); return; }
    setSubmissionFeedback("");
    setFileReadError("");
    try {
      const dataUrl = await readAsDataUrl(file);
      upload.mutate({ documentType, dataUrl });
    } catch {
      setFileReadError("We couldn’t prepare that file for private review. Choose the file again or try another supported document.");
    }
  };

  if (profile.isLoading || (profilePresent && summary.isLoading)) return <MemberShell eyebrow="Verification" title="Trust, reviewed with care." description="Preparing your manual verification status."><StateSkeleton label="Loading your verification status…" /></MemberShell>;
  if (!profilePresent) return <MemberShell eyebrow="Verification" title="Trust, reviewed with care." description="Identity documents can be submitted only after you have started your private member profile."><StatePanel kind="empty" title="Start your profile before verification." description="Complete your private profile foundation first. No document, verification record, or review request has been created." action={<Button className="btn-forest" onClick={() => window.location.assign("/app/onboarding")}>Start profile</Button>} /></MemberShell>;
  if (summary.isError || profile.isError) return <MemberShell eyebrow="Verification" title="Trust, reviewed with care." description="Your private review history has not been shown."><StatePanel kind="error" title="Verification status is unavailable right now." description="No verification result has changed. Please try again." action={<Button onClick={() => { void summary.refetch(); void profile.refetch(); }} className="btn-forest">Try again</Button>} /></MemberShell>;
  const records = summary.data ?? [];

  return <MemberShell eyebrow="Verification" title="Trust, reviewed with care." description="A verified indicator is available only after a qualified administrator completes a private identity-document review. It confirms that review only; it does not guarantee another member’s conduct, compatibility, or outcome.">
    <div className="grid gap-7 xl:grid-cols-[1fr_.9fr]">
      <section className="verification-panel" aria-live="polite"><ShieldCheck size={31} className="text-gold" /><p className="mt-7 text-xs font-semibold uppercase tracking-[.16em] text-gold">Identity status</p><h2 className="mt-3 font-display text-4xl text-cream">{latestStatus.title}</h2><p className="mt-4 max-w-xl text-sm leading-6 text-cream/70">{latestStatus.description}</p><div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-cream/80">{identityApproved ? <CheckCircle2 size={15} className="text-gold" /> : pending ? <Clock3 size={15} className="text-gold" /> : <ShieldCheck size={15} className="text-gold" />}{latestStatus.label}</div></section>
      <section className="surface-card"><p className="eyebrow text-gold-dark">Secure document submission</p><h2 className="mt-3 font-display text-3xl">{latestStatus.resubmission ? "Submit an updated ID." : "Submit a valid ID."}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Accepted formats: JPG, PNG, or PDF, up to 10 MB. Your document is private and is never shown as profile content. No document preview is loaded automatically after upload.</p>{pending ? <div className="mt-5 rounded-xl bg-gold/10 p-4 text-sm leading-6 text-ink">A private review is already open. You cannot submit another identity document until staff completes, requests a resubmission, or provides a member-safe outcome.</div> : identityApproved ? <div className="mt-5 rounded-xl bg-forest/5 p-4 text-sm leading-6 text-ink">Your current identity-document review is approved. A new document is not needed unless Bantabato asks you to update it through a member-safe message.</div> : <><div className="mt-6 space-y-4"><div><Label htmlFor="id-type">Document type</Label><Select value={documentType} onValueChange={value => setDocumentType(value as DocumentType)}><SelectTrigger id="id-type" className="mt-2 bg-cream/45"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="national_id">National ID</SelectItem><SelectItem value="passport">Passport</SelectItem></SelectContent></Select></div><div><Label htmlFor="identity-document">Private identity document</Label><input id="identity-document" type="file" accept="image/jpeg,image/png,application/pdf" aria-describedby="identity-document-help identity-document-status" onChange={event => selectFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-xl border border-dashed border-forest/20 bg-cream/50 px-3 py-3 text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-forest file:px-3 file:py-2 file:text-xs file:font-semibold file:text-cream" /><p id="identity-document-help" className="mt-2 text-xs leading-5 text-muted-foreground">Only the member, authorized verification reviewers, and narrowly scoped private storage can access this document. It is not shown in discovery, messages, Family Circle, profile preview, stories, notifications, exports, or ordinary staff summaries.</p></div>{file ? <div id="identity-document-status" role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream p-3 text-xs text-forest"><span>Selected privately on this page: {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span><Button type="button" size="sm" variant="ghost" disabled={upload.isPending} onClick={() => { setFile(null); setFileReadError(""); setSubmissionFeedback(""); }}><X size={14} />Clear selected file</Button></div> : <p id="identity-document-status" className="sr-only">No document selected.</p>}</div><Button onClick={submit} disabled={!file || upload.isPending || !canSubmit || network === "offline"} className="mt-6 btn-forest">{upload.isPending ? "Uploading privately…" : upload.error && file ? "Retry private submission" : latestStatus.resubmission ? "Submit updated document" : "Submit for manual review"} <FileUp size={16} /></Button>{upload.isPending ? <p role="status" className="mt-3 text-sm text-muted-foreground">Preparing and submitting your private document. Keep this page open; no profile content or verification result has changed yet.</p> : null}{network === "offline" ? <p role="status" className="mt-3 text-sm text-gold-dark">You appear to be offline. The selected document stays only on this page until you reconnect.</p> : null}</>}{submissionFeedback ? <StatePanel kind="success" title="Private submission received." description={submissionFeedback} className="mt-4" /> : null}{fileReadError ? <StatePanel kind="error" title="Your document was not submitted." description={fileReadError} className="mt-4" /> : null}{upload.error ? <StatePanel kind="error" title="Your document was not submitted." description="No verification result has changed. Your selected file remains on this page so you can retry when you are ready." className="mt-4" /> : null}</section>
    </div>
    <section className="surface-card mt-7"><p className="eyebrow text-gold-dark">What happens next</p><h2 className="mt-3 font-display text-3xl">A clear, private review path.</h2><div className="mt-6 grid gap-4 md:grid-cols-3"><Lifecycle title="1. Submit privately" detail="Choose a supported document. The system prevents a duplicate while a current review is open." /><Lifecycle title="2. Manual review" detail="An authorized reviewer can approve, ask for a new document, reject according to policy, or continue private review." /><Lifecycle title="3. Factual outcome" detail="You see only the member-safe status and next action. Private reviewer notes and document details stay protected." /></div></section>
    <section className="surface-card mt-7"><div className="flex gap-3"><ShieldAlert className="shrink-0 text-gold-dark" size={21} /><div><p className="eyebrow text-gold-dark">Use verification wisely</p><h2 className="mt-2 font-display text-3xl text-ink">One layer of protection, not a guarantee.</h2></div></div><p className="mt-4 max-w-4xl text-sm leading-6 text-muted-foreground">Identity review confirms only the outcome of Bantabato’s manual document review. Continue to exercise judgment, never send money because of a verification indicator, protect private information, and use block or reporting controls when something feels wrong.</p><Button asChild variant="outline" className="mt-5"><Link href="/app/safety">Review Safety Center guidance</Link></Button></section>
    <section className="surface-card mt-7"><p className="eyebrow text-gold-dark">Review history</p><h2 className="mt-3 font-display text-3xl">Clear, manual status.</h2><div className="mt-6 space-y-3">{records.length ? records.map(item => { const copy = verificationStatusCopy(item.status); return <div className="rounded-2xl bg-cream p-4" key={item.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold capitalize text-ink">{item.verificationType.replace("_", " ")}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.description}{item.memberMessage ? ` · ${item.memberMessage}` : ""}</p></div><Badge className="badge-quiet">{copy.label}</Badge></div>{copy.resubmission ? <p className="mt-3 rounded-xl bg-gold/10 p-3 text-xs leading-5 text-ink">You may submit another supported document when ready. Staff review details and internal safety information are not shown here.</p> : null}</div>; }) : <p className="rounded-2xl bg-cream/60 p-5 text-sm leading-6 text-muted-foreground">There are no verification submissions yet. No development or mock state is presented as a real verification.</p>}</div></section>
    <ProfileReadinessPanel className="mt-7" eligibility={eligibility} verificationStatus={latestIdentityRecord?.status} hasPreferences={Boolean(profile.data?.completeness?.hasPreferences)} />
  </MemberShell>;
}

function Lifecycle({ title, detail }: { title: string; detail: string }) { return <div className="rounded-2xl bg-cream p-5"><p className="text-sm font-semibold text-ink">{title}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p></div>; }
function readAsDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("The selected file could not be read")); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); }); }
function verificationStatusCopy(status?: string, requirementsIncomplete = false) { const normalized = status?.toLowerCase(); if (normalized === "approved") return { title: "Identity verified", label: "Approved after manual review", description: "Your identity document was approved after manual review. This indicator is factual and is not a safety, compatibility, or outcome guarantee.", resubmission: false }; if (normalized === "requires_resubmission") return { title: "Changes required", label: "Resubmission available", description: "A supported replacement document is needed before verification can continue. Private reviewer detail is not shown here.", resubmission: true }; if (normalized === "rejected") return { title: "Verification not approved", label: "A new submission is available", description: "This document was not approved according to current policy. You may submit another supported document when ready; private review information is not shown here.", resubmission: true }; if (normalized === "expired") return { title: "A current document is needed", label: "Resubmission available", description: "This document can no longer support verification. You may submit a current supported document when ready.", resubmission: true }; if (normalized === "restricted") return { title: "Verification is temporarily unavailable", label: "Unavailable or restricted", description: "Verification is not available to this account right now. No internal review detail is shown here.", resubmission: false }; if (normalized === "escalated") return { title: "Additional review is in progress", label: "Additional review", description: "Your document needs an additional private manual review. No internal review detail is shown here.", resubmission: false }; if (normalized === "under_review") return { title: "Review in progress", label: "Pending manual review", description: "Your document is in a private manual review queue. A submission does not create a badge.", resubmission: false }; if (normalized === "submitted") return { title: "Submission received", label: "Awaiting manual review", description: "Your private document was received and is waiting for a manual review. A duplicate submission is unavailable while the review is open.", resubmission: false }; if (requirementsIncomplete) return { title: "Profile requirements in progress", label: "Requirements incomplete", description: "You can learn about private identity review now. Required profile details and five approved photos are evaluated separately for discovery readiness.", resubmission: false }; return { title: "Ready for manual review", label: "Ready to submit", description: "Submit a National ID or Passport only when you are ready. The document is stored privately for manual review and is never shown as profile content.", resubmission: false }; }
