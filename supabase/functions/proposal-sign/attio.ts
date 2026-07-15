// Attio deal automation. On signature: find the matching deal (by company
// domain from the signer's email, then by client/company name), set its
// stage to Closed Won, and stamp the proposal link. Best-effort: returns a
// summary string for the notification email instead of throwing.
//   ATTIO_API_KEY - workspace API key

const ATTIO = "https://api.attio.com/v2"

// deno-lint-ignore no-explicit-any
async function attioRequest(path: string, body?: unknown, method?: string): Promise<any> {
  const key = Deno.env.get("ATTIO_API_KEY")
  if (!key) throw new Error("ATTIO_API_KEY not configured")
  const res = await fetch(`${ATTIO}${path}`, {
    method: method ?? (body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(`Attio ${path}: ${data?.message || res.status}`)
  }
  return data
}

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "aol.com", "proton.me", "protonmail.com", "live.com", "msn.com", "me.com",
])

// deno-lint-ignore no-explicit-any
async function findDealByCompanyDomain(domain: string): Promise<any | null> {
  const companies = await attioRequest("/objects/companies/records/query", {
    filter: { domains: domain },
    limit: 1,
  })
  const company = companies?.data?.[0]
  if (!company) return null

  const deals = await attioRequest("/objects/deals/records/query", {
    filter: {
      associated_company: {
        target_object: "companies",
        target_record_id: company.id.record_id,
      },
    },
    limit: 10,
  })
  return pickOpenDeal(deals?.data ?? [])
}

// deno-lint-ignore no-explicit-any
async function findDealByName(name: string): Promise<any | null> {
  if (!name) return null
  const deals = await attioRequest("/objects/deals/records/query", { limit: 500 })
  const target = name.toLowerCase()
  // deno-lint-ignore no-explicit-any
  const matches = (deals?.data ?? []).filter((d: any) => {
    const dealName: string = d?.values?.name?.[0]?.value ?? ""
    return dealName.toLowerCase().includes(target) || target.includes(dealName.toLowerCase())
  })
  return pickOpenDeal(matches)
}

// Prefer deals that aren't already closed
// deno-lint-ignore no-explicit-any
function pickOpenDeal(deals: any[]): any | null {
  if (!deals.length) return null
  const CLOSED = new Set(["Closed Won", "Closed Lost", "Project Completed"])
  // deno-lint-ignore no-explicit-any
  const open = deals.filter((d: any) => {
    const stage = d?.values?.stage?.[0]?.status?.title
    return stage && !CLOSED.has(stage)
  })
  return open[0] ?? deals[0]
}

export async function markDealClosedWon(opts: {
  signerEmail: string
  clientName: string
  proposalUrl: string
}): Promise<{ dealId: string | null; summary: string }> {
  try {
    const domain = opts.signerEmail.split("@")[1]?.toLowerCase() ?? ""

    // deno-lint-ignore no-explicit-any
    let deal: any = null
    if (domain && !FREE_EMAIL_DOMAINS.has(domain)) {
      deal = await findDealByCompanyDomain(domain).catch(() => null)
    }
    if (!deal) {
      deal = await findDealByName(opts.clientName).catch(() => null)
    }

    if (!deal) {
      return {
        dealId: null,
        summary: `No Attio deal matched (${opts.clientName || "unknown client"}, ${domain || "no domain"}). Update Attio manually.`,
      }
    }

    const dealId: string = deal.id.record_id
    const dealName: string = deal?.values?.name?.[0]?.value ?? dealId

    await attioRequest(`/objects/deals/records/${dealId}`, {
      data: {
        values: {
          stage: "Closed Won",
          proposal: opts.proposalUrl,
        },
      },
    }, "PATCH")

    return { dealId, summary: `Attio deal "${dealName}" marked Closed Won.` }
  } catch (err) {
    return {
      dealId: null,
      summary: `Attio update failed: ${err instanceof Error ? err.message : "unknown error"}. Update Attio manually.`,
    }
  }
}
