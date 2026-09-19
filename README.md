# repro-publicidad

Aplicación para mostrar publicidad en TVs (Android TV, sticks, navegadores de TV)
cargada desde un panel administrativo central conectado por internet.

> Estado actual: solo documentación. Ver `docs/PLAN.md` para retomar la construcción.

## Visión general

- **Player (apps/player)** — Aplicación web React que corre en el TV a pantalla
  completa y reproduce un ciclo continuo de videos y fotos.
- **Panel (apps/panel)** — Administrativo React donde se suben videos/fotos,
  se arma la playlist y se ven los TVs conectados.
- **Server (apps/server)** — API Express + MongoDB que sirve media, auth y playlist.

## Stack

- Monorepo con npm workspaces (`apps/*`)
- React 19 + Vite + TypeScript + TailwindCSS 4 (frontends)
- Node + Express 5 + Mongoose (MongoDB) + JWT + bcrypt (backend)
- `concurrently` para correr todo junto en desarrollo

## Documentación

- [Plan completo y fases de construcción](docs/PLAN.md)