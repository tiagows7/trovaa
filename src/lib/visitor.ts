const VISITOR_ID_KEY = "trovaa-visitor-id";

export function getVisitorId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem(VISITOR_ID_KEY, id);
  return id;
}
