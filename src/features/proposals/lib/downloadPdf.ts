export function downloadProposalPdf(clientName?: string) {
  const originalTitle = document.title
  if (clientName) {
    document.title = `${clientName} Proposal`
  }
  window.print()
  // Restore after a tick so the print dialog picks up the new title
  setTimeout(() => {
    document.title = originalTitle
  }, 100)
}
