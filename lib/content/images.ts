import { readFileSync } from "node:fs";
import path from "node:path";

// The pictures the words carry: the old posts', the work's screenshots, a chapter's figures. Each
// lives in public/ (scripts/validate-content.ts checks it is there), and each <img> leaves here
// with its width and height, read from the file's own header, so the page keeps its shape while
// a picture arrives; it loads lazily and decodes off the main thread. On the home page's surface a
// phase's pictures also wait for the phase to set in (app/surface.css), so a lazy picture the zoom
// has drawn small inside the screen isn't fetched for a phase nobody has reached.

type Size = { width: number; height: number };
const PUBLIC = path.join(process.cwd(), "public");
const sizes = new Map<string, Size | null>();

/** a picture's size in pixels, from its header (PNG, JPEG, GIF, WebP); null when it can't be read */
export function imageSize(src: string): Size | null {
  if (sizes.has(src)) return sizes.get(src)!;
  let size: Size | null = null;
  try {
    if (src.startsWith("/") && !src.includes("..")) size = measure(readFileSync(path.join(PUBLIC, decodeURIComponent(src))));
  } catch {
    size = null;
  }
  sizes.set(src, size);
  return size;
}

function measure(b: Buffer): Size | null {
  // PNG: the IHDR chunk follows the signature
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  // GIF
  if (b.length > 10 && b.toString("latin1", 0, 3) === "GIF") return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  // WebP: lossy, lossless or extended
  if (b.length > 30 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") {
    const kind = b.toString("latin1", 12, 16);
    if (kind === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (kind === "VP8L") {
      const [b0, b1, b2, b3] = [b[21], b[22], b[23], b[24]];
      return { width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
    }
    if (kind === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    return null;
  }
  // JPEG: walk the markers to the first start-of-frame
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === 0xff) { i += m === 0xff ? 1 : 2; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/** every <img> in a piece of HTML loads lazily, decodes off the main thread and says its size; an
 *  image that already says how it loads, or how big it is, keeps that */
export function imageAttrs(html: string) {
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    let out = tag.replace(/\s*\/?>$/, "");
    if (!/\sloading=/.test(out)) out += ' loading="lazy"';
    if (!/\sdecoding=/.test(out)) out += ' decoding="async"';
    const src = attr(out, "src"), size = src ? imageSize(src) : null;
    if (size && !/\swidth=/.test(out) && !/\sheight=/.test(out)) out += ` width="${size.width}" height="${size.height}"`;
    return out + (tag.endsWith("/>") ? " />" : ">");
  });
}
