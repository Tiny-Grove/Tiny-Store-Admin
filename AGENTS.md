<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Supabase migrations

This repo's `supabase/migrations/` must always match what's actually applied to the linked Supabase project (`vjcvneazgpaerhmuzmds`) exactly — CI fails with "Remote migration versions not found in local migrations directory" whenever they drift, and this has already happened twice.

Rule: **the moment you run `supabase db push` against this project, commit the new migration file(s) in the same sitting** — before moving on to anything else, and even if you end up reverting the change later (revert with a new migration, don't just delete the file and walk away). Do not apply schema changes via the Supabase dashboard SQL editor for this project; always create a migration file first (`supabase migration new <name>`) and push it through the CLI so it's tracked from the start.

If you inherit a drifted repo (CI failing with the error above), the fix is:
1. `supabase link --project-ref vjcvneazgpaerhmuzmds`
2. `supabase migration fetch --linked` — pulls down any remote migrations missing locally
3. Verify the tables/columns your local-only migrations describe already exist live (spot-check a few via the REST API) before the next step
4. `supabase migration repair --status applied <versions...> --linked` — for local-only migrations confirmed already applied, syncs the bookkeeping without re-running SQL
5. `supabase db push --dry-run --linked` — should report "Remote database is up to date"
