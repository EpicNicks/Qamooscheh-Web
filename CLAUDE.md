# Qamooscheh-Web

Web client for the Qamooscheh backend. Related repos:

- Backend (owns the API contract, `src/Qamooscheh.Api/API_SPEC.md`): `C:\Users\epicn\source\repos\Qamooscheh` (github.com/EpicNicks/Qamooscheh-Backend). The README's `../../Qamooscheh` path is out of date.
- Android client: `E:\Code\Projects\Qamooscheh-Android`

## Feature ledger

The backend repo's `features.yaml` is the authoritative record of which features exist on `backend`, `web` and `android`: `implemented`, `not_yet`, `declined` (with a `reason`) or `n/a`. Its header holds the full rules.

- When work here lands, drops or declines a user-facing feature, update that entry's `web` key in the backend repo as part of the same task. If the feature isn't listed, add an entry with honest statuses for the other surfaces (usually `not_yet`).
- Edit only the `web` key of an existing entry. Backend and Android own theirs.
- If the change gives Android something to catch up on, message the Android Claude session if one is running (find it with ListAgents). Otherwise mention it to the user.
