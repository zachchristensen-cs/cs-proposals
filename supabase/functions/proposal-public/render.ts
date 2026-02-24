// deno-lint-ignore-file no-explicit-any

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US")
}

function renderCover(cover: any): string {
  const meta = [
    cover.prepared_for
      ? `<div><span style="font-weight:500;color:#1A1A1A">Prepared for</span> ${esc(cover.prepared_for)}</div>`
      : "",
    `<div><span style="font-weight:500;color:#1A1A1A">Date</span> ${esc(cover.date)}</div>`,
    cover.timeline
      ? `<div><span style="font-weight:500;color:#1A1A1A">Timeline</span> ${esc(cover.timeline)}</div>`
      : "",
  ]
    .filter(Boolean)
    .join("")

  return `<section style="margin-bottom:4rem">
    <p class="section-label">Proposal</p>
    <h1 style="font-family:'Untitled Serif',Georgia,serif;font-size:2.25rem;line-height:1.2;color:#1A1A1A;margin:0 0 1rem">${esc(cover.client_name)}</h1>
    <p style="font-size:1rem;line-height:1.6;color:#4A4A4A;margin:0 0 1.5rem">${esc(cover.description)}</p>
    <div style="display:flex;flex-wrap:wrap;gap:0.5rem 2rem;font-size:0.875rem;color:#6B6B6B">${meta}</div>
  </section>`
}

function renderOpportunity(opportunity: any, num: number): string {
  const paragraphs = opportunity.paragraphs
    .map((p: string) => `<p style="font-size:0.875rem;line-height:1.6;color:#4A4A4A;margin:0.5rem 0">${esc(p)}</p>`)
    .join("")

  return `<section style="margin-bottom:4rem">
    <div class="divider"></div>
    <p class="section-label">${String(num).padStart(2, "0")} — The Opportunity</p>
    ${paragraphs}
  </section>`
}

function renderPhases(phases: any[], num: number): string {
  const phasesHTML = phases
    .map((phase: any) => {
      const items = phase.items
        .map(
          (item: any) => `<div style="display:flex;justify-content:space-between;align-items:start;border-bottom:1px solid #D4D0C8;padding:0.75rem 0">
        <div style="flex:1;margin-right:1rem">
          <span style="font-size:0.875rem;font-weight:500;color:#1A1A1A">${esc(item.name)}</span>
          ${item.description ? `<p style="font-size:0.875rem;color:#6B6B6B;margin:0.125rem 0 0">${esc(item.description)}</p>` : ""}
        </div>
        <span style="font-size:0.875rem;font-weight:500;color:#1A1A1A;white-space:nowrap">${formatCurrency(item.price)}</span>
      </div>`,
        )
        .join("")

      return `<div style="margin-bottom:2.5rem">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.25rem">
          <h3 style="font-family:'Untitled Serif',Georgia,serif;font-size:1.25rem;color:#1A1A1A;margin:0">${esc(phase.name)}</h3>
          ${phase.timeline ? `<span style="font-size:0.75rem;color:#6B6B6B">${esc(phase.timeline)}</span>` : ""}
        </div>
        ${phase.narrative ? `<p style="font-size:0.875rem;line-height:1.6;color:#4A4A4A;margin:0 0 1rem">${esc(phase.narrative)}</p>` : ""}
        ${items}
        <div style="text-align:right;margin-top:0.5rem">
          <span style="font-size:0.875rem;font-weight:500;color:#1A1A1A">Subtotal: ${formatCurrency(phase.subtotal)}</span>
        </div>
      </div>`
    })
    .join("")

  return `<section style="margin-bottom:4rem">
    <div class="divider"></div>
    <p class="section-label">${String(num).padStart(2, "0")} — Scope &amp; Pricing</p>
    ${phasesHTML}
  </section>`
}

function renderTotal(total: number): string {
  return `<section style="margin-bottom:4rem">
    <div style="border-top:2px solid #1A1A1A;margin-bottom:1rem"></div>
    <div style="display:flex;justify-content:space-between;align-items:baseline">
      <span style="font-family:'Untitled Serif',Georgia,serif;font-size:1.25rem;color:#1A1A1A">Project Total</span>
      <span style="font-family:'Untitled Serif',Georgia,serif;font-size:1.5rem;font-weight:700;color:#1A1A1A">${formatCurrency(total)}</span>
    </div>
  </section>`
}

function renderPayment(payment: any, num: number): string {
  const terms = payment.terms
    .map(
      (t: any) => `<div style="display:flex;justify-content:space-between;align-items:start;border-bottom:1px solid #D4D0C8;padding:0.75rem 0">
      <div style="margin-right:1rem">
        <span style="font-size:0.875rem;font-weight:500;color:#1A1A1A">${esc(t.label)}</span>
        <p style="font-size:0.875rem;color:#6B6B6B;margin:0.125rem 0 0">${esc(t.description)}</p>
      </div>
      <span style="font-size:0.875rem;font-weight:500;color:#1A1A1A;white-space:nowrap">${formatCurrency(t.amount)}</span>
    </div>`,
    )
    .join("")

  return `<section style="margin-bottom:4rem">
    <div class="divider"></div>
    <p class="section-label">${String(num).padStart(2, "0")} — Payment Terms</p>
    ${terms}
  </section>`
}

