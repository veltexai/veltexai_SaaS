# CLAUDE.md – Veltex Services (Veliz)

## Project Overview

A production Next.js 15 SaaS product that generates AI-powered cleaning proposals for commercial and residential service businesses. Users fill out a form, OpenAI generates rich proposal content, and the result is rendered via branded PDF-ready templates. Paid plans are gated via Stripe subscriptions.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Payments | Stripe (subscriptions + webhooks) |
| AI | OpenAI (`openai` SDK) |
| Email | Resend + Nodemailer |
| PDF | Playwright + `@sparticuz/chromium`, `jspdf`, `html2canvas-pro` |
| Forms | `react-hook-form` + `zod` |
| Animations | Framer Motion, Lenis |
| Package manager | **pnpm** (never create `package-lock.json`) |

## Folder Structure

```
app/                         # Next.js App Router routes
  (dashboard)/               # Authenticated dashboard pages (route group)
  dashboard/                 # Alternate dashboard layout
  api/                       # API route handlers
  auth/                      # Login / signup / reset pages
  demo-proposal/             # Public demo flow (no auth required)
  admin/                     # Internal admin panel
  print/                     # Headless print routes for PDF generation

features/                    # Feature modules (domain-driven)
  admin/                     # Admin panel features
  auth/                      # Auth forms, actions, constants
  billing/                   # Stripe billing UI
  dashboard/                 # Dashboard overview
  demo-proposal/             # Demo experience (isolated, no real data)
    components/              # Demo-specific UI components
    constants/               # Static mock data
    utils/                   # Pure helpers
    lib/                     # Small libraries / accent helpers
    types/                   # Feature-scoped types
    index.ts                 # Public barrel export
  emails/                    # Email templates
  home/                      # Landing page sections
  pricing/                   # Pricing page
  proposals/                 # Proposal creation and management
  settings/                  # User settings
  templates/                 # Proposal template renderers (PDF-grade)
    components/              # basic | executive_premium | modern_corporate | luxury_elite
    components/sections/     # Section-level sub-components
    components/shared/       # Shared template primitives
    constants/               # TOC, term content, icon maps
    hooks/                   # use-template-data, use-split-content, use-templates
    services/                # template-service, print-data-service
    types/                   # TemplateProps, TemplateType, Branding
    utils/                   # parse-inline, split-scope-rows, splitters, etc.

components/
  ui/                        # shadcn/ui component library (do not refactor)
  icons/                     # SVG icon components

lib/
  fonts.ts                   # Google Fonts + Bely/Arvo/Montserrat loaders
  utils/                     # cn(), format*, date*, frequency utils

providers/                   # React context providers (theme, Supabase)
queries/                     # Server-side Supabase query helpers
types/                       # Global TypeScript types (database.ts, proposal.ts)
config/                      # App config (domain, env)
supabase/                    # Supabase client helpers (server, browser, middleware)
public/images/templates/     # Template background images (do not delete)
```

## Conventions

- **Barrel exports**: Every feature has `features/<name>/index.ts`. Import from the barrel, not deep paths.
- **"use client"** at top of any component using hooks, event handlers, or browser APIs.
- **Server Components**: API routes, page.tsx files, and layout.tsx are Server Components by default.
- **Naming**: Components `PascalCase.tsx`, utilities `kebab-case.ts`, constants `SCREAMING_SNAKE_CASE`.
- **Types**: No `any`. Use `Json` from `@/types/database` for Supabase JSON columns.
- **CSS**: Tailwind utility classes. No custom CSS files unless extending globals.css. Use `cn()` from `@/lib/utils/cn` for conditional class merging.
- **Icons**: `lucide-react` for UI icons, `@/components/icons` for custom SVGs.

## Template System

Templates (`basic`, `executive_premium`, `modern_corporate`, `luxury_elite`) are paper-layout React components (`aspect-[1/1.4]` per page). They accept `TemplateProps`:

```typescript
{
  proposal: Proposal & { template?: ProposalTemplateRow | null };
  branding?: Branding;
  pages?: string[];   // Static content (bypasses API fetch when print=true)
  print?: boolean;    // If true + pages provided → uses pages[], skips split API
}
```

When `print=true` and `pages` is provided, `useTemplateData` uses static content directly and `useSplitContent(id)` won't fetch if `id` is empty string (falsy guard inside the hook).

