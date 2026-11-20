/** '2024-10-05' → 'October 2024' (o 'Oct 2024' con short) */
export function formatMonth(date: string | null | undefined, short = false): string {
  if (!date) return ''
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: short ? 'short' : 'long', year: 'numeric' })
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

export const orientation = (p: { width: number; height: number }) =>
  p.width >= p.height ? 'landscape' : 'portrait'
