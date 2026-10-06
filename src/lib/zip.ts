/**
 * Minimal, defensive ZIP central-directory reader. It lists entries and locates their compressed
 * bytes; it never decompresses (callers do that with explicit output limits). Used to recognize
 * DOCX files and to read their text on the server.
 *
 * Deliberately unsupported: ZIP64, multi-disk archives, and encrypted entries are reported as
 * unreadable rather than handled.
 */

export interface ZipEntry {
  name: string;
  /** 0 = stored, 8 = deflate. Anything else is unsupported. */
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  encrypted: boolean;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT = 0xffff;

export const ZIP_MAX_ENTRIES = 2000;

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/** True when the bytes start like a ZIP archive. */
export function hasZipSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && view(bytes).getUint32(0, true) === LOCAL_SIGNATURE;
}

function findEndOfCentralDirectory(data: DataView): number {
  const earliest = Math.max(0, data.byteLength - EOCD_MIN_SIZE - MAX_COMMENT);
  for (let offset = data.byteLength - EOCD_MIN_SIZE; offset >= earliest; offset -= 1) {
    if (data.getUint32(offset, true) === EOCD_SIGNATURE) return offset;
  }
  return -1;
}

const utf8 = new TextDecoder("utf-8", { fatal: false });

/**
 * Lists the entries of a ZIP archive, or returns null if the bytes are not a well-formed,
 * supported archive.
 */
export function readZipEntries(
  bytes: Uint8Array,
  maxEntries: number = ZIP_MAX_ENTRIES,
): ZipEntry[] | null {
  if (bytes.length < EOCD_MIN_SIZE || !hasZipSignature(bytes)) return null;
  const data = view(bytes);
  const eocd = findEndOfCentralDirectory(data);
  if (eocd < 0) return null;

  const diskNumber = data.getUint16(eocd + 4, true);
  const entryCount = data.getUint16(eocd + 10, true);
  const directorySize = data.getUint32(eocd + 12, true);
  const directoryOffset = data.getUint32(eocd + 16, true);
  if (diskNumber !== 0 || entryCount === 0xffff || directoryOffset === 0xffffffff) return null;
  if (entryCount > maxEntries) return null;
  if (directoryOffset + directorySize > eocd) return null;

  const entries: ZipEntry[] = [];
  let offset = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > eocd || data.getUint32(offset, true) !== CENTRAL_SIGNATURE) return null;
    const flags = data.getUint16(offset + 8, true);
    const method = data.getUint16(offset + 10, true);
    const compressedSize = data.getUint32(offset + 20, true);
    const uncompressedSize = data.getUint32(offset + 24, true);
    const nameLength = data.getUint16(offset + 28, true);
    const extraLength = data.getUint16(offset + 30, true);
    const commentLength = data.getUint16(offset + 32, true);
    const localHeaderOffset = data.getUint32(offset + 42, true);
    const nameEnd = offset + 46 + nameLength;
    if (nameEnd > eocd) return null;
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) return null;

    entries.push({
      name: utf8.decode(bytes.subarray(offset + 46, nameEnd)),
      method,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      encrypted: (flags & 0x1) === 0x1,
    });
    offset = nameEnd + extraLength + commentLength;
  }
  return entries;
}

/** The compressed bytes of one entry, or null if its local header is malformed. */
export function zipEntryData(bytes: Uint8Array, entry: ZipEntry): Uint8Array | null {
  const data = view(bytes);
  const header = entry.localHeaderOffset;
  if (header + 30 > bytes.length || data.getUint32(header, true) !== LOCAL_SIGNATURE) return null;
  const start = header + 30 + data.getUint16(header + 26, true) + data.getUint16(header + 28, true);
  const end = start + entry.compressedSize;
  if (end > bytes.length) return null;
  return bytes.subarray(start, end);
}
