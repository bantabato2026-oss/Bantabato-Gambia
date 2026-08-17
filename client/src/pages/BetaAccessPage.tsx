import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function BetaAccessPage() {
  const { isAuthenticated, loading } = useAuth();
  const status = trpc.beta.status.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const [invitationCode, setInvitationCode] = useState("");
  const accept = trpc.beta.acceptInvitation.useMutation({
    onSuccess: () => { utils.beta.status.invalidate(); utils.profile.mine.invalidate(); setInvitationCode(""); toast.success("Beta enrollment confirmed."); },
    onError: error => toast.error(error.message),
  });
  if (loading) return <main className="app-loading" />;
  if (!isAuthenticated) return <main className="app-guard"><div className="app-guard-card"><LockKeyhole className="text-gold-dark" /><h1 className="mt-6 font-display text-4xl text-ink">Invite-only beta.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Sign in with the exact email address that received your invitation. Access is checked on the server.</p><Button className="mt-7 w-full btn-forest" onClick={() => startLogin()}>Sign in securely</Button></div></main>;
  const enrolled = status.data?.enrollment?.status === "enrolled";
  if (enrolled) return <main className="app-guard"><div className="app-guard-card"><CheckCircle2 className="text-forest" /><h1 className="mt-6 font-display text-4xl text-ink">Beta access confirmed.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Your beta enrollment does not change verification, privacy, safety, consent, or relationship requirements.</p><Link href="/app" className="mt-7 inline-flex btn-forest">Continue to Bantabato</Link></div></main>;
  return <main className="app-guard"><div className="app-guard-card"><LockKeyhole className="text-gold-dark" /><p className="eyebrow text-gold-dark">Closed beta</p><h1 className="mt-3 font-display text-4xl text-ink">Use your invitation.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Invitation codes are one-time, email-bound, and expire. Do not share a code or enter it anywhere else.</p><Label className="mt-7 block" htmlFor="beta-code">Invitation code</Label><Input id="beta-code" className="mt-2 bg-cream/40" value={invitationCode} onChange={event => setInvitationCode(event.target.value)} autoComplete="one-time-code" /><Button className="mt-4 w-full btn-forest" disabled={accept.isPending || invitationCode.trim().length < 16} onClick={() => accept.mutate({ invitationCode: invitationCode.trim() })}>Confirm beta invitation</Button><p className="mt-5 text-xs leading-5 text-muted-foreground">Mode: {status.data?.mode?.replace(/_/g, " ") ?? "checking"}. If your invitation is unavailable, contact the person who invited you; support cannot recover or display the code.</p></div></main>;
}
