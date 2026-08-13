import { Link } from "wouter";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={`brand-wordmark ${inverse ? "text-cream" : "text-ink"}`} aria-label="Bantabato home">
      Bantabato<span className="brand-dot">.</span>
    </Link>
  );
}
