# Hosting Location & Data Residency (Compliance)

This document captures the current hosting/data locations and required actions to meet UK/EU residency requirements.

## Target
- **Hosting region:** UK (preferred) or EU (minimum).
- **Database region:** UK or EU.
- **Report storage region:** UK or EU.

## Current Architecture (High Level)
1. **Frontend UI:** Served by Render (Netlify only redirects traffic).
2. **Backend API:** Render.
3. **Database:** Supabase Postgres.
4. **Report metadata:** Stored in Postgres (`Report` table fields like `reportFile`, `rawDataFile`).
5. **Consent files:** Stored directly in Postgres (bytes).

## Required Actions
### 1) Hosting Region (Render)
- **Action:** Ensure the Render service is deployed in a UK or EU region.
- **If current service is outside EU:** Create a new Render service in an EU region and cut over.
- **Evidence to capture:** Render service region screenshot or service settings export.

### 2) CDN / Public Access
- **Action:** Ensure Netlify only redirects and does not serve content.
- **Evidence to capture:** Netlify `_redirects` / `netlify.toml` showing full redirect to Render.

### 3) Supabase Region
- **Action:** Confirm the Supabase project region in **Supabase → Settings → General → Region**.
- **If current project is outside EU:** Create a new EU project, migrate data, and update `DATABASE_URL`.
- **Evidence to capture:** Supabase settings screenshot showing region.

### 4) Report Storage Location
- **Current:** The app stores report references in Postgres (`reportFile`, `rawDataFile`).  
  Actual file storage location depends on where the file is generated and stored.
- **Action:** Store report files in an EU/UK location:
  - Supabase Storage (EU project), or
  - S3 (EU region), or
  - Another EU-compliant object storage provider.
- **Evidence to capture:** Storage bucket region and access policy.

## Compliance Checklist (Fill When Verified)
- [ ] Render service region confirmed in UK/EU: __________
- [ ] Netlify redirect-only confirmed: __________
- [ ] Supabase project region confirmed in UK/EU: __________
- [ ] Report storage location confirmed in UK/EU: __________

## Notes
- IP allowlist enforcement is handled at the Render service, which means **hosting region must be EU/UK** to satisfy compliance for portal access.
- If any component must remain outside EU/UK, document a justification and risk acceptance.
