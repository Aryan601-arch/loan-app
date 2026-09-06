# SAATHI — Digital Lending Marketplace (Nepal) — Project Spec

This document summarizes the full product, design, and business-logic requirements
for the SAATHI prototype, so it can be handed to another AI tool or developer along
with the source file (`lending-app.jsx`) and fully understood without needing the
original chat history.

## What this is

A **front-end-only UI prototype** (React) of a digital loan marketplace/aggregator
app for Nepal, inspired by apps like Buddy Loan (India). It is NOT a working
backend — no real lending, KYC verification, payments, or data persistence.
Everything runs in-memory and resets on page refresh.

## Tech stack / environment assumptions

- **React** (functional components, hooks: useState, useMemo, useContext, useEffect)
- **Tailwind CSS** utility classes for layout (flex, px-5, grid-cols-3, etc.) —
  needs Tailwind installed and configured to run outside of the original
  Claude.ai artifact environment (see "Running locally" below).
- **lucide-react** — icon library (ArrowLeft, Bell, ShieldCheck, Zap, etc.)
- **recharts** — used for the principal/interest donut chart on the EMI
  calculator screen (PieChart, Pie, Cell).
- Single file, default export `SaathiApp`, phone-frame mockup wrapper
  (380×720px fixed size) — **this is a demo/screenshot style presentation**,
  not a responsive full-screen layout. If deploying for real mobile use, the
  phone-frame wrapper should be removed/made responsive.

### Running locally
1. `npm create vite@latest` (React template)
2. `npm install lucide-react recharts`
3. `npm install tailwindcss @tailwindcss/vite` + configure
4. Drop the file into `src/`, import and render the default export
5. `npm run dev`

## Regulatory / business context (Nepal)

- Nepal Rastra Bank (NRB) regulates lending; app text/logic reflects a real
  2022 "Digital Lending Guideline" and its June 2026 amendment, which:
  - Allows banks/FIs to lend digitally themselves, or via licensed Payment
    Service Providers (PSPs) acting as agent.
  - The June 2026 amendment additionally permits third-party technology
    platforms/aggregators to assist with data collection and credit
    assessment (with customer consent), **without bearing lending risk** —
    risk stays with the bank. This is the business model SAATHI reflects
    (Model 1: aggregator/facilitator, not a licensed lender itself).
  - MSME digital loans can go up to **Rs. 10,00,000** under this guideline.
  - Individual salaried/professional digital loans: up to Rs. 5,00,000 over
    up to 3 years; other individuals up to Rs. 2,00,000.
- The KYC consent text explicitly discloses: SAATHI facilitates and assesses
  eligibility on the lender's behalf, but the **loan decision and lending
  risk rest fully with the selected bank**, per NRB's guideline.

## Screens / user flow

1. **Home** — hero with loan-amount slider + live EMI preview, "Check your
   eligibility" CTA, secondary "Instant loan up to Rs. 25,000" CTA
   (salaried-only, see below), trust badges, "How it works" (3 steps),
   link to "Browse all NRB-licensed institutions" (directory screen).
2. **Eligibility** — employment type (Salaried / Self-employed / Small
   Business), income or (for business) annual turnover, age, city (dropdown
   of 18 Nepali cities/towns), and for Small Business: business name,
   business type, registration number, and business-established-since date
   (must be ≥ 1 year old to proceed — hard validation error otherwise).
3. **Offers** — lists 4 illustrative lenders (see "Lender data" below),
   sortable by lowest interest or fastest payout.
4. **Calculator** — EMI calculator with amount/tenure sliders, donut chart
   of principal vs. interest, full loan summary, link to repayment schedule.
   Enforces the affordability caps (see "Loan amount caps" below).
5. **Repayment schedule** — full month-by-month amortization table (EMI,
   principal, interest, remaining balance).
