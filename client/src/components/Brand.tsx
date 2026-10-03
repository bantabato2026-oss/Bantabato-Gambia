import { useState } from "react";
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
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Link
      href="/"
      className={`brand-wordmark ${inverse ? "brand-wordmark-inverse" : ""} ${hoverMotion ? "brand-wordmark-hover" : ""}`}
      aria-label="Bantabato home"
    >
      <span
        className={`brand-logo-fallback ${imageLoaded ? "brand-logo-fallback-hidden" : ""}`}
        aria-hidden={imageLoaded}
      >
        Bantabato
      </span>
      <img
        src={OFFICIAL_BANTABATO_LOGO}
        alt="Bantabato"
        aria-hidden={!imageLoaded}
        width={1536}
        height={1024}
        decoding="async"
        className="brand-logo-image"
        style={{
          visibility: imageLoaded && !imageFailed ? "visible" : "hidden",
        }}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageFailed(true)}
      />
    </Link>
  );
}
