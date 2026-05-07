export function buildAccountKey(userId) {
  const normalized = String(userId ?? "").replace(/-/g, "").toLowerCase();
  if (!normalized) return "";
  return normalized.replace(/[^a-z0-9]/g, "").slice(0, 12) || "account";
}

export function buildSessionChannel(key) {
  const trimmed = String(key ?? "").trim().toLowerCase();
  if (!trimmed) return "";
  return `session:${trimmed}`;
}

