# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

StudyPet is a study companion: focus sessions, suggested breaks, a character that levels up, and courses tracked by modules and lessons. The codebase, docs, and user-facing API messages are in Portuguese (pt-BR); keep new error messages in Portuguese to match. Product rules and MVP scope live in `docs/mvp.md`. Read it before changing reward or break logic.

## How to work in this repo

The user wants to type the code themselves. Do not create or edit source files (`.cs`, `.csproj`, migrations, config) unless the user explicitly asks you to in that message. Instead, explain the approach, point to the files and lines to change, show short snippets for them to write, and review what they wrote. Running read-only commands (build, run, `git status`) to check their work is fine.

## Commands

```bash
docker compose up -d                          # PostgreSQL 17 on localhost:5432 (db/user/password: studypet)
dotnet build StudyPet.slnx
dotnet run --project src/StudyPet.Api         # http://localhost:5278 (see launchSettings.json)
dotnet test StudyPet.slnx                     # unit tests (tests/StudyPet.Application.Tests, xUnit)
dotnet test StudyPet.slnx --filter "FullyQualifiedName~DailyGoalTests"   # a single test class

# Front-end (web/): React 19 + TypeScript + Vite + react-router 7
cd web && npm install && npm run dev          # http://localhost:5173; proxies /api to :5278 (vite.config.ts)
npm run build                                 # tsc -b + vite build (the type check)
npm run lint                                  # oxlint

# EF Core migrations (dotnet-ef is pinned as a local tool in dotnet-tools.json)
dotnet tool restore
dotnet ef migrations add <Name> --project src/StudyPet.Infrastructure --startup-project src/StudyPet.Api
dotnet ef database update --project src/StudyPet.Infrastructure --startup-project src/StudyPet.Api
```

With the API running, run the Postman collection (requests plus `pm.test` assertions):

```bash
postman collection run "postman/collections/StudyPet API" -e postman/environments/Local.environment.yaml
```

The collection is in Postman v3 YAML format (one file per request). Requests chain through collection variables (`userId`, `courseId`, `moduleId`, `lessonId`, `sessionId`) that the create requests set, so a full run in folder order works against an empty database. When you add an endpoint, add a `*.request.yaml` to the matching folder and run `postman collection lint "postman/collections/StudyPet API"`. Then run `postman workspace push --yes` to sync to the user's personal **StudyPet** Postman workspace, which `.postman/resources.yaml` binds. Never open this repo with the Postman app's "Open Folder": it once bound the user's unrelated "Aula" workspace to the folder and hid their cloud collections.

The app does not apply migrations on startup. Run `dotnet ef database update` after you pull or add a migration.

Only `StudyPet.Application` has unit tests. There are no API integration tests yet; `public partial class Program;` at the end of `Program.cs` is there so a future `WebApplicationFactory<Program>` project can use it. Until then, the Postman collection run serves as the end-to-end check.

## Architecture

The solution is .NET 10 with layered projects (`StudyPet.slnx`):

- **Domain**: all entities and enums in one file, `Entities.cs`, as plain mutable classes. IDs are database-generated `int`s.
- **Application**: pure domain logic with no I/O. It contains three classes:
  - `Slimes`: waves of 4 slimes every 4 focus minutes, one defeated at the end of each minute; the next wave enters when the last one dies, so the scene is never empty. Kinds are drawn from the session's `Seed` (mulberry32, mirrored in `web/src/slimes.ts`), and every 60th slime of the user is a Slime Rei. `Slimes.Tally(seed, startIndex, focusSeconds)` gives the counts, which finish stores on the `StudySession`, so changing the rules does not rewrite history.
  - `StudyRewardCalculator`: base Exp = slime Exp, plus the first-session and daily-goal bonuses, coins, and break rules from `docs/mvp.md`.
  - `StudyStreak`: current and longest run of consecutive study days. The current streak stays alive until today ends.
  - `CharacterProgression`: going from level N to N+1 costs 20×N^1.35 XP, rounded to multiples of 5. It also defines the pet's 4 forms (`Stages`: Semente 1, Broto 10, Muda 25, Florescido 50). `CharacterResponse` exposes `stage`/`stageName`/`nextStage*`, and finish returns `evolved`.
  - `DailyGoal`: the +20% bonus applies only to the session that makes the day's total cross the goal, once per day.
- `StatsController` (`GET /api/users/{id}/stats`) aggregates everything the Início, Meu pet, Histórico and Bestiário screens show: today, week (Monday-based) by course with `Course.WeeklyGoalMinutes`, the last 7 days, streak, totals, bestiary counts and the last encounter.
- **Infrastructure**: `StudyPetDbContext` (Npgsql) plus migrations. Relationships, unique indexes (such as `User.Email`), and max lengths are set with the Fluent API in `OnModelCreating`, not with attributes.
- **Api**: references Application and Infrastructure. The connection string `ConnectionStrings:StudyPet` is in `appsettings.json`, and `appsettings.Local.json` is gitignored for overrides.

