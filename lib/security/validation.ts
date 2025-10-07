export function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
}

export function sanitizeString(input: unknown): string {
  const s = typeof input === "string" ? input : String(input ?? "")
  // Basic sanitation: remove script tags and dangerous chars
  return s
    .replace(/<\s*script[^>]*>([\s\S]*?)<\s*\/\s*script>/gi, "")
    .replace(/[<>]/g, "")
}