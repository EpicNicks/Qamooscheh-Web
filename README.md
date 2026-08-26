# Qamooscheh Web

A Duolingo-style web client for the [Qamooscheh](../../Qamooscheh) backend (ASP.NET Core API + CDN-hosted course content). React 19 + TypeScript + Vite, React Router for navigation, TanStack Query for server state, plain CSS Modules for styling.

## Setup

```
npm install
cp .env.example .env.local   # point at your local Qamooscheh.Api + artifacts server
npm run dev
```

`Qamooscheh.Api` must be running (`dotnet run` from the backend repo, default `http://localhost:5239`), and the backend's `artifacts/` folder needs to be served as static files somewhere the browser can fetch it directly — the API is never on the content read path (`API_SPEC.md` §1), so this client fetches course JSON straight from that origin.

## Layout

- `src/api/` — one module per backend controller, all going through `httpClient.ts` (bearer-token injection, 401-refresh-and-retry) except `content.ts`, which talks to the CDN artifact origin instead.
- `src/types/api.ts` / `src/types/content.ts` — wire types mirrored field-for-field from the backend's `*Contracts.cs` records and `Qamooscheh.Content`'s artifact records. Keep these in sync by re-reading those files, not by guessing.
- `src/domain/` — enums mirrored from `Qamooscheh.Domain`, plus pure client-side logic that re-derives server rules for display purposes only (`pathProgress.ts`'s skill-unlock gate and arc grouping, `roadLayout.ts`'s branching-road geometry, `exerciseResolution.ts`'s composite-exercise mode picker, `answerFeedback.ts`'s instant-feedback dispatcher) — every one of these is re-checked authoritatively server-side. `domain/language.ts` maps course code to writing direction/font; `domain/persian/` is a faithful TS port of `Qamooscheh.Persian`'s normalization tiers and comparators, for feedback only.
- `src/hooks/` — TanStack Query hooks per feature, plus `useLessonEngine.ts` (the standard lesson state machine), `useSkillWalkthrough.ts` (the simpler story/conversation/song read-through, sharing the same submit path), `useCheckpoint.ts` (the placement-test flow), and `useSkipConfirmation.ts` (the shared "skip this lesson/chapter" confirm-and-remember flow).
- `src/theme/` — `PathThemeProvider`, the swap point for a themeable path: one `PathTheme` (layout numbers, per-category icons, an optional background motif) drives both the branching road and the CSS custom properties path components read. Ships with one neutral default this pass.
- `src/auth/` — token persistence + refresh, `RequireAuth` route guard.
- `src/components/`, `src/pages/` — UI, grouped by feature (`lesson/`, `path/`, `layout/`, `common/`). `path/` is the branching road (`SkillRoad`) plus the arc-grouped list (`SkillList`) for everything that isn't a standard skill; `pages/StoryPage.tsx` is where a story/conversation/song skill is actually taken.

## Status

The general-purpose core is built: auth, bootstrap, the skill path, the lesson engine (word bank / type-in / match / speak), checkpoints, profile, friends, leagues, and settings (`GET`/`PUT /v1/prefs`), all wired to the real API contracts.

The first language-specific pass — Persian — is also done: RTL layout and native font stack for exercise content (`DirectionalText`), a tap-to-type Persian keyboard respecting `keyboard_mode` (contextual vs. isolated/ZWNJ-separated), a vocabulary panel surfacing the lexeme index's gloss/romanization, inline "Arabic vs. Persian codepoint" correction hints as the learner types, and instant correct/accepted-with-correction/incorrect feedback driven by a verified TS port of `Qamooscheh.Persian`'s normalizer and comparators (never authoritative — the server re-grades every submission).

The offline submission queue now flushes itself: `useOfflineQueueFlush` (mounted once in `AppShell`) retries on every browser `online` event and on same-tab queue changes, merges returned card state, and surfaces a small "N pending sync" badge while sessions are queued.

Google sign-in is wired up (`GoogleSignInButton` on both Login and Register — one button covers both, since `AuthService.GoogleSignInAsync` creates a new account the first time a Google identity is seen). Hidden entirely when `VITE_GOOGLE_CLIENT_ID` is unset.

The path screen is a themed, branching road: standard skills render as a winding SVG path (`SkillRoad`) where alternate skills sharing a position — the backend's `UnitPosition` grouping — fork and reconverge, both readable as `current` simultaneously ("do either to advance"). Story/conversation/song skills sit in a separate flat list (`SkillList`) below the road, nested under a rail when several share an `arc` (a continuing narrative — e.g. a few chapters following the same characters). Those skills are now actually completable: `/story/:unitKey/:skillKey` fetches one skill straight from the CDN and reads it start to finish (no due-tag filtering, no retry queue), submitting through the same endpoint a standard lesson does. Both the lesson and story screens offer a "Skip" affordance behind a confirm modal, with a "don't ask again" preference kept local to the browser (`localAppPrefs.ts`) rather than synced to the account.

Not yet built: Japanese-specific rendering (kana/kanji display, romaji toggle, IME-friendly input) — the same pattern as the Persian pass, layered on top of the generic core rather than baked into it. Also open: a `special`/misc skill category (content outside the normal progression, e.g. slang or idioms) — the schema's `category` is a fixed enum today, but the path/list rendering built for story/conversation/song is already category-agnostic below the standard/non-standard split, so a new value there would need no new client-side unlock logic, just a schema value, a theme icon, and content.
