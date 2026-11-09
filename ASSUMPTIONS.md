# Assumptions

- **Class names are not unique.** Classes are identified by `id`. Two classes may
  have the same name (e.g. parallel sections). Names are trimmed before saving.
- **Expired holds do not count as held seats.** A hold with `Status = Held` and
  `ExpiresAt <= now` is ignored when computing `heldSeats`, even if no background
  job has marked it `Expired` yet.

- **Error body shape:** all errors from the holds endpoints use `{ "error": "<message>" }`.
  Validation errors from `[ApiController]` (e.g. bad JSON on POST /classes) keep the
  default ASP.NET problem-details shape.
- **Hold duration** comes from `HOLD_DURATION_SECONDS` (default 600).
- **Seat counting** treats a hold as "held" only while `Status = Held` and
  `ExpiresAt > now`, so expired holds free the seat immediately even before cleanup.
- **A student may have only one active (Held or Confirmed) hold per class.** After an
  Expired or Cancelled hold, they can hold again.

- **Order of checks on POST /classes/{classId}/holds:** the `X-Student-Id` header is
  validated first (400), before the class is looked up. A request with a bad header and an
  unknown class id therefore returns 400, not 404.
- **Unknown class id returns 404** with `{ "error": "Class not found." }`; an unknown hold
  id on GET /holds/{holdId} returns 404 with `{ "error": "Hold not found." }`.
- **Invalid HOLD_DURATION_SECONDS** (non-numeric, zero or negative) stops the application at
  startup with a clear error message. Unset or empty means 600 seconds.

- **Request validation:** class names are limited to 200 characters (longer names return 400).
  A request without `Content-Type: application/json` (e.g. no body at all) returns 400
  instead of the framework's default 415.
- **Duplicate-hold safety:** besides the row lock, a partial unique index on
  `(ClassId, StudentId)` for `Held`/`Confirmed` holds guards against a student holding twice.
- **Startup:** the API applies pending migrations on start and retries for ~30 seconds
  if the database is not ready yet.