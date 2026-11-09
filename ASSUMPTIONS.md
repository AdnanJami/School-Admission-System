# Assumptions

## Classes
- **Class names are unique** (trimmed, case-sensitive). A duplicate returns `409`. Two classes with the same name would be indistinguishable in the UI.
- **Validation:** name is required (whitespace-only is rejected) and limited to 200 characters; `totalSeats` must be at least 1. Invalid input returns `400` in the default ASP.NET problem-details shape.
- Unknown class id returns `404` with `{ "error": "Class not found." }`.

## Student identity
- `X-Student-Id` must be present exactly once and be exactly **17 digits**; otherwise the API returns `400`. It is required on apply, confirm, cancel and `/me/holds`. It is not required on `GET /holds/{holdId}` (the brief does not list it), so anyone with a hold id can read its status.

## Holds and expiry
- **Duration** comes from `HOLD_DURATION_SECONDS` (default 600). A non-numeric, zero or negative value stops the app at startup with a clear error.
- **A hold counts as held only while `Status = Held` and `ExpiresAt > now`.** Expired holds therefore free the seat immediately, even before cleanup runs. `GET /holds/{id}` and `/me/holds` likewise report such a hold as `EXPIRED`.
- A background service also writes the `EXPIRED` status to the database every 5 seconds, so no API call is needed for seats to return to the pool.
- **One active hold per student per class.** An active hold is `HELD` or `CONFIRMED`. After `EXPIRED` or `CANCELLED` the student can apply again. A student can hold seats in different classes at the same time.
- Applying when the class is full returns `409`; applying when the student already has an active hold in that class also returns `409`.

## Confirm and cancel
- **Confirm** only succeeds for the student's own, unexpired `HELD` hold.
  - Another student's hold: `403`.
  - Unknown hold: `404`.
  - Expired or cancelled hold: `409`.
  - A repeated confirm of an already confirmed hold returns `200` (idempotent) and does not add a seat.
- **Cancel** only works on the student's own, unexpired `HELD` hold and returns `204`.
  - A repeated cancel of an already cancelled hold returns `204`.
  - Cancelling a confirmed hold returns `409` (a paid admission cannot be cancelled; refunds are out of scope).
  - Another student's hold: `403`. Unknown hold: `404`. Expired hold: `409`.
- "Pay Admission Fee" is assumed to always succeed; there is no payment gateway.

## Response details
- Error bodies from the holds and classes endpoints use `{ "error": "<message>" }`.
- Timestamps (`expiresAt`) are UTC ISO-8601.
- IDs are prefixed GUIDs (`c_…` for classes, `h_…` for holds).
- Extra fields are only added where allowed (`studentId` on the apply response). No specified field is renamed or removed.

## How the seat limit holds (concurrency, including multiple backend processes)
- Applying runs in a transaction that locks the class row with `SELECT … FOR UPDATE`. Other applicants for the same class wait on that lock. Inside the lock the API expires stale holds, checks for a duplicate, counts `Held + Confirmed` and only then inserts. The count and insert therefore cannot interleave between requests.
- The lock lives in PostgreSQL, not in application memory, so **two backend processes on different ports sharing one database are serialized per class** and `held + confirmed` cannot exceed `totalSeats`. Different classes do not block each other.
- A partial unique index on `(ClassId, StudentId)` for `Held`/`Confirmed` holds backs up the one-active-hold rule at the database level.
- **Confirm and cancel are single conditional `UPDATE` statements** (`WHERE Status = 'Held' AND ExpiresAt > now AND StudentId = …`). They are atomic, and duplicate requests cannot count twice. Confirming does not change the number of occupied seats (a held seat becomes confirmed), so it needs no class lock.
- **Seat counts are read in one SQL statement.** `GET /classes` and `GET /classes/{id}` compute held and confirmed together from a single snapshot. Using separate queries could count a hold that is confirmed in between twice, briefly showing `held + confirmed > totalSeats`.
- Because requests wait on the row lock while holding a database connection, a burst of thousands of applicants queues up. The compose file sets `Maximum Pool Size=100;Timeout=60` on the API connection string so waiting requests are not rejected, and raises PostgreSQL `max_connections` to 300 so two API processes fit.
- **Two-process verification.** I ran two API instances on ports `8080` and `8081` against the same PostgreSQL database. I sent 20 concurrent hold requests for the same one-seat class, with 10 requests to each instance and a distinct student ID for each request. One request returned `201 Created` and 19 returned `409 Conflict`. A read from port `8081` returned `totalSeats = 1`, `heldSeats = 1`, `confirmedSeats = 0`, and `availableSeats = 0`, confirming that `heldSeats + confirmedSeats` stayed within the seat limit in this test.

## Startup and persistence
- The API applies pending migrations on startup and retries for about 30 seconds if the database is not ready yet.
- Data lives in the `dbdata` Docker volume and survives `docker compose down` / `up`. `docker compose down -v` deletes it.