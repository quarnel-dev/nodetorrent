export function percentEncode(buf: Buffer): string {
  return [...buf].map((b) => '%' + b.toString(16).padStart(2, '0')).join('')
}
