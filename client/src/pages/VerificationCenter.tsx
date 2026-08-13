import { MemberShell } from "@/components/MemberShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { FileUp, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function VerificationCenter() {
  const summary = trpc.verification.summary.useQuery();
  const utils = trpc.useUtils();
  const upload = trpc.uploads.uploadIdentityDocument.useMutation({ onSuccess: () => { utils.verification.summary.invalidate(); setFile(null); } });
  const [documentType, setDocumentType] = useState<"national_id" | "passport">("national_id");
  const [file, setFile] = useState<File | null>(null);
  const identityApproved = summary.data?.some(item => item.verificationType === "identity_document" && item.status === "approved");
  const pending = summary.data?.some(item => item.verificationType === "identity_document" && ["submitted", "under_review"].includes(item.status));

  const submit = async () => {
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    upload.mutate({ documentType, dataUrl });
  };

  return <MemberShell eyebrow="Verification" title="Trust, reviewed with care." description="A verification badge can only be issued after a qualified administrator completes a manual review.">
    <div className="grid gap-7 xl:grid-cols-[1fr_.9fr]">
      <section className="verification-panel"><ShieldCheck size={31} className="text-gold" /><p className="mt-7 text-xs font-semibold uppercase tracking-[.16em] text-gold">Identity status</p><h2 className="mt-3 font-display text-4xl text-cream">{identityApproved ? "Identity verified" : pending ? "Review in progress" : "Ready for manual review"}</h2><p className="mt-4 max-w-xl text-sm leading-6 text-cream/70">{identityApproved ? "Your approved identity-document review supports a verified badge on your profile." : pending ? "Your document is held in a private review queue. The badge remains unavailable until an administrator approves it." : "Submit a National ID or Passport only when you are ready. The document is stored privately for manual review and is never shown as profile content."}</p></section>
      <section className="surface-card"><p className="eyebrow text-gold-dark">Secure document submission</p><h2 className="mt-3 font-display text-3xl">Submit a valid ID.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Accepted formats: JPG, PNG, or PDF, up to 10 MB. Uploading a document does not grant a badge.</p><div className="mt-6 space-y-4"><div><Label htmlFor="id-type">Document type</Label><Select value={documentType} onValueChange={value => setDocumentType(value as "national_id" | "passport")}><SelectTrigger id="id-type" className="mt-2 bg-cream/45"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="national_id">National ID</SelectItem><SelectItem value="passport">Passport</SelectItem></SelectContent></Select></div><div><Label htmlFor="identity-document">Private identity document</Label><input id="identity-document" type="file" accept="image/jpeg,image/png,application/pdf" onChange={event => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-xl border border-dashed border-forest/20 bg-cream/50 px-3 py-3 text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-forest file:px-3 file:py-2 file:text-xs file:font-semibold file:text-cream" /></div>{file ? <p className="text-xs text-forest">Selected: {file.name}</p> : null}</div><Button onClick={submit} disabled={!file || upload.isPending} className="mt-6 btn-forest">{upload.isPending ? "Uploading securely…" : "Submit for manual review"} <FileUp size={16} /></Button>{upload.error ? <p className="mt-3 text-sm text-destructive">{upload.error.message}</p> : null}</section>
    </div>
    <section className="surface-card mt-7"><p className="eyebrow text-gold-dark">Review history</p><h2 className="mt-3 font-display text-3xl">Clear, manual status.</h2><div className="mt-6 space-y-3">{summary.data?.length ? summary.data.map(item => <div className="flex items-center justify-between rounded-2xl bg-cream p-4" key={item.id}><div><p className="text-sm font-semibold capitalize text-ink">{item.verificationType.replace("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{item.submittedAt ? "Submitted for review" : "Not started"}{item.memberMessage ? ` · ${item.memberMessage}` : ""}</p></div><Badge className="badge-quiet">{item.status.replace("_", " ")}</Badge></div>) : <p className="rounded-2xl bg-cream/60 p-5 text-sm leading-6 text-muted-foreground">There are no verification submissions yet. No development or mock state is presented as a real verification.</p>}</div></section>
  </MemberShell>;
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected file could not be read"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
