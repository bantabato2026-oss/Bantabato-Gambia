import { MemberShell } from "@/components/MemberShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Camera, ImagePlus, LockKeyhole } from "lucide-react";
import { useState } from "react";

export default function ProfileMediaPage() {
  const photos = trpc.uploads.profilePhotos.useQuery();
  const utils = trpc.useUtils();
  const upload = trpc.uploads.uploadProfilePhoto.useMutation({ onSuccess: () => { utils.uploads.profilePhotos.invalidate(); setFile(null); } });
  const [file, setFile] = useState<File | null>(null);
  const submit = async () => { if (file) upload.mutate({ dataUrl: await readAsDataUrl(file) }); };
  const photoCount = photos.data?.length ?? 0;
  return <MemberShell eyebrow="Profile photos" title="Photos, on your terms." description="Profile photos are separate from your verification selfie or identity document. You choose when profile photos become visible.">
    <div className="grid gap-7 xl:grid-cols-[1fr_.9fr]">
      <section className="surface-card"><p className="eyebrow text-gold-dark">Photo requirement</p><h2 className="mt-3 font-display text-3xl">{photoCount} of 5 profile photos</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">The current Bantabato direction calls for at least five profile photos before full platform use. This private gallery tracks your progress; photos remain subject to the visibility setting in your profile.</p><div className="mt-7 grid grid-cols-5 gap-2">{Array.from({ length: 5 }, (_, index) => <div key={index} className={`grid aspect-square place-items-center rounded-xl ${index < photoCount ? "bg-forest text-cream" : "border border-dashed border-forest/20 bg-cream text-gold-dark"}`}>{index < photoCount ? <Camera size={16} /> : <span className="text-xs font-semibold">{index + 1}</span>}</div>)}</div><div className="mt-7 rounded-2xl bg-cream p-5"><div className="flex gap-3"><LockKeyhole className="shrink-0 text-gold-dark" size={19} /><div><p className="text-sm font-semibold text-ink">Private by design</p><p className="mt-1 text-xs leading-5 text-muted-foreground">A profile photo is not automatically public. The visibility rule you select in Profile controls permitted viewing, and a verification image is never treated as a public photo.</p></div></div></div></section>
      <section className="surface-card"><p className="eyebrow text-gold-dark">Secure upload</p><h2 className="mt-3 font-display text-3xl">Add a profile photo.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a JPG, PNG, or WebP image up to 8 MB. Uploaded photos are stored privately and await any required review.</p><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setFile(event.target.files?.[0] ?? null)} className="mt-6 block w-full rounded-xl border border-dashed border-forest/20 bg-cream/50 px-3 py-3 text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-forest file:px-3 file:py-2 file:text-xs file:font-semibold file:text-cream" />{file ? <p className="mt-3 text-xs text-forest">Selected: {file.name}</p> : null}<Button onClick={submit} disabled={!file || upload.isPending} className="mt-6 btn-forest">{upload.isPending ? "Uploading securely…" : "Add profile photo"} <ImagePlus size={16} /></Button>{upload.error ? <p className="mt-3 text-sm text-destructive">{upload.error.message}</p> : null}</section>
    </div>
    <section className="surface-card mt-7"><p className="eyebrow text-gold-dark">Private gallery</p><div className="mt-5 flex flex-wrap gap-3">{photos.data?.length ? photos.data.map((photo, index) => <div key={photo.id} className="flex h-24 w-24 flex-col items-center justify-center rounded-2xl bg-cream text-center"><Camera size={19} className="text-gold-dark" /><p className="mt-2 text-[10px] font-semibold uppercase tracking-[.1em] text-forest">Photo {index + 1}</p><Badge className="mt-1 badge-quiet">{photo.reviewStatus}</Badge></div>) : <p className="rounded-2xl bg-cream/60 p-5 text-sm leading-6 text-muted-foreground">No profile photos have been added yet. Start with a clear photo that feels true to you.</p>}</div></section>
  </MemberShell>;
}

function readAsDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("The selected file could not be read")); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); }); }
