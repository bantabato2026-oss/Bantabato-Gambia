import { Link } from "wouter";

const OFFICIAL_BANTABATO_LOGO =
  "/manus-storage/public/bantabato-logo-official_9a4e6192.png";

export function Brand({
  inverse = false,
  hoverMotion = false,
}: {
  inverse?: boolean;
  hoverMotion?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`brand-wordmark ${inverse ? "brand-wordmark-inverse" : ""} ${hoverMotion ? "brand-wordmark-hover" : ""}`}
      aria-label="Bantabato home"
    >
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