function renderMaintenance(maintenance: any, num: number): string {
  const tiers = maintenance.tiers
    .map(
      (t: any) => `<div style="border-top:1px solid #D4D0C8;padding-top:1rem">
      <h3 style="font-size:0.875rem;font-weight:500;color:#1A1A1A;margin:0 0 0.25rem">${esc(t.name)}</h3>
      <p style="font-family:'Untitled Serif',Georgia,serif;font-size:1.125rem;color:#1A1A1A;margin:0 0 0.5rem">${esc(t.price)}</p>
      <p style="font-size:0.75rem;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;color:#6B6B6B;margin:0 0 0.25rem">${esc(t.summary)}</p>
      <p style="font-size:0.875rem;line-height:1.6;color:#6B6B6B;margin:0">${esc(t.description)}</p>
    </div>`,
    )
    .join("")

  return `<section style="margin-bottom:4rem">
    <div class="divider"></div>
    <p class="section-label">${String(num).padStart(2, "0")} — Ongoing Maintenance</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem">${tiers}</div>
    ${maintenance.recommendation ? `<p style="font-size:0.875rem;line-height:1.6;color:#4A4A4A;margin:1.5rem 0 0">${esc(maintenance.recommendation)}</p>` : ""}
  </section>`
}

function renderTeam(team: any, num: number): string {
  const members = team.members
    .map(
      (m: any) => `<div style="display:flex;gap:0.75rem">
      <div style="width:2.5rem;height:2.5rem;border-radius:50%;background:#D4D0C8;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:500;color:#1A1A1A;flex-shrink:0">${esc(m.initials)}</div>
      <div>
        <h3 style="font-size:0.875rem;font-weight:500;color:#1A1A1A;margin:0">${esc(m.name)}</h3>
        <p style="font-size:0.75rem;color:#6B6B6B;margin:0">${esc(m.role)}</p>
        <p style="font-size:0.875rem;line-height:1.6;color:#6B6B6B;margin:0.25rem 0 0">${esc(m.bio)}</p>
      </div>
    </div>`,
    )
    .join("")

  return `<section style="margin-bottom:4rem">
    <div class="divider"></div>
    <p class="section-label">${String(num).padStart(2, "0")} — Your Team</p>
    <p style="font-size:0.875rem;line-height:1.6;color:#4A4A4A;margin:0 0 1.5rem">${esc(team.intro)}</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem">${members}</div>
  </section>`
}

function renderNotes(notes: any, timingNote: string | undefined, num: number): string {
  const items = notes?.items?.length
    ? `<ul style="margin:0 0 1.5rem;padding:0;list-style:none">${notes.items
        .map(
          (item: string) =>
            `<li style="font-size:0.875rem;line-height:1.6;color:#4A4A4A;margin:0.5rem 0;padding-left:1rem;position:relative"><span style="position:absolute;left:0;color:#6B6B6B">&bull;</span>${esc(item)}</li>`,
        )
        .join("")}</ul>`
    : ""

  const timing = timingNote
    ? `<div style="border-left:2px solid #D4D0C8;padding-left:1rem"><p style="font-size:0.875rem;line-height:1.6;color:#4A4A4A;margin:0">${esc(timingNote)}</p></div>`
    : ""

  return `<section style="margin-bottom:4rem">
    <div class="divider"></div>
    <p class="section-label">${String(num).padStart(2, "0")} — Notes &amp; Exclusions</p>
    ${items}${timing}
  </section>`
}

export function renderProposalHTML(content: any, clientName: string): string {
  let sectionNum = 0
  let body = ""

  body += renderCover(content.cover)

  if (content.opportunity?.paragraphs?.length) {
    body += renderOpportunity(content.opportunity, ++sectionNum)
  }

  if (content.phases?.length) {
    body += renderPhases(content.phases, ++sectionNum)
  }

  if (content.total > 0) {
    body += renderTotal(content.total)
  }

  if (content.payment?.terms?.length) {
    body += renderPayment(content.payment, ++sectionNum)
  }

  if (content.maintenance?.tiers?.length) {
    body += renderMaintenance(content.maintenance, ++sectionNum)
  }

  if (content.team?.members?.length) {
    body += renderTeam(content.team, ++sectionNum)
  }

  if (content.notes?.items?.length || content.timing_note) {
    body += renderNotes(content.notes, content.timing_note, ++sectionNum)
  }

  body += `<div style="border-top:1px solid #D4D0C8;padding-top:2rem;text-align:center"><p style="font-size:0.75rem;color:#6B6B6B;margin:0">Cambridge Studio</p></div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(clientName || "Proposal")} — Cambridge Studio</title>
  <meta name="robots" content="noindex, nofollow" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #EDE9E1;
      font-family: 'Untitled Sans', system-ui, -apple-system, sans-serif;
      color: #4A4A4A;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 48rem;
      margin: 0 auto;
      padding: 2.5rem 1.5rem;
    }
    @media (min-width: 640px) {
      .container { padding: 4rem 2.5rem; }
    }
    .section-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: #6B6B6B;
      margin: 0 0 1.5rem;
    }
    .divider {
      border-top: 1px solid #D4D0C8;
      margin-bottom: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">${body}</div>
</body>
</html>`
}
