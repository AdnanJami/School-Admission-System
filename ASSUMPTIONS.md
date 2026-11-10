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

## Frontend

- **Student identity** is the 17-digit birth registration number typed at the top of the page. It is checked in the browser (exactly 17 digits) and kept in `localStorage`, so a refresh or reopening the browser keeps the student and, through `GET /me/holds`, all of their applications. There is no login, as the brief says.
- **Seat counts refresh every 3 seconds**; `/me/holds` every 5 seconds; an application that is still `HELD` is re-read every 2 seconds. Polling pauses while the browser tab is hidden.
- **Countdown uses the browser clock.** The API returns `expiresAt` but no server time, and the `Date` header is not readable from the browser across origins, so remaining time is `expiresAt - now` on the client. When it reaches zero the page shows `EXPIRED` immediately, disables "Pay Admission Fee" and asks the server once; the server stays authoritative (confirm and cancel are checked there). If a computer's clock is far off, the timer shown can be off by the same amount.
- **Apply button** is disabled when the class is full, when no student ID is entered, or while another apply is in flight. If the student already has a `HELD` (unexpired) or `CONFIRMED` application in that class, it becomes "View application". The server still enforces all of this.
- **Cancel asks for confirmation** in the page (a second click) so a seat is not released by accident. A confirmed admission cannot be cancelled (the API returns 409).
- **Pay / Cancel buttons are disabled** while a request is running, so double clicks do not send duplicate requests. Duplicate requests are also safe on the server.
- **Errors** are shown as plain-language messages. The backend's `{ "error": ... }` text is shown as is; ASP.NET validation errors are joined; network failures show "Cannot reach the server" plus a banner that clears when the connection returns. Pages never go blank: an error boundary catches unexpected failures.
- **Admin page** has no login, anyone who opens it can create a class. Class names must be unique (API returns 409) and seats must be a whole number of at least 1.
- **Backend URL** is read at runtime from `/config.js`, which the frontend container regenerates from the `API_URL` environment variable on start. The browser calls the backend directly, so `API_URL` must be reachable from the browser (default `http://localhost:8080`), not a Docker-internal name.

## Guardian and admin views

- The app has two areas: the **guardian view** (`/`: classes, apply, my applications, pay / cancel) and the **admin view** (`/admin`), reached with the "Admin" button at the top of the guardian view. Anyone who knows the URL can open the admin view; a real system would protect it with authentication.
- The admin view has three tabs: **Class List** (live seat counts and totals), **Create Class**, and **All Applications** (every student's applications with status, time left and apply time; filter by status, class and student number; refreshes every 5 seconds).
- The brief's 8 endpoints cannot list other students' applications, so the backend has one **extra endpoint, `GET /admin/holds`** (optional `?limit=`, default 500, max 2000, latest first). It needs no `X-Student-Id`. It does not change any of the 8 specified endpoints or their fields.
- Statuses in this list are computed the same way as everywhere else: a hold that is still `HELD` but past its expiry is reported as `EXPIRED`.
- **No authentication.** The admin view has no login, to keep the assignment simple and because the brief says no login is required. In a real system `/admin` and `GET /admin/holds` would require an admin role.
- **Ordering.** The All Applications list is sorted latest first, and `GET /admin/holds` is capped at 2000 rows (default 500).