6. **KYC** — identity + banking details (see "KYC fields" below).
7. **Status** — application-submitted confirmation with a step tracker
   (Received → Identity verification → Lender approval → Funds disbursed)
   and a disbursal-time note (instant vs. standard, see below).
8. **Directory** — browsable list of all NRB-licensed institutions, grouped
   by class, real official names, no fabricated financial data attached
   (see "NRB Directory" below).

## Loan amount caps (core business logic)

Applies on the Calculator screen; the amount slider's **max** is the
lowest of whichever caps apply:

- **Small Business**: capped at a percentage of *annual sales turnover*,
  tiered by how long the business has been operating:
  - 1–3 years: 15% of turnover
  - 3–5 years: 20% of turnover
  - 5+ years: 25% of turnover
  - ...and never above the flat **NRB MSME ceiling of Rs. 10,00,000**.
  - (Businesses under 1 year old can't reach this screen at all — blocked
    at the Eligibility step.)
- **Salaried / Self-employed**: capped by EMI-to-income affordability
  brackets:
  - Income < Rs. 30,000 → EMI ≤ 20% of income
  - Rs. 30,000–40,000 → EMI ≤ 25%
  - Above Rs. 40,000 → EMI ≤ 30% (this is a hard cap — the original request
    had 35%/40% tiers above this, but they were later collapsed down to a
    flat 30% ceiling for all income above Rs. 40,000)
  - The max loan amount is computed by inverting the EMI formula for the
    selected tenure, so the cap adjusts live if tenure changes.
  - Also bounded by each lender's own `maxAmt` (see Lender data below).
- These caps are enforced silently — **no UI text currently explains them
  to the user** (this was explicitly requested to be removed after being
  shown initially; the math still works correctly under the hood).

## "Instant loan" rule (≤ Rs. 25,000)

- Loans of Rs. 25,000 or less get an "instant disbursal" treatment
  throughout the app: shown as "Instant (within minutes)" instead of the
  lender's normal 1–2 business day payout, on the Home screen amount
  panel, the Calculator screen, and the Status screen.
- There's a dedicated secondary CTA on the Home screen: "⚡ Instant loan up
  to Rs. 25,000" — **restricted to Salaried applicants only**. Tapping it:
  - Caps the amount at Rs. 25,000 (if higher)
  - Pre-selects "Salaried" as employment type
  - Locks the Eligibility screen's employment-type selector so
    Self-employed/Small Business can't be chosen in this flow (disabled,
    greyed out, with an explanatory banner)
  - Choosing the normal "Check your eligibility" CTA instead resets this
    restriction and all three employment types are selectable again.

## KYC fields required

**Everyone:**
- Full name (as per citizenship)
- Citizenship number
- National ID (NID) number — **must be exactly 10 digits** (input strips
  non-digits and caps at 10; inline error shown and submit blocked if
  fewer than 10 digits are entered)
- PAN number (personal, 9-digit IRD format)
- Mobile number
- Bank name (dropdown of the 20 licensed commercial banks)
- Bank account number for disbursal
- Consent checkbox (see wording under "Regulatory context" above)

**Small Business only — five required document uploads** (UI only; just
captures the filename, no real file storage):
1. Firm registration certificate
2. Citizenship document
3. PAN certificate
4. Latest audit report
5. Tax clearance certificate — with a note that it must cover **at least 1
   completed financial year**, not just the current year.

(Note: an earlier standalone "business PAN number" *text field* on the
Eligibility screen was intentionally removed once the "PAN certificate"
upload was added, since the upload was judged to make the typed field
redundant. The personal PAN number field on the KYC screen was kept as-is.)

## Lender data (illustrative/mock — not real rates)

Four real, licensed Nepali institutions are used as illustrative examples
in the "matched offers" flow, but **their shown interest rates, fees, and
ratings are fictional** — not their actual published rates. If this ever
becomes a real product, either get real partnership agreements with these
banks to show real rates, or switch back to fictional lender names to
avoid misrepresenting real institutions:

| Lender | Rate | Max amount | Service charge | Payout |
|---|---|---|---|---|
| Global IME Bank | 12.5% | Rs. 5,00,000 | 2.0% | 1 day |
| Nepal Bank Limited | 14.0% | Rs. 3,00,000 | 2.25% | 1 day |
| Muktinath Bikas Bank | 16.0% | Rs. 2,00,000 | 2.75% | 2 days |
| Reliance Finance | 17.5% | Rs. 4,00,000 | 3.0% | 2 days |

(Interest rates were deliberately kept in a 12–18% band; service charges
in a 2–3% band, per explicit requests.)

## NRB-licensed institution directory (real data, reference only)

Sourced directly from Nepal Rastra Bank's official list
(nrb.org.np, "mid-June 2026" snapshot). Shown in a browsable directory
screen, grouped by NRB's institution classes, **names only, no fabricated
rates attached**:

- **Class A — Commercial Banks** (20 institutions)
- **Class B — Development Banks** (17 institutions)
- **Class C — Finance Companies** (17 institutions)
- *(Class D — Microfinance Institutions, 51 institutions, was included
  originally but was explicitly removed later at the user's request.)*

⚠️ This list will drift out of date over time — Nepal's BFI sector sees
frequent mergers/license changes. Re-fetch from nrb.org.np if used beyond
a prototype.

## Design / visual direction

- **Brand name**: SAATHI (साथी — Nepali for "friend/companion").
- **Color palette**: crimson + blue only (inspired by the Nepal flag),
  **no green or yellow/gold anywhere** — this was an explicit late-stage
  requirement; all screens pull colors from one shared token object (`C`)
  so the whole app re-themes from a single place.
- **Home screen hero**: a crimson-to-blue gradient panel, clipped into the
  Nepal flag's double-pennant silhouette, with a decorative bottom
  illustration depicting Nepal's three geographic bands in layered
  silhouette — snow-capped Himalayan peaks, foothills, and the flat Terai
  plain — with a winding river motif. (An earlier version had a literal
  sun/moon emblem in the corner; that was explicitly removed in favor of
  more vibrant color blocking instead.)
- **Typography**: Space Grotesk for headlines/numbers, IBM Plex Sans for
  body text (with Noto Sans Devanagari as fallback for Nepali script).
- **Currency formatting**: kept as "Rs. 1,50,000" (Western numerals, Indian-
  style digit grouping which Nepal also uses) in both languages — a
  deliberate scope-reduction decision, not a translation gap.

## Bilingual support (English / Nepali)

- Full English/Nepali toggle (small "नेपाली"/"English" pill button next to
  the notification bell on the Home screen), backed by a React Context
  (`LangContext`) and a flat translation-key dictionary (`STRINGS.en` /
  `STRINGS.ne`), consumed via a `useT()` hook in every screen.
- Translated: all headings, labels, buttons, notes, consent text,
  employment-type options, business-type dropdown, city names (shown in
  Devanagari script when Nepali is active, e.g. "Kathmandu" → "काठमाडौं").
- **Deliberately left in English in both languages** (proper nouns /
  official names, or to avoid transcription inaccuracy): bank/lender
  names, NRB directory institution names.

## Known limitations / things flagged during development (still true)

- This is UI only — no backend, no real KYC/credit-bureau/payment
  integration, no data persistence.
- Real launch in Nepal would require: choosing a business model (pure
  referral vs. licensed PSP/aggregator), actual partnership agreements with
  each bank shown, a lawyer's confirmation of the exact licensing path,
  real backend + payment rail + e-KYC integration, and security/compliance
  work before any bank would connect to it. (See the "Model 1 vs Model 2"
  and "NRB Digital Lending Guideline" discussion earlier in this project's
  history for the fuller regulatory breakdown.)
- The phone-frame mockup wrapper is fixed-size (380×720px) and not
  responsive — intentional for demo purposes, but would need to be
  stripped out / made responsive for a real mobile deployment.
