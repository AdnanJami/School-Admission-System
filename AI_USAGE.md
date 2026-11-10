# AI Usage

**Tools:** ChatGPT, Claude, KiloCode

**Used for:**
- Backend: controllers, the hold/confirm/cancel logic, EF Core migrations and the seat-count query
- Backend test files, including the concurrency test
- CORS setup and drafts of the documentation
- Frontend (Claude): the React + TypeScript UI (API client, React Query hooks, pages, countdown logic), its Vitest tests, and the frontend Dockerfile / nginx setup
- Claude also reviewed the backend against the assignment brief and helped plan the frontend

I reviewed and ran the code myself. I used one AI tool to review code written with another.

## Where the AI made mistakes

1. **Wrong backend port.** The generated `launchSettings.json` used port 5258 instead of the 8080 required by the brief. I caught it by re-reading the assignment PDF.
2. **Seat limit exceeded.** An early version let more holds through than there were seats. This broke the main rule of the brief. I caught it with a concurrent-apply test and fixed it by locking the class row (`SELECT … FOR UPDATE`) inside the apply transaction.
3. **Documentation described features that were not implemented.** `ASSUMPTIONS.md` mentioned a partial unique index, a 200-character name limit and a "400 instead of 415" response for requests without a JSON content type. The first two were later implemented; the 415 claim was not in the code at all, so I removed it. I caught these by comparing the notes with the code.
4. **Inconsistent seat counts.** `GET /classes` and `GET /classes/{id}` counted held and confirmed seats in separate queries. A hold confirmed between the two queries was counted twice, so a response could briefly show `held + confirmed > totalSeats`. This was not caught by the AI that wrote the code. A review by a second AI tool found it, and I confirmed it by reading the code. I replaced both queries with a single SQL statement.
5. **Fix added but not used.** The AI first added the single-query helper without calling it, so the bug remained. I caught it by reading the diff before accepting it. The same helper also had a nullable-parameter problem in Postgres (`@p IS NULL` needs a `::text` cast).
6. **Leftover dead code.** A discarded `OrderBy(...).ToListAsync()` query in `GetAll` did nothing and left the list unsorted. I found it in code review and removed it.
7. **Connection limits not considered.** The first version did not account for requests waiting on the row lock while holding database connections. Under a burst this exhausts the default pool of 100 connections. A review pointed it out; I raised the pool size and timeout and Postgres `max_connections`.
8. **Frontend: wrong clock-skew idea.** Claude first proposed correcting the countdown with the server's `Date` response header. That header is not readable by browser code on cross-origin requests (it is not CORS-safelisted), so it would not have worked.
9. **Frontend: TypeScript `erasableSyntaxOnly` error.** The first `ApiError` class used a constructor parameter property (`constructor(public status: number, …)`), which the Vite TypeScript template rejects. The compiler error showed it immediately; I changed it to an explicit field.

## How I verified

- Automated backend tests: a concurrency test (200 simultaneous applications for 10 seats), duplicate-confirm, same-student-twice, cancel, expiry, authorization and input-validation tests.
- Automated frontend tests (Vitest): API error handling, student ID validation and persistence, class list states, countdown expiry with Pay disabled, pay / cancel flows, admin form validation.
- Running `docker compose up` from a clean state and `docker compose down` / `up` to check persistence.
- Re-reading the brief against the code and the notes.
- Having a second AI tool review the first one's output, then checking each finding in the code myself.