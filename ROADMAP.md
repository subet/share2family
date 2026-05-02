# Share2Family Roadmap

## V1 — Ship (current)

### Done
- [x] Expo project setup (SDK 54, TypeScript strict, NativeWind v4)
- [x] Supabase schema (profiles, families, family_members, categories, notes, checklist_items, item_history)
- [x] RLS policies for all tables
- [x] Postgres triggers (max_members enforcement, invite code invalidation, auto-timestamps)
- [x] Anonymous auth flow with profile creation
- [x] Apple Sign-In + Google Sign-In (upgrade from anonymous)
- [x] Profile setup screen (name + emoji picker)
- [x] Family creation with invite code generation
- [x] Family join via invite code entry
- [x] Home screen with checklist cards + category filter chips
- [x] Create checklist bottom sheet (title, emoji, category)
- [x] Checklist detail screen with add/check/delete items
- [x] Smart suggestions from item_history
- [x] Real-time sync via Supabase Realtime
- [x] Presence indicators
- [x] Settings screen (profile, family, theme, sign out)
- [x] Light/dark theme with system default + manual override
- [x] Haptic feedback on interactions

### Remaining for ship
- [ ] Connect to production Supabase instance
- [ ] Test full pairing flow on two real devices
- [ ] Subtle Reanimated animations (item add/complete/delete transitions)
- [ ] Onboarding screen illustrations (currently emoji placeholders)
- [ ] App icon and splash screen
- [ ] EAS build configuration and TestFlight/internal testing
- [ ] Bug fixes from real usage

## V2 — Family & Notes

- [ ] Plain text notes (body_markdown in note_content table)
- [ ] Family management UI: 3-5 members, invite/remove, roles
- [ ] Per-note permissions
- [ ] User-managed categories (CRUD)
- [ ] Push notifications (expo-notifications)
- [ ] Archive view (see soft-deleted notes)
- [ ] Supabase Edge Function: auto-hard-delete after 30 days

## V3 — Monetization & Growth

- [ ] RevenueCat paywall: family tier (3+ members), unlimited notes, custom categories
- [ ] Multiple families per user
- [ ] Web companion app
- [ ] Widgets (iOS/Android)
- [ ] Voice input for quick item add
- [ ] Receipt scanning

## Future

- [ ] Recipe note type
- [ ] Movie/book note type with metadata
- [ ] ML-based auto-categorization
- [ ] Shared calendar view
