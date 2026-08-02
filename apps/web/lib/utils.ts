import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Builds a relative `?a=1&b=2` string from `current` (typically
 * `useSearchParams()`'s value) with `key` overridden to `value` and every
 * OTHER existing param preserved. `/codes` (P9.6-U2 follow-up) has two
 * independent URL-driven controls sharing one query string — `range` and
 * `page` — and without this, each control's own hardcoded `?param=value`
 * href would silently drop whatever the other one had set.
 */
export function withQueryParam(
  current: URLSearchParams,
  key: string,
  value: string | number,
): string {
  const next = new URLSearchParams(current)
  next.set(key, String(value))
  return `?${next.toString()}`
}
