import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Compass, Home } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page not found — Bantabato";
    document.head
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute(
        "content",
        "This Bantabato page is unavailable. Return to the public home page or explore how the service works."
      );
    document.head
      .querySelector<HTMLMetaElement>('meta[name="robots"]')
      ?.setAttribute("content", "noindex,nofollow,noarchive");
  }, []);

  return (
    <PublicLayout>
      <main className="public-page" aria-labelledby="not-found-title">
        <div className="container flex min-h-[62vh] items-center justify-center py-16">
          <section className="w-full max-w-2xl rounded-[1.75rem] border border-forest/10 bg-white p-8 text-center shadow-[0_18px_55px_rgba(21,58,45,.07)] sm:p-12">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream text-gold-dark"
              aria-hidden="true"
            >
              <Compass size={30} />
            </div>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[.18em] text-gold-dark">
              A quiet detour
            </p>
            <h1
              id="not-found-title"
              className="mt-4 font-display text-5xl leading-none text-ink sm:text-6xl"
            >
              That page isn’t here.
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              The link may be outdated or the page may have moved. No member,
              account, message, or private route information is shown here.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild className="btn-forest">
                <Link href="/">
                  <Home size={16} /> Return home
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-forest/20 bg-white text-forest hover:bg-forest/5"
              >
                <Link href="/how-it-works">
                  <ArrowLeft size={16} /> How it works
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
