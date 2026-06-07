# Site Management → No-Code Visual Website Builder

The current Site Management module is ~2,900 lines spanning `SiteManagementFlow.tsx`, three editors under `site-management/`, and `site-management.functions.ts`. Your spec is essentially a full visual CMS (Webflow/Framer scale). Building it all in one pass would take many turns, risk regressions across the admin, and require ~10–15 new DB tables. I recommend phasing it.

## Phase 1 — Visual shell + Pages CRUD (this turn)

Match the reference screenshot's layout and ship the foundation everything else hangs off:

- Redesign `SiteManagementFlow.tsx` header: "VISUAL WEBSITE BUILDER" eyebrow, "Live publishing" pill, gradient hero card matching the mock.
- New 5-tab layout: **Sections · Theme · Nav & Footer · Media · History**.
- Pages panel (left column of Sections tab):
  - List from new `site_pages` table
  - Add / rename / delete / duplicate / set-homepage
  - Drag-to-reorder (dnd-kit, already in repo)
  - URL slug + SEO title/description per page
- "YOU CAN EASILY" feature strip at the bottom (matches mock).
- Light + dark mode polish using existing tokens.

DB additions (one migration):
- `site_pages` (id, slug unique, title, is_home, seo_title, seo_description, sort_order, status, timestamps)
- `site_page_sections` (id, page_id fk, kind, content jsonb, sort_order, visible)

## Phase 2 — Section editor + drag-reorder (next turn)
- Hero / Features / About / Courses / FAQ / CTA / Contact / Custom section schemas
- Inline edit panel, hide/show, duplicate, delete, dnd reorder
- Image picker wired to existing storage

## Phase 3 — Theme Builder (later)
- Colors (primary/secondary/accent), font family, sizes, radius, button style
- Persists to `site_themes`, applied via CSS vars

## Phase 4 — Nav & Footer Builder
- Menu items, dropdowns, footer columns, social links → `site_nav_items`, `site_footer_*`

## Phase 5 — Media Library
- Storage bucket + grid view, upload/replace/delete/copy URL, search

## Phase 6 — Live preview (Desktop/Tablet/Mobile) + Publish workflow + Version History
- `site_versions` snapshots, restore, diff

## What I'd skip / defer
- Full visual canvas (drag blocks onto a WYSIWYG page) — out of scope for an admin module; sections-list with structured editors gives 90% of value at 10% of effort.
- Per-section custom CSS / scripts — security risk, not requested.

## Confirm before I start

1. **OK to proceed with Phase 1 only this turn** (visual shell + Pages CRUD + migration)? Phases 2–6 follow in subsequent turns.
2. Or do you want me to **collapse Phases 1–3 into one turn** (bigger migration, more code, longer build wait)?
3. Anything in Phases 4–6 you want bumped up?

Reply "Phase 1" / "1+2+3" / custom and I'll execute.
