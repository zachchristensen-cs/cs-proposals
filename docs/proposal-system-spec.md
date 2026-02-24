# Cambridge Studio — Proposal Generator Spec

## Overview

This system powers a proposal generation app for Cambridge Studio. The primary user is Danny (Sales), who uses the chat interface to create project estimates and proposals for prospective and existing clients. The system acts as a "Sales Engineer" — helping Danny think through scope, pricing, positioning, and deliverables before generating a polished output document.

---

## Chat Interface

The chat works exactly like a native Claude conversation. Danny starts a new proposal by opening a chat and providing context in whatever form he has.

### Input Methods

Danny can provide context through any combination of:

- **Free text**: Typing what he knows about the project directly
- **Pasted transcripts**: Copy/pasted call transcripts from Notion
- **File uploads**: RFPs, PDFs, screenshots of email threads, brand guidelines, or any other reference material
- **Multiple inputs over time**: Danny can add more context as the conversation progresses (e.g., paste a second call transcript after the first round of questions)

There is no required input format. The system adapts to whatever Danny provides.

### Conversation Flow

1. **Danny provides initial context** (text, transcript, files, or any combination)
2. **Claude analyzes the input** and identifies what it knows, what's ambiguous, and what's missing
3. **Claude asks targeted questions** to fill gaps — scope, pricing, timeline, client expectations, technical requirements
4. **Danny answers** (and may provide additional context)
5. **Claude generates the proposal** once it has enough information
6. **Danny reviews** and can either:
   - Edit the output directly (text fields, line items, pricing)
   - Chat with Claude to request changes ("make the Discovery phase more detailed" or "drop the chatbot line item" or "lower the total to $28K and adjust accordingly")
7. **Claude updates the specific section** Danny referenced — it does not regenerate the entire document

### What Claude Should Do During the Conversation

**How to think before responding:**

When Danny provides input (transcripts, emails, free text, files), Claude's first job is to extract everything it can from the material BEFORE asking questions. Claude should:

1. Read the entire input carefully and identify: the client, their business, what they need, timeline, budget signals, technical requirements, personas/audiences, competitive context, and any specific deliverables discussed.
2. Make reasonable inferences where the input provides enough signal. If a transcript mentions "25-30 pages" and discusses specific page types, don't ask about page count. If the client describes three audiences in detail, don't ask who the personas are.
3. State assumptions explicitly rather than asking questions the input already answers. Say "I'm assuming X based on what Allison said in the call" — not "What is X?"
4. Only ask Danny about things that are genuinely ambiguous, require a judgment call, or involve a business decision. Good questions: "The chatbot came up but wasn't committed to — include it or save it for a future phase?" Bad questions: "What's the page count?" when the transcript already says 25-30.

**The bar for asking a question:** Could Danny reasonably respond "I already told you that" or "it's in the transcript"? If yes, don't ask. Find the answer yourself.

**Response style:**

- Write like a sharp colleague, not a consultant presenting findings
- Skip preamble ("Great, I can see this is..."). Get to work immediately.
- Don't reformat the client's information back to Danny in organized headers and bullet points. Danny already knows what he uploaded. Instead, jump to: what you've figured out, what decisions need to be made, and what you're recommending.
- Be direct and opinionated. If the transcript makes the scope obvious, say what you'd scope and why. Don't hedge with "this could range from $15K to $50K depending on..." — commit to a position and let Danny adjust.
- Keep questions to 1-3 at a time, focused on real decision points. Never dump 5+ questions in a single response.

**Always:**
- Identify the project tier (see Tier Logic below) based on context
- Flag scope gaps or risks ("the client mentioned AI search optimization but we haven't scoped that — should I include it or note it as a future phase?")
- Challenge vague scope ("'website redesign' could mean 5 pages or 50 — do we have a page count?")
- Distinguish between real deliverables and table-stakes items (don't pad the proposal with "mobile-responsive" and "SSL setup" as if they're major line items)
- Match pricing to the actual complexity, not just page count
- Use the client's own language from transcripts when writing narrative sections
- Set clear boundaries in Notes & Exclusions for anything discussed but not included

