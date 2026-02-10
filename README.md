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
2. Set up environment variables
   - Create a `.env` file in the root directory
   - Add your configuration:
   ```
   # Application Password Protection (required)
   VITE_APP_PASSWORD=your-secure-password-here
   
   # OpenAI API key (optional - for AI folder conversion)
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   
   # API base (frontend -> backend)
   VITE_API_BASE_URL=/api
   
   # Backend / database
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cybersentry_dev?schema=public
   CORS_ORIGIN=http://localhost:5173
   PUBLIC_API_BASE_URL=http://localhost:4000
   ```
   - **Password Protection**: Set `VITE_APP_PASSWORD` to protect the application. If not set, defaults to `CyberSentry2024!`
   - **OpenAI API Key**: Get your API key from https://platform.openai.com/api-keys
   - Note: Without OpenAI key, folder uploads will use raw files instead of AI-generated summaries
3. Run dev server
```bash
npm run dev
```
4. Run API server (separate terminal)
```bash
npm run dev:server
```
5. Build for production
```bash
npm run build && npm run preview
```

## Backend (API + Database)
This repo includes an Express + Prisma API to replace the in-memory admin data with a real database.

### Local database (Postgres)
You can use any local Postgres instance. Example with Docker:
```bash
docker run --name cybersentry-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cybersentry_dev -p 5432:5432 -d postgres:16
```

Then run migrations:
```bash
npm run prisma:migrate
```

### Production database
Set `DATABASE_URL` to your production Postgres instance in your hosting environment. Keep the same schema and run migrations during deployment.

### File storage (consent agreements)
Consent files are stored in the database as binary blobs for this MVP. For larger files or higher scale, move files to object storage (S3/Supabase Storage) and store only metadata + URL in the database.

## Password Protection
The application is protected by a password prompt that appears before accessing any page. 
- Password is stored in `VITE_APP_PASSWORD` environment variable
- Default password (if not set): `CyberSentry2024!`
- Authentication is stored in sessionStorage (cleared when browser session ends)
- All routes are protected - users must enter the password to access the application

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
