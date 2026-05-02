# Share2Family

A shared notes and lists app for couples and families with real-time sync.

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g eas-cli`
- Supabase CLI: `brew install supabase/tap/supabase`
- iOS: Xcode 15+ (for simulator/device builds)
- Android: Android Studio (for emulator/device builds)

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Set up Supabase locally

```bash
supabase init   # if not already initialized
supabase start  # starts local Supabase (Postgres, Auth, Realtime)
```

Apply migrations:

```bash
supabase db reset  # applies all migrations from supabase/migrations/
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in values from `supabase status`:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-from-supabase-status>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-google-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your-google-ios-client-id>
```

### 4. Generate TypeScript types

```bash
npm run db:types
```

This overwrites `src/types/database.ts` with types generated from the local schema.

### 5. Run the app

```bash
npx expo start
```

Press `i` for iOS simulator or `a` for Android emulator.

### 6. Build for devices

```bash
eas build --platform ios --profile preview    # TestFlight
eas build --platform android --profile preview # Internal testing
```

## Project Structure

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation.

## Key Commands

| Command | Description |
|---------|-------------|
| `npx expo start` | Start dev server |
| `npx expo run:ios` | Build and run on iOS |
| `npx expo run:android` | Build and run on Android |
| `npx tsc --noEmit` | Type-check |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run db:types` | Regenerate Supabase types |
| `supabase db reset` | Reset local DB with migrations |
