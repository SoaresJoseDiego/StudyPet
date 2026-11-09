# StudyPet

Um companheiro de estudo: sessões de foco, pausas saudáveis, evolução de personagem e acompanhamento de cursos por módulos e aulas.

## Estrutura

- `src/StudyPet.Api`: API ASP.NET Core.
- `src/StudyPet.Domain`: entidades e regras centrais.
- `src/StudyPet.Application`: casos de uso e cálculos de recompensa.
- `src/StudyPet.Infrastructure`: persistência PostgreSQL com Entity Framework Core.
- `tests/StudyPet.Application.Tests`: testes das regras de recompensa, nível e meta.
- `web`: front-end em React + TypeScript (Vite).
- `postman`: collection e environment da API (formato Git do Postman).

## Primeiros passos

1. Suba o banco com `docker compose up -d`.
2. Execute a API com `dotnet run --project src/StudyPet.Api`.
3. Em outro terminal, suba o front: `cd web`, `npm install` (só na primeira vez) e `npm run dev`.
4. Abra http://localhost:5173. O front encaminha `/api` para a API em http://localhost:5278.

O PostgreSQL pode ser conectado pelo DBeaver em `localhost:5432`, banco `studypet`, usuário `studypet` e senha `studypet`.

## MVP planejado

1. Contas e personagem.
2. Cursos, módulos e aulas cadastrados manualmente.
3. Sessões de foco, pausa sugerida e recompensa.
4. Metas, histórico e evolução visual.
5. Aplicação web em React e cliente desktop Blazor Hybrid.
