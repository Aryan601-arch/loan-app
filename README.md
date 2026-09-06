# SAATHI — Digital Lending Marketplace (Nepal)

A front-end UI prototype of a digital loan marketplace/aggregator app for
Nepal, inspired by apps like Buddy Loan (India). It is **not** a working
backend — no real lending, KYC verification, payments, or data persistence.
Everything runs in-memory and resets on page refresh.

See `SAATHI-project-spec.md` for the full product/business-logic spec this
prototype implements.

## Running locally

```bash
npm install
npm run dev
```

Open the printed local URL in your browser.

## Build

```bash
npm run build
npm run preview
```

## Notes

- The app is responsive: it fills the viewport on phones/small screens, and
  shows a phone-frame mockup on wider (desktop) screens for presentation.
- This is a prototype only. A real launch would require: a confirmed
  business model (referral vs. licensed PSP/aggregator), partnership
  agreements with each bank shown, legal confirmation of the licensing path,
  a real backend with payment rail + e-KYC integration, and a security/
  compliance review before any bank would connect to it.