The entity hierarchy is `User` 1:1 `StudyCharacter`, then `User` → `Course` → `CourseModule` → `Lesson` → `StudySession`. `StudySession` also has an FK to `User`. Modules and lessons are ordered by `Position`, which the API assigns as max+1 on create.

The core loop lives in `StudySessionsController`:
- **Start** sets the lesson to `InProgress`.
- **Finish** computes the reward from the day's completed sessions, updates the character's XP, coins, and level, and can set the lesson to `Completed`.
- A partial unique index (`IX_StudySessions_UserId_InProgress`) enforces at most one `InProgress` session per user.
- "Today" is the day in Brasília time (`StudyDay`, `America/Sao_Paulo`), since users have no time zone yet.

### API conventions

- The API uses two styles:
  - Controllers in `Api/Controllers/` for resource endpoints. They have primary-constructor injection of `StudyPetDbContext`, nested routes such as `api/users/{userId:int}/courses`, and request records grouped by feature folder (`Api/Users/`, `Api/Courses/`).
  - Minimal-API `MapGet` endpoints in `Program.cs` for utility endpoints (`/api/system/status`, `/api/study/reward-preview`).
- Controllers use `DbContext` directly; there is no repository or service layer. They trim and normalize input (emails are lowercased), validate by hand, and return `BadRequest`, `NotFound`, or `Conflict` with an anonymous `{ message }` body. On success they return `Created(location, anonymousProjection)` and never expose entities directly.
- Ownership is checked in the query itself, for example `lesson.Module!.Course!.UserId == userId`. A resource that belongs to another user returns 404, not 403.
- Authentication is e-mail + password with a JWT (7 days, `sub` = user id, `Api/Auth/JwtTokens.cs`). Everything requires a token except what is marked `[AllowAnonymous]`/`.AllowAnonymous()`, and a middleware in `Program.cs` returns 404 when the route's `{userId}` is not the token's user. The signing key is `Jwt:Key` (at least 32 bytes), kept in user-secrets or an environment variable, never in the repo: `dotnet user-secrets set Jwt:Key <key> --project src/StudyPet.Api`. Accounts created before passwords have a null `PasswordHash`: in Development the first password used on sign-in becomes theirs, elsewhere they cannot sign in.
- Enums are serialized as strings (`JsonStringEnumConverter`). Automatic model-binding errors are reshaped in `Program.cs` into `{ message, errors }`, so all 400 responses share one format.
- Each request record goes in its own file in a feature folder: `Api/Users/`, `Api/Courses/`, `Api/StudySessions/`.
- `StudyPet.Api.http` is still the template stub (it points at `/weatherforecast`) and does not reflect the real endpoints.

### Front-end (`web/`)

- The front talks to the API only through `src/api/client.ts`, which uses relative `/api` URLs, and `src/api/types.ts`, which mirrors the API's camelCase JSON. When an endpoint changes, update both files.
- The Vite proxy means there is no CORS configuration in the API. A deployed front would need CORS or a reverse proxy.
- The token (`studypet.token`, handled in `client.ts`) and the signed-in `userId` (`session.tsx` + `session-context.ts`) are kept in `localStorage`. A 401 while holding a token clears it and returns to the welcome screen.
- `StudyPage` holds the session state machine (pick course/lesson → running → reward overlay → break overlay).
  - The timer is client-side, computed from the session's server `startedAt`.
  - Pauses are tracked only in the browser (`localStorage` key `studypet.pause.<sessionId>`). On finish, `floor(focus seconds)` is sent, and a slime only counts once its `deathMs` has passed.
- The whole UI follows the user's claude.ai design canvas "Pet de Estudos" (https://claude.ai/artifact/1FqoBbMeaiTJ5qV1zJ67xg). Its "Versão web" artboards map to pages: Web-Inicio → `DashboardPage`, Web-Batalha → `StudyPage` (`/estudar`), Web-Pet → `PetPage`, Web-Historico → `HistoryPage`, Web-Bestiario → `BestiaryPage`, and Sidebar → `Layout`. Cursos and Ajustes are app-only screens. When the design changes, re-read the canvas files and port them instead of redrawing.
  - `Pet.tsx` and `Slime.tsx` are the canvas SVGs, converted to JSX.
  - `BattleScene.tsx` is derived from `focusMs`. A wave's 4 slimes spawn together at the fence, hop into the field, keep advancing (always forward), and each charges to die exactly at its `deathMs`, which is when it starts counting Exp.
  - `slimes.ts` and `progression.ts` mirror the backend rules, so the Exp, form and evolution banner can be previewed live during a session. The API's finish response is authoritative.
  - The palette (mint/teal) and fonts (Baloo 2 headings, Nunito body) are CSS variables in `index.css`, with dark mode via `prefers-color-scheme`.
- Keep component files exporting only components (oxlint `only-export-components`). Helpers go in `format.ts`, and hooks/context go in `session-context.ts`.

## Planned direction (from README)

MVP order: accounts and character → manually entered courses, modules, and lessons → focus sessions with breaks and rewards → goals, history, and visual progression → React web client (started in `web/`) and Blazor Hybrid desktop client.
