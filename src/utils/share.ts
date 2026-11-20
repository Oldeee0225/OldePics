// Copia la URL actual al portapapeles (usado por Album y PhotoViewer)
export async function copyLink(what: string) {
  try {
    await navigator.clipboard.writeText(location.href)
    alert(`${what} link copied`)
  } catch {
    alert(`${what} link ready to share`)
  }
}
