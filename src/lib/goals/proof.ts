function isUsableProofHost(hostname: string): boolean {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  if (!host) return false;
  if (host === "localhost") return true;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return true;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(host);
}

export function normalizeProofUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    if (!isUsableProofHost(parsed.hostname)) return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}

export function proofParts(proofUrl?: string, comment?: string) {
  const href = normalizeProofUrl(proofUrl ?? "");
  const note = comment?.trim() ?? "";
  return { href, note, hasProof: Boolean(href || note) };
}

export function proofLinkLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "") + parsed.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}
