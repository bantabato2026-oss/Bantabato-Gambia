import { Link } from "wouter";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  const productionLogo = import.meta.env.VITE_APP_LOGO as string | undefined;
  return (
    <Link href="/" className={`brand-wordmark ${inverse ? "text-cream" : "text-ink"}`} aria-label="Bantabato home">
      {productionLogo ? <img src={productionLogo} alt="Bantabato" className="brand-logo-image" /> : <>Bantabato<span className="brand-dot">.</span></>}
    </Link>
  );
}
