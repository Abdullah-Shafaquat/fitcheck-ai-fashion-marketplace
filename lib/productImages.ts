type ColorImages = Record<string, string | string[]>;

function parseArrayString(v: unknown): string[] {
  if (v === null || v === undefined || String(v).trim() === "") return [];
  const raw = String(v).trim();
  if (raw.startsWith("[") || raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch { /* fall through */ }
  }
  return String(raw)
    .split(/[,;|\n]/)
    .map((s) => s.replace(/^["'\[]+|["'\]]+$/g, "").trim())
    .filter(Boolean);
}

function cleanUrl(v: string): string {
  let s = v.trim();
  if (!s) return s;
  s = s.replace(/\\/g, "/");
  if (/^https?:\/\//i.test(s)) return s.replace(/([^:])\/\//g, "$1/");
  if (s.startsWith("/")) return s.replace(/\/{2,}/g, "/");
  return s;
}

export function normalizeImages(v: unknown): string[] {
  if (Array.isArray(v)) {
    return (v as unknown[]).map((u) => String(u)).map(cleanUrl).filter(Boolean);
  }
  return parseArrayString(v).map(cleanUrl).filter(Boolean);
}

export function normalizeColorImages(v: unknown): ColorImages {
  const out: ColorImages = {};
  if (v === null || v === undefined) return out;
  if (typeof v === "string" && v.trim()) {
    try {
      v = JSON.parse(v);
    } catch { return out; }
  }
  if (Array.isArray(v)) return out;
  if (typeof v === "object") {
    for (const [color, value] of Object.entries(v as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        const list = (value as unknown[]).map((u) => String(u)).map(cleanUrl).filter(Boolean);
        if (list.length) out[color.trim()] = list;
      } else if (typeof value === "string" && value.trim()) {
        const list = parseArrayString(value).map(cleanUrl).filter(Boolean);
        if (list.length) out[color.trim()] = list;
      }
    }
  }
  return out;
}
