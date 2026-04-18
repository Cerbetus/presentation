export function buildPresentationKey(name, deckId) {
  const shortId = String(deckId ?? "").replace(/-/g, "").slice(0, 4).toLowerCase();
  if (shortId) return shortId;
  return String(name ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "deck";
}

export function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? "")
  );
}

