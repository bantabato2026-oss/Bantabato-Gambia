const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const EBML_SIGNATURE = [0x1a, 0x45, 0xdf, 0xa3];

function startsWithBytes(buffer: Buffer, signature: number[], offset = 0) {
  return buffer.length >= offset + signature.length && signature.every((byte, index) => buffer[offset + index] === byte);
}

function asciiAt(buffer: Buffer, offset: number, value: string) {
  return buffer.length >= offset + value.length && buffer.subarray(offset, offset + value.length).toString("ascii") === value;
}

export function hasExpectedFileSignature(buffer: Buffer, mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return startsWithBytes(buffer, JPEG_SIGNATURE);
    case "image/png":
      return startsWithBytes(buffer, PNG_SIGNATURE);
    case "image/webp":
      return asciiAt(buffer, 0, "RIFF") && asciiAt(buffer, 8, "WEBP");
    case "application/pdf":
      return asciiAt(buffer, 0, "%PDF-");
    case "audio/webm":
      return startsWithBytes(buffer, EBML_SIGNATURE);
    case "audio/ogg":
      return asciiAt(buffer, 0, "OggS");
    case "audio/mp4":
      return asciiAt(buffer, 4, "ftyp");
    case "audio/mpeg":
      return asciiAt(buffer, 0, "ID3") || (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
    default:
      return false;
  }
}

export function assertExpectedFileSignature(buffer: Buffer, mimeType: string) {
  if (!hasExpectedFileSignature(buffer, mimeType)) {
    throw new Error("The file contents do not match the selected file type");
  }
}
