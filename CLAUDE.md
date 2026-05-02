# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Share2Family is a shared notes and lists app for couples and families with real-time sync. Built with Expo (SDK 54) and Supabase.

- **Bundle ID iOS:** com.mudimedia.share2family
- **Package Android:** com.mudimedia.share2family
- **V1 scope:** Checklist-only, 2-person families, anonymous auth with optional Apple/Google upgrade, real-time sync, no paywall, no notifications

Design mockup: `../res/Mockup.png`

## Development Commands

```bash
npx expo start              # Start dev server
npx expo run:ios             # Run on iOS
npx expo run:android         # Run on Android
npx tsc --noEmit             # Type-check
npm run lint                 # ESLint
npm run format               # Prettier
npm run db:types             # Regenerate Supabase types from local instance
```

## Tech Stack

- **Framework:** Expo SDK 54, React Native 0.81, TypeScript strict
- **Routing:** expo-router v6 (file-based, typed routes)
- **Backend:** Supabase (auth + Postgres + Realtime)
- **UI state:** Zustand v5 (auth, ui, family stores — NO server state)
- **Server state:** TanStack Query v5 (queries, mutations, optimistic updates)
- **Styling:** NativeWind v4 (Tailwind for RN) + StyleSheet for complex styles
- **Storage:** react-native-mmkv (NEVER AsyncStorage)
- **Lists:** @shopify/flash-list v2 (NEVER FlatList)
- **Animations:** react-native-reanimated v4 (subtle, calm — no bouncy springs)
- **Bottom sheets:** @gorhom/bottom-sheet v5
- **Auth:** Supabase Auth (anonymous default, Apple/Google upgrade)
- **i18n:** i18n-js v4 with Zustand-reactive useTranslation() hook, 16 languages
- **Notifications:** expo-notifications (push token registration, foreground handling)
- **Icons:** @expo/vector-icons (Ionicons) — NO emoji icons in UI

## Architecture

```
app/                    # expo-router file-based routes
  (auth)/               # Onboarding, sign-in, profile setup
  (family)/             # Create/join family, invite code, success
  (app)/                # Main app: home, checklist detail, settings
src/
  features/             # Domain modules (families, notes, checklists, sync)
    */api.ts            # Supabase queries
    */hooks/            # TanStack Query hooks
  components/ui/        # Shared primitives (Button, Input, EmptyState, CategoryChip)
  stores/               # Zustand (auth.ts, ui.ts, family.ts)
  lib/                  # Supabase client, MMKV, haptics, auth, theme hook, query client
  theme/                # Colors, typography, spacing, radii
  types/database.ts     # Supabase-generated types (regenerate after migrations)
  constants/            # Categories, emojis, invite code config
supabase/
  migrations/           # Versioned SQL (001_schema, 002_rls, 003_functions)
  config.toml           # Local Supabase config
```

## Key Decisions

- **Path alias:** `@/*` → `./src/*`
- **Data model:** Generic `notes` table with `type` field. V1 only allows 'checklist'. V2 adds 'text' etc. via `note_content` side table (already created but unused).
- **Family member limit:** Enforced BOTH in app code AND via Postgres trigger (`trg_enforce_max_members`). Never trust the client.
- **Invite codes:** 6 chars, format `XK3-PQ7`, avoid ambiguous chars (0/O/1/I/L). Single-use, no expiry.
- **Soft delete:** Notes use `archived_at` instead of hard delete.
- **Real-time:** Supabase Realtime channels per family_id for notes + checklist_items + family_members.
- **Optimistic updates:** Toggle/delete checklist items use TanStack Query optimistic mutations with rollback.
- **Smart suggestions:** `item_history` table tracks per-family item usage. Prefix-match top 3 on input.
- **Design tokens:** bg #FAFAF7/#0F0F0F, text #1A1A1A/#F5F5F0, accent #D97757, radii 14/10/22px.

## Current Phase

Phase 1A+1B+1C complete — foundation, auth, family pairing, core checklist flow, real-time sync, settings, i18n (16 languages), push notifications, swipe gestures. TypeScript compiles clean. Connected to production Supabase.

**Next:** Polish animations, app icon, EAS builds, test with partner on two devices.

## What NOT To Do

- Do NOT add paywall, notifications, or v2 features to v1 UI
- Do NOT use AsyncStorage (use MMKV)
- Do NOT use FlatList (use FlashList)
- Do NOT put server state in Zustand (use TanStack Query)
- Do NOT use bouncy/flashy animations — keep them subtle and calm
- Do NOT over-engineer — senior-level, not staff-level
