# Integration state — 2026-09-17

- GitHub: https://github.com/hugo-media/hugo-media-catalog
- Supabase existing project: `lukxdctqcaprfwfisblw` (`hugo-media-sales-os`).
- Applied migration: `hugo_catalog_initial_schema`.
- Catalog tables and Storage bucket created; existing CRM tables unchanged.
- Transactional RLS tests passed for anonymous, non-owner and temporary owner. All temporary auth/admin/product rows were rolled back. Confirmed zero users/admins/products afterwards.
- Security advisor: no catalog-specific findings. One pre-existing `public.set_updated_at` search-path warning was left untouched.
- Public Supabase settings stored in `public-config.json`; no secret/service-role key in code.
- Vercel preview request accepted: `dpl_MLWYGZWE7eN6kxyQttFrU6n5pLMh`.
- Preview URL returned: https://hugo-media-catalog-mfubm48p6-hugomedia.vercel.app
- Last confirmed deployment state: `INITIALIZING`. Do not claim READY yet.
- Vercel inspector: https://vercel.com/hugomedia/hugo-media-catalog/MLWYGZWE7eN6kxyQttFrU6n5pLMh
- Status inspection was denied with HTTP 403 for scope `hugomedia` (`team_G32K0IP4Pz1PQeOumrIIOgxj`). Read access must be authorized for that scope before status/log verification.
- Browser execution checks have not run: no local browser binary available; previous download was blocked/timed out.

## Remaining

1. Obtain actual owner email, create the owner's Supabase Auth account through the normal account setup flow, and add only its UUID to `hmg_catalog_admins`.
2. Verify deployment readiness after Vercel scope access is granted. Do not create duplicate projects/deployments just to work around the access denial.
3. Connect the Vercel project's Git integration to this GitHub repo if desired; the current API preview uploaded build files directly.
4. Perform real admin login/upload/persistence and customer/mobile tests. Import only verified current inventory and genuine photos.

## Owner provisioning — 2026-09-17

- The owner's Supabase Auth invitation was sent successfully and the administrator allowlist was populated.
- A database trigger limits automatic owner provisioning to the configured account. The address and internal Auth ID are intentionally omitted from this public repository.
- The one-time provisioning endpoint was immediately replaced by an HTTP 410-only implementation.
- The frontend accepts the invite callback and requires a password of at least 8 characters.