**Pages array index mapping:**
- `[0]` About Our Company
- `[1]` Our Commitment
- `[2]` Why Choose Us
- `[3]` Scope of Service (supports `veliz_scope_table` JSON fenced block)
- `[4]` Add-ons
- `[5]` Service Quote & Pricing (supports `veliz_pricing_table` JSON fenced block)
- `[6]` Notes (optional)

## Safe Development Rules

1. **Read before edit.** Always `Read` a file before using `Edit`.
2. **No duplicate logic.** Check features/demo-proposal before writing new utilities. If a helper exists in `lib/utils`, use it.
3. **No barrel pollution.** Only export from `index.ts` what is needed by external consumers.
4. **Scope changes.** A bug fix in demo-proposal must not touch proposals/, templates/, or auth/ unless the fix is directly required.
5. **Type-check your work.** After changes, run `pnpm build` or `pnpm tsc --noEmit` to verify no type errors.
6. **No package-lock.json.** Project uses pnpm exclusively.

## Production Safety Rules

These files and patterns must **never** be modified as a side-effect of demo work:

| Area | Files / Patterns |
|---|---|
| Stripe | `app/api/stripe/`, `app/api/webhooks/stripe/`, any Stripe SDK import |
| Supabase writes | `.insert()`, `.update()`, `.upsert()`, `.delete()` calls anywhere outside demo |
| OpenAI | `app/api/proposals/generate/`, `openai` SDK imports |
| Auth | `features/auth/actions/`, `middleware.ts`, `supabase/` client config |
| Trial usage | `app/api/usage/`, `app/api/cron/` |
| Real PDF gen | `app/api/proposals/[id]/download/`, `/export/`, `/print/` |
| Real proposal APIs | `app/api/proposals/` (any route other than demo-isolated ones) |

## Demo Isolation Rules

The `/demo-proposal` route is a **public, zero-auth page**. Any code under `features/demo-proposal/` and `app/demo-proposal/` must follow these rules:

1. **No API calls to production endpoints** – no `/api/proposals`, `/api/usage`, `/api/stripe`, etc.
2. **No Supabase reads or writes** – mock data only. `proposal.id = ""` prevents `useSplitContent` from fetching.
3. **No OpenAI calls** – all content is static constants.
4. **No auth checks or mutations** – the page must work for unauthenticated visitors.
5. **No trial usage increment** – `app/api/usage/increment` must never be called from demo flows.
6. **Template usage in demo**: Pass `print={true}` + static `pages[]` to template components. Set `proposal.id = ""`.
7. **Gated actions** (Save, Download, Send): Show sign-up modal only – no real operations.

## Testing / QA Checklist

Before merging any change to `demo-proposal`:

- [ ] `/demo-proposal` loads without auth
- [ ] Commercial Janitorial → Generate → ModernCorporateTemplate renders
- [ ] Residential → each of 4 packages selectable
- [ ] Residential → Generate → LuxuryEliteTemplate renders with correct content
- [ ] Save / Download / Send each open sign-up modal
- [ ] Modal can be dismissed
- [ ] No network calls to `/api/proposals`, `/api/usage`, `/api/stripe` in browser DevTools
- [ ] No TypeScript errors (`pnpm build` or `tsc --noEmit`)
- [ ] No console errors in browser

## Instructions to Avoid Duplicate Logic

- **Mock Proposal factory**: `features/demo-proposal/utils/get-demo-template-data.ts` – single source of truth for all demo mock data. Do not create another mock factory.
- **Residential packages**: `features/demo-proposal/constants/residential-packages.ts` – all 4 packages defined here.
- **Sign-up modal**: `features/demo-proposal/components/demo-signup-modal.tsx` – one modal component reused everywhere.
- **Action bar**: `features/demo-proposal/components/demo-actions.tsx` – reuses the modal via props.
- **Accent colors**: `features/demo-proposal/lib/demo-accent.ts` – single source for commercial (blue) / residential (emerald) theme tokens.
- **Auth routes**: Always import `AUTH_ROUTES` from `@/features/auth/constants` for sign-up / login URLs.
- **`cn()`**: Always `import { cn } from "@/lib/utils/cn"` – never inline clsx/twMerge directly.
