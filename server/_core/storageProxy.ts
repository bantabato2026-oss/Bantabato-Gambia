import type { Express } from "express";
import { ENV } from "./env";

const PUBLIC_STORAGE_PREFIX = "public/";

export function isPublicStorageKey(key: string) {
  return key.startsWith(PUBLIC_STORAGE_PREFIX) && !key.includes("..") && !key.includes("\\");
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    // The proxy is reserved for explicitly public deployment assets. Member
    // photos, verification documents, safety evidence, and voice notes must
    // use an authorized service path that returns a short-lived signed URL.
    if (!key || !isPublicStorageKey(key)) {
      res.status(404).send("Not found");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend is temporarily unavailable");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Storage backend is temporarily unavailable");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage backend is temporarily unavailable");
    }
  });
}
