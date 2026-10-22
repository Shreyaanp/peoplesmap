# peoplemap

A Google Maps–style web app where the pins are people, not places. Product notes: [CLAUDE.md](CLAUDE.md).

| Folder    | What lives there                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------- |
| `web/`    | The frontend: React + TypeScript + Vite PWA, MapLibre, Motion, Storybook, tests. Run npm from here.   |
| `server/` | The backend: a Spring Boot modular monolith (Java), written by hand.                                  |
| `api/`    | The shared API contract (`openapi.yaml`). Frontend types and mocks and the backend are built from it. |
| `infra/`  | Local environment (Docker Compose) now, AWS later.                                                    |

CI: `.github/workflows/web-ci.yml` runs on changes to `web/` or `api/`.
