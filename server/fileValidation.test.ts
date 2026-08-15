import { describe, expect, it } from "vitest";
import { assertExpectedFileSignature, hasExpectedFileSignature } from "./fileValidation";

describe("server-side file signature validation", () => {
  it("accepts the declared binary signatures for allowed private upload formats", () => {
    expect(hasExpectedFileSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg")).toBe(true);
    expect(hasExpectedFileSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true);
    expect(hasExpectedFileSignature(Buffer.from("RIFF1234WEBPVP8 "), "image/webp")).toBe(true);
    expect(hasExpectedFileSignature(Buffer.from("%PDF-1.7"), "application/pdf")).toBe(true);
    expect(hasExpectedFileSignature(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), "audio/webm")).toBe(true);
    expect(hasExpectedFileSignature(Buffer.from("OggS"), "audio/ogg")).toBe(true);
    expect(hasExpectedFileSignature(Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), "audio/mp4")).toBe(true);
    expect(hasExpectedFileSignature(Buffer.from("ID3"), "audio/mpeg")).toBe(true);
  });

  it("rejects a client-declared MIME type whose binary content is not that type", () => {
    const script = Buffer.from("<script>alert('not an image')</script>");
    expect(hasExpectedFileSignature(script, "image/jpeg")).toBe(false);
    expect(hasExpectedFileSignature(script, "application/pdf")).toBe(false);
    expect(() => assertExpectedFileSignature(script, "audio/ogg")).toThrow(/contents do not match/i);
  });
});
