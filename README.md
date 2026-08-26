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
- `src/domain/` — enums mirrored from `Qamooscheh.Domain`, plus pure client-side logic that re-derives server rules for display purposes only (`pathProgress.ts`'s skill-unlock gate, `exerciseResolution.ts`'s composite-exercise mode picker) — every one of these is re-checked authoritatively server-side.
- `src/hooks/` — TanStack Query hooks per feature, plus `useLessonEngine.ts` (the session/lesson state machine) and `useCheckpoint.ts` (the placement-test flow).
- `src/auth/` — token persistence + refresh, `RequireAuth` route guard.
- `src/components/`, `src/pages/` — UI, grouped by feature (`lesson/`, `path/`, `layout/`, `common/`).

## Status

This is the general-purpose scaffold: auth, bootstrap, the skill path, the lesson engine (word bank / type-in / match / speak), checkpoints, profile, friends, and leagues, all wired to the real API contracts. Deliberately not yet built: anything Persian- or Japanese-specific (native-script keyboards, romanization display, RTL layout, per-language answer normalization) — that's the next pass, layered on top of this generic core rather than baked into it.
