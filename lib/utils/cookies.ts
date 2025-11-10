"use client"

// Simple cookie utilities for client-side session handling

export function setCookie(name: string, value: string, maxAgeSeconds: number) {
  try {
    const encoded = encodeURIComponent(value)
    const attrs = [
      `${name}=${encoded}`,
      `path=/`,
      `max-age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
      `samesite=lax`,
    ]
    // Use secure in production only to avoid localhost issues
    if (typeof location !== "undefined" && location.protocol === "https:") {
      attrs.push("secure")
    }
    document.cookie = attrs.join("; ")
  } catch (_) {
    // no-op
  }
}

export function getCookie(name: string): string | null {
  try {
    const parts = document.cookie.split(";")
    for (const part of parts) {
      const [k, ...rest] = part.trim().split("=")
      if (k === name) {
        return decodeURIComponent(rest.join("="))
      }
    }
  } catch (_) {
    // no-op
  }
  return null
}

export function deleteCookie(name: string) {
  try {
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
  } catch (_) {
    // no-op
  }
}

