# CyberSentry — AI Pen Test Platform (MVP)

A white-labelable, self-serve platform for automated AI-powered penetration testing. Built with React, TypeScript, Vite, Tailwind CSS.

## Features (MVP)
- Landing with domain entry and trust badges
- Domain validation flow: Email or DNS TXT
- Free scan results: AI Recon Score + top findings teaser
- Checkout with upsell toggles (Stripe placeholder)
- Customer Dashboard: score trend + vulnerabilities table
- Report Viewer: executive summary, severity matrix, export button
- Admin Console: trigger tests, manage tenants (placeholder)
- Reseller Branding: logo/name/color/subdomain (UI)

## Tech Stack
- React 18, TypeScript, Vite 5
- Tailwind CSS 3
- Zustand (state), React Router 6
- Recharts (charts), Lucide (icons)

## Getting Started
1. Install dependencies
```bash
npm install
```
2. Set up OpenAI API key (for AI folder conversion)
   - Create a `.env` file in the root directory
   - Add your OpenAI API key:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```
   - Get your API key from: https://platform.openai.com/api-keys
   - Note: Without this key, folder uploads will use raw files instead of AI-generated summaries
3. Run dev server
```bash
npm run dev
```
4. Build for production
```bash
npm run build && npm run preview
```

## Project Structure
```
src/
  components/
    layout/            # Navbar, Footer, AppLayout
  pages/               # Route pages for each module
  services/            # Mock APIs for validation/scan/checkout
  state/               # Zustand store
  utils/               # Branding helpers
  App.tsx              # Routes
  main.tsx             # Entry
  styles.css           # Tailwind
```

## Stripe Integration (Placeholder)
- The Checkout page calls a mock `createCheckoutSession` which redirects to `/dashboard`.
- Replace with server endpoint to create a real Stripe Checkout Session and redirect to `session.url`.
- Add `@stripe/stripe-js` publishable key and `@stripe/react-stripe-js` if using Elements.

## White-Labeling
- Basic demo via `getBrandingFromHostname(hostname)` in `src/utils/branding.ts`.
- Replace with tenant/reseller lookup from your backend and apply theme tokens globally.

## Domain Validation (MVP)
- Email validation and DNS TXT are simulated via `src/services/api.ts`.
- Replace with real email service and DNS check (e.g., RR lookup) on server.

## Reports & PDFs
- The Report Viewer shows sections/UI placeholders.
- PDF generation uses `@react-pdf/renderer` for client-side PDF creation.
- **Folder Upload & AI Conversion**: 
  - Upload folders with penetration test data structure (report/, target_*/recon/)
  - AI automatically converts folder contents into a professional 4-5 page summary
  - Uses OpenAI GPT-4o to analyze files and generate structured reports
  - Requires `VITE_OPENAI_API_KEY` environment variable
  - Falls back to raw file display if AI is unavailable

## Security Notes
- Do not run real scans from the client. Implement scanning, DNS validation, and email dispatch on a secure backend.
- Enforce auth, rate limiting, and tenant isolation in production.

## Deployment
- Static hosting (Vercel/Netlify) for the frontend.
- Configure backend endpoints for real validation, scans, and Stripe.

## License
Proprietary — All rights reserved.
# pentest-to-pdf
