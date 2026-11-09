# AI Usage
**Tool:**  ChatGPT, Claude ,KiloCode
**Used for:** Cors, Frontend, Backend,test file. and new migration

## Where the AI made mistakes
1. It used a different backend port (e.g. in launchSettings) instead of 8080 from the spec. I caught it by re-reading the assignment PDF.
2. It ignored/changed an instruction from the brief: Went over seatlimit.
3. Its notes in ASSUMPTIONS.md described features that weren't implemented
   (partial unique index, 200-char limit). I caught it by comparing the notes to the code.

## How I verified
<tests, running docker compose, reading the spec again>