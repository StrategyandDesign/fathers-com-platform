import { inflateSync, deflateSync } from "node:zlib";

export const BRAND_LOCKUP_FILE = "public/brand/fathers-com-logo-white.png";

export const FATHERS_FOREST = { r: 0x32, g: 0x66, b: 0x38 };

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

type PngRgba = {
  width: number;
  height: number;
  rgba: Buffer;
};

export function decodePngRgba(bytes: Uint8Array): PngRgba {
  const buf = Buffer.from(bytes);
  if (buf.subarray(0, 8).compare(PNG_SIGNATURE) !== 0) {
    throw new Error("Not a PNG.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];

  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? 0;
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
  }

  if (!width || !height || bitDepth !== 8 || colorType !== 6) {
    throw new Error("Lockup PNG must be 8-bit RGBA.");
  }

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const rgba = Buffer.alloc(height * stride);
  let src = 0;
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[src] ?? 0;
    src += 1;
    const row = raw.subarray(src, src + stride);
    src += stride;
    const dest = rgba.subarray(y * stride, (y + 1) * stride);
    unfilter(filter, row, dest, prev, bpp);
    prev = Buffer.from(dest);
  }

  return { width, height, rgba };
}

export function encodePngRgba(width: number, height: number, rgba: Uint8Array): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const start = y * (stride + 1);
    raw[start] = 0;
    Buffer.from(rgba.subarray(y * stride, (y + 1) * stride)).copy(raw, start + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function tintPngRgba(
  source: Uint8Array,
  color: { r: number; g: number; b: number } = FATHERS_FOREST
): Buffer {
  const { width, height, rgba } = decodePngRgba(source);
  const next = Buffer.from(rgba);
  for (let i = 0; i < next.length; i += 4) {
    if ((next[i + 3] ?? 0) === 0) continue;
    next[i] = color.r;
    next[i + 1] = color.g;
    next[i + 2] = color.b;
  }
  return encodePngRgba(width, height, next);
}

function unfilter(filter: number, row: Buffer, dest: Buffer, prev: Buffer, bpp: number) {
  for (let i = 0; i < dest.length; i += 1) {
    const x = row[i] ?? 0;
    const a = i >= bpp ? (dest[i - bpp] ?? 0) : 0;
    const b = prev[i] ?? 0;
    const c = i >= bpp ? (prev[i - bpp] ?? 0) : 0;
    if (filter === 1) dest[i] = (x + a) & 255;
    else if (filter === 2) dest[i] = (x + b) & 255;
    else if (filter === 3) dest[i] = (x + Math.floor((a + b) / 2)) & 255;
    else if (filter === 4) dest[i] = (x + paeth(a, b, c)) & 255;
    else dest[i] = x;
  }
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function pngChunk(type: string, data: Buffer) {
  const header = Buffer.alloc(4 + 4);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, 4, "ascii");
  const crc = crc32(Buffer.concat([header.subarray(4), data]));
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc, 0);
  return Buffer.concat([header, data, tail]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ (bytes[i] ?? 0)) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
