# Qamooscheh-Web

Web client for the Qamooscheh backend. Related repos:

- Backend (owns the API contract, `src/Qamooscheh.Api/API_SPEC.md`): `C:\Users\epicn\source\repos\Qamooscheh` (github.com/EpicNicks/Qamooscheh-Backend). The README's `../../Qamooscheh` path is out of date.
- Android client: `E:\Code\Projects\Qamooscheh-Android`

## Feature ledger

The backend repo's `features.yaml` is the authoritative record of which features exist on `backend`, `web`, `android` and `ios`: `implemented`, `not_yet`, `declined` (with a `reason`) or `n/a`, plus each feature's behavioural rules (`behaviour`), accepted cross-surface differences (`parity`) and the product `glossary`. Its header and `docs/ledger.md` hold the full rules.

- When work here lands, drops or declines a user-facing feature, update that entry's `web` key in the backend repo as part of the same task. If the feature isn't listed, add an entry with honest statuses for the other surfaces (usually `not_yet`).
- Edit only the `web` key of an existing entry. Backend and Android own theirs.
- If the change gives Android something to catch up on, message the Android Claude session if one is running (find it with ListAgents). Otherwise mention it to the user.

## Terminology

User-facing copy (visible text, aria-labels, titles, alt text) uses these terms. Code identifiers, file names, CSS classes, routes, query keys, storage keys and API fields keep `lesson`/`remix`.

- **Parsle**: a lesson inside a unit on the journey (a play on parcels). Also covers a custom grouping of lessons made in Repack; a constructed Repack is itself a custom Parsle. Capitalised as a proper term; plural "Parsles".
- **Repack**: the former "Remix". The planned timed mode is the "Repack race".
- The recap card has no "Lesson complete" heading; result-specific titles ("Perfect Delivery!", "Not passed yet") stay.
- Work that lands or changes a user-visible or contract-visible rule (XP, cooldown, threshold, copy, ordering, default, privacy) also adds or updates that feature's `behaviour` entries, and `parity` entries for intentional differences from other surfaces, with `decided` and `by`, in the same task.
- Read the ledger's `glossary` for product terms (Parsle, Repack) before writing user-facing copy.
- A new feature entry must include the `ios` key as `not_yet`.