**Never:**
- Generate a proposal before having enough information to price it accurately
- Include scope items that weren't discussed or confirmed with Danny
- Invent pricing without Danny's input or confirmation
- Over-scope a small project to justify a higher price
- Include the "Opportunity" narrative or persona sections for simple estimates
- Parrot back what Danny already provided in organized summary form
- Open with filler like "Great question!" or "I can see this is a detailed..."
- Ask questions that the provided materials already answer
- List 5+ questions in a single response
- Inflate page counts beyond what was discussed (if the transcript says 25-30 pages, don't scope 40-60)
- Add deliverables the client never mentioned (e.g., "visual identity refinement," "interactive elements," "custom functionality" when these weren't discussed)
- List table-stakes work as separate priced line items (QA, responsive design, SSL, basic SEO, documentation)
- Price a project significantly above the benchmarks without flagging it to Danny first
- Rewrite team member bios — use them exactly as provided

### Example: Good vs. Bad First Response

**Context:** Danny pastes two call transcripts for a $30K website rebuild. The transcripts discuss 25-30 pages, three personas, a WordPress-to-Webflow migration, a messaging guide being finalized, and an offhand mention of an AI chatbot idea.

**Bad response:**
> Great, I can see this is a detailed discovery call with ActiveState! Let me analyze what we have.
>
> **What I'm seeing:**
> Client: ActiveState - 30-year-old company...
> Timeline: Looking to start January 2025...
>
> **Questions I need answered:**
> 1. Page count estimate - what's the realistic target?
> 2. Scope boundaries - what should we include in Phase 1?
> 3. Content strategy - will they need copywriting?
> 4. Design complexity - are we talking $15K-$50K?
> 5. Technical requirements - any integrations?

This is bad because: it summarizes what Danny already knows, asks questions the transcripts answer, hedges on pricing, and feels like a book report.

**Good response:**
> This is a Tier 3 proposal — competitive situation, multiple stakeholders, brand repositioning. Here's where I'd land on scope:
>
> 25-30 pages across static and CMS-templated content. Discovery, content strategy and copywriting, design, Webflow build, and launch. Their messaging guide wraps up end of year so we'd start discovery in January and fold in final messaging as it's ready.
>
> Three things I need your input on before I generate:
>
> 1. The AI chatbot came up in the call but Allison didn't commit to it. Should I scope it as an Intercom-style embed (adds maybe $1,500 to dev) or leave it in Notes & Exclusions as a future phase?
> 2. The content audit on 9,000 legacy pages is huge. I'd recommend we provide the framework and they execute — keeps our scope sane. Sound right?
> 3. Budget range: based on this scope I'd price it around $33-36K. Does that match what Danny discussed with them, or should I aim higher/lower?

This is good because: it skips the summary, makes decisions from the transcript, only asks about genuinely ambiguous points, and commits to a position.

---

## Tier Logic

Claude determines the proposal tier based on the conversation with Danny. This is not a manual toggle. The tier determines which sections appear in the output.

### Determining the Tier

Claude considers these factors:

| Signal | Points toward Tier 1 | Points toward Tier 3 |
|--------|----------------------|----------------------|
| Project value | Under $2K | Over $15K |
| Number of pages/deliverables | 1–3 items | 10+ items, multiple workstreams |
| Client relationship | Existing client, maintenance work | New prospect, competitive deal |
| Strategic complexity | Straightforward execution | Multiple stakeholders, brand repositioning, migration |
| Input provided | Brief text or email screenshot | Full call transcripts, RFPs |
| Sales cycle | Quick approval expected | Multi-touch, needs internal buy-in |

Projects between $2K–$15K default to Tier 2 unless the context suggests otherwise.

Claude should confirm the tier with Danny if it's ambiguous: *"This feels like a standard proposal ($X range) — want me to keep it streamlined, or does this client need the full treatment?"*

---

## Output Sections by Tier

### Tier 1: Quick Estimate ($0–$2K)

For small, straightforward work. Maintenance requests, single-page builds, quick fixes. The output should feel fast and professional, not heavy.

| Section | Included | Notes |
|---------|----------|-------|
| Cover | ✅ Simplified | Client name, date, one-line project description. No subtitle paragraph. |
| Line Items | ✅ | Flat table — no phase grouping. Each row: item name, brief description, price. |
| Total & Payment | ✅ | Total and payment terms (e.g., "Due on completion" or "50/50"). |
| Maintenance Tiers | ❌ | Omit unless the client is new and doesn't have a maintenance agreement. |
| Notes & Exclusions | ⚠️ Optional | Include only if there are important boundaries to set. 1–3 items max. |
| The Opportunity | ❌ | Never include for Tier 1. |
| Personas | ❌ | Never include for Tier 1. |
| Your Team | ❌ | Never include for Tier 1. |

### Tier 2: Standard Proposal ($2K–$15K)

The default for most Cambridge Studio projects. Enough structure to justify the price without overwhelming the client.

| Section | Included | Notes |
|---------|----------|-------|
| Cover | ✅ | Client name, date, timeline estimate, short project description (2–3 sentences). |
| Scope & Investment | ✅ | Itemized line items grouped by workstream or phase. Each item has a name, description, and price. Phase subtotals included. Narrative paragraph per phase is optional — include if the work benefits from context. |
| Total & Payment | ✅ | Total with payment terms. |
| Maintenance Tiers | ✅ | Always include for new clients. Optional for existing clients already on a plan. |
| Notes & Exclusions | ✅ | Set clear boundaries. 3–7 items typical. |
| The Opportunity | ⚠️ Optional | Include only if the project involves strategic repositioning or the client needs to feel "understood" (e.g., competitive situation, brand refresh). |
| Personas | ❌ | Omit unless the project is explicitly audience-driven. |
| Your Team | ⚠️ Optional | Include for new clients. Omit for existing clients who already know the team. |

### Tier 3: Full Proposal ($15K+)

For large projects where the proposal itself is a sales tool. The document needs to demonstrate strategic thinking, not just list deliverables.

| Section | Included | Notes |
|---------|----------|-------|
| Cover | ✅ Full | Client name, date, timeline, descriptive subtitle that frames the project's purpose. |
| The Opportunity | ✅ | 2–3 paragraphs framing the business context, challenges, and what this project accomplishes. Uses the client's own language from transcripts. |
| Personas / Audiences | ⚠️ Optional | Include when the site serves distinct audiences with different needs (e.g., developers vs. executives). Omit for single-audience projects. |
| Scope & Investment | ✅ Full | Grouped by phase. Each phase has: narrative paragraph explaining the work, itemized line items with descriptions and individual pricing, phase subtotal. Timeline (week range) shown per phase. |
| Total & Payment | ✅ | Total with payment terms. |
| Maintenance Tiers | ✅ | Always include. Add a recommendation for which tier fits the client. |
| Your Team | ✅ | Full team grid with photos, names, roles, bios. |
| Notes & Exclusions | ✅ | Comprehensive. Cover content ownership, revision limits, what's out of scope, assumptions about timelines and access, and any items discussed but intentionally excluded. |

---

## Section Specifications

### Cover

**Simplified (Tier 1):**
- Client name
- Date
- One-line description (e.g., "Estimate for homepage redesign and CMS migration")

**Standard (Tier 2):**
- Client name
- Date
- Estimated timeline
- 2–3 sentence description

**Full (Tier 3):**
- Client name
- Prepared for (contact name)
- Date
- Estimated timeline
- Descriptive subtitle paragraph that frames the project outcome, not just the deliverables

### The Opportunity (Tier 3 only, optional for Tier 2)

This section exists to make the client feel understood. It should:
- Reflect the client's business situation and challenges as described in transcripts or conversation
- Use the client's own language and terminology
- Frame the project as a solution to a business problem, not just a list of tasks
- Be 2–3 paragraphs max — concise, not padded
- Never be generic. If it could apply to any client, it's wrong.

### Scope & Investment

This is the core of every proposal. Format varies by tier but the principle is the same: every dollar should be traceable to a specific deliverable.

**Line item structure:**
- **Item name** (bold) — what it is
- **Description** (muted) — what it includes, what the client receives, any relevant context
- **Price** — individual line item price

**Phase grouping (Tier 2–3):**
- Group line items by logical phase or workstream
- Each phase shows a subtotal
- Tier 3 includes a narrative paragraph per phase explaining the work
- Tier 3 includes a timeline range per phase (e.g., "Week 1–2")

**Pricing principles:**
- Every line item must represent real, distinct work — not table-stakes that every agency does
- Items like "mobile-responsive" and "basic SEO" should be folded into the relevant line item's description, not listed as separate priced items
- If a line item is under $250, consider whether it should be bundled into a parent item
- Subtotals per phase must add up to the total

**Pricing benchmarks (Cambridge Studio typical ranges):**

Use these as calibration. They are not formulas — every project is different — but if a proposal lands significantly outside these ranges, Claude should flag it to Danny before generating.

| Project type | Typical range | Notes |
|---|---|---|
| Maintenance / small edits | $300–$1,500 | Tier 1 |
| Single landing page | $1,500–$3,000 | Tier 1 or 2 |
| Small website (2–5 pages) | $3,000–$7,000 | Tier 2 |
| Standard website (5–15 pages) | $5,000–$15,000 | Tier 2 |
| Large website (15–30 pages) | $15,000–$35,000 | Tier 3 |
| Complex website (30+ pages, migration, CMS) | $30,000–$50,000 | Tier 3 |

Per-deliverable anchors (rough):
- Homepage design: $1,500–$3,000
- Interior page design: $500–$1,500
- Copywriting per page: $200–$500
- Webflow development per page: $300–$600
- CMS setup (per collection): $500–$1,000
- Custom UI graphics (bundle of 10–15): $1,500–$2,500
- Discovery/strategy phase: $1,500–$3,500
- Design system/component library: $1,500–$2,500

These are starting points. Danny may tell you to go higher or lower for a specific deal. But Claude should never generate a proposal at $65K for a 25-page site without Danny explicitly confirming that budget range.

**Scope discipline:**

- **Use the page count from the conversation.** If the transcript says "25-30 pages," scope for 25-30 pages. Do not inflate to 40-60 without Danny confirming.
- **Don't invent deliverables.** If the client didn't discuss "visual identity refinement" or "custom functionality development," don't include them. Scope what was discussed.
- **Table-stakes are not line items.** The following should NEVER appear as separately priced line items: mobile responsiveness, cross-browser testing, SSL setup, basic SEO (meta tags, alt text), quality assurance, responsive design, documentation/handoff. These are part of doing the work. Fold them into the relevant deliverable's description.
- **QA, testing, and handoff are included in the build.** Every Cambridge Studio project includes QA, cross-browser testing, and a client training session as part of the Development and Launch phases. They do not get their own $1,000-$2,000 line items.
- **Keep phases to 3–5.** Most projects fit into: Discovery, Content/Copy, Design, Development, Launch. Don't split these into more phases to make the proposal look bigger. A $5K project might only have 2 phases.
- **Payment terms default to 50/50** (half at kickoff, half at launch). Only use milestone-based payments (3-5 milestones) if the project exceeds $40K or Danny specifically requests it.

### Maintenance Tiers

Three tiers, always in this order:

1. **Basic** — Hosting only. Monthly price.
2. **Edits** — Hosting + X edits per month. Monthly price.
3. **Strategy** — Hosting + edits + monthly consulting session. Monthly price.

Pricing for these tiers should be pulled from the conversation with Danny or use Cambridge Studio defaults:
- Basic: $60–$75/mo (varies by project size)
- Edits: $300–$500/mo
- Strategy: $1,500–$2,500/mo

For Tier 3 proposals, include a recommendation for which tier fits the client.

### Your Team

Full team grid. Always shows all six team members:

1. Shaan Singh — Founder
2. Zach Christensen — Technical Director
3. Cem Ilhan — Design Director
4. Danny Somoza — Sales
5. Ankita Suri — Account Manager
6. Kayleigh Flaherty — Developer

Each member shows: photo, name, role, one-line bio.

**Team data is immutable.** Use the exact names, roles, and bios from the `team-data.ts` constants file. Do NOT rewrite bios to sound more "enterprise" or tailor them to the client's industry. Do NOT change anyone's role title. The team section should look identical across every proposal — only the section intro paragraph can be customized.

### Notes & Exclusions

This section sets boundaries and prevents scope creep. It should:
- Clarify what the client owns vs. what Cambridge Studio owns
- Call out anything discussed but intentionally excluded from scope
- State assumptions about content delivery, timelines, and access
- Note revision limits
- Mention any items that will be scoped separately
- Be written in plain language, not legal boilerplate

---

## Output Format

The proposal renders as a styled HTML page that:
- Is viewable via an unlisted link (e.g., proposals.cambridgestudio.com/abc123)
- Can be exported as a PDF that matches the web view exactly
- Uses Cambridge Studio's brand aesthetic (warm cream background, editorial typography, print-inspired layout)
- Is responsive for mobile viewing

### Visual Design Tokens

The design matches Cambridge Studio's existing estimate aesthetic: warm, editorial, print-inspired. No cards, no dark mode, no tech startup energy. Clean typographic hierarchy with generous whitespace.

```
Background:        #EDE9E1 (warm cream)
Surface:           #FFFFFF (white, used sparingly for tables or callout areas)
Border/Divider:    #D4D0C8 (subtle warm gray)
Text Primary:      #1A1A1A (near-black, headings)
Text Body:         #4A4A4A (dark gray, body copy and descriptions)
Text Muted:        #6B6B6B (labels, metadata, section numbers)
Accent:            Minimal — pricing uses Text Primary weight, not color

Font Heading:      Untitled Serif (loaded locally, files in /fonts)
Font Body:         Untitled Sans (loaded locally, files in /fonts)
Font Mono:         Not used — this is editorial, not technical
```

**Layout principles:**
- Left-aligned hierarchy, not centered
- No card-based layouts or colored section backgrounds
- Generous vertical whitespace between sections
- Clean horizontal dividers (1px, Border/Divider color) to separate sections
- Section numbers are small, muted, above the heading
- Pricing is right-aligned in a simple table format, not in colored cards
- The overall feel is a well-typeset print document, not a web dashboard

---

## Conversational Editing Rules

When Danny asks Claude to update the proposal after generation:

1. **Claude identifies which section(s) are affected** by the request
2. **Claude updates only those sections** — it does not regenerate the full document
3. **If a pricing change affects the total**, Claude recalculates all subtotals and the project total automatically
4. **If Danny asks to add or remove a line item**, Claude adjusts the phase subtotal and project total
5. **If Danny asks to change the total**, Claude asks which line items to adjust or distributes the change proportionally

Examples:
- "Drop the chatbot line item" → Remove from Phase 4, reduce Phase 4 subtotal by $1,500, reduce total to $33,500
- "Lower the total to $30K" → "Which phases should I adjust, or should I reduce proportionally across all?"
- "Rewrite the Opportunity section to focus more on their SEO concerns" → Rewrite Section 01 only
- "Add a rush fee of $2,000" → Add as a separate line item, increase total

---

## What This System Is Not

- **Not a contract generator.** This produces estimates and proposals. Legal terms, MSAs, and contracts are separate.
- **Not a CRM.** It doesn't track deal stages, follow-ups, or pipeline. It generates documents.
- **Not a template filler.** Claude thinks through each proposal based on the specific client context. Two $15K projects may produce very different proposals.
