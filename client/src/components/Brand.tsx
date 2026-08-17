import { Link } from "wouter";

const OFFICIAL_BANTABATO_LOGO = "/manus-storage/public/bantabato-logo-official-f445863c.png";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={`brand-wordmark ${inverse ? "brand-wordmark-inverse" : ""}`} aria-label="Bantabato home">
      <img
        src={OFFICIAL_BANTABATO_LOGO}
        alt="Bantabato"
        width={1536}
        height={1024}
        decoding="async"
        className="brand-logo-image"
      />
    </Link>
  );
}
