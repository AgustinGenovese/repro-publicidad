# Plan de construcción — repro-publicidad

Documento vivo. Cada fase se completa, se prueba (lint + build) y se marca acá
antes de pasar a la siguiente.

## Decisiones tomadas (15/09/2026)

- **Arquitectura**: Monorepo con npm workspaces: `apps/server`, `apps/panel`,
  `apps/player`.
- **Backend**: Node + Express + Mongoose (MongoDB). Un único usuario admin
  (sin roles ni multi-usuario), creado por script `seed` o variables de entorno.
- **Auth**: Login con JWT, password hasheado con bcrypt (convención de
  `finanzas-pwa-v2`).
- **Player**: Solo app web responsiva (no app Android nativa por ahora).
  Corre en el navegador del TV (Android TV, sticks). Nota: para Chromecast real
  haría falta el Cast SDK; esta web es la base para wrapping futuro.
- **Conexión**: Internet/Cloud. Los TVs se registran por token y consultan la
  playlist al server.
- **Reproducción**: Playlist continua en loop. Imágenes con duración
  configurable (default 8s, se define más adelante cómo editarla en el panel).
- **Realtime**: **NO** se usa Socket.io. El player refresca con polling
  periódico (30s) + el panel tiene un botón **"Sincronizar"** que llama a un
  endpoint (`POST /api/player/sync`) que cambia `playlistVersion`; los players
  detectan el cambio en el polling y recargan.

## Estructura objetivo

```
repro-publicidad/
├── package.json                  # workspaces: apps/* + scripts dev/build
├── .env.example                  # variables compartidas
├── README.md
├── docs/
│   └── PLAN.md                   # este archivo
└── apps/
    ├── server/                   # API central (Express + MongoDB)
    │   ├── src/
    │   │   ├── index.ts          # bootstrap + serve estático media
    │   │   ├── db.ts             # conexión MongoDB
    │   │   ├── models/           # User, Media, Playlist, Device
    │   │   ├── routes/           # auth, media, playlist, devices, player
    │   │   └── middleware/       # authJWT
    │   └── uploads/              # archivos multimedia (servidos estáticamente)
    ├── panel/                    # Panel administrativo (React + Tailwind)
    │   └── src/
    │       ├── pages/            # Login, Dashboard, Media, Playlist, Devices
    │       ├── components/       # UploadDropzone, MediaCard, PlaylistEditor...
    │       └── api.ts            # cliente HTTP
    └── player/                   # Web para TV (React, pantalla completa)
        └── src/
            ├── Player.tsx        # loop continuo de reproducción
            ├── usePlaylist.ts    # polling + sync
            └── DeviceId.ts       # identificación persistente del TV
```

## Modelos de datos (MongoDB)

- **User**: `{ email, passwordHash }` — único admin.
- **Media**: `{ type: 'video'|'image', filename, originalName, mimeType, size,
  url, duration (seg, para imágenes, default 8), active }`
- **Playlist**: `{ items: [{ mediaId, sortOrder }], version }` — una playlist
  global. `version` cambia cuando el admin la modifica o toca "Sincronizar".
- **Device**: `{ name, token, lastSeen, currentIp }` — cada TV registrado;
  heartbeat para marcar online/offline.

## API (apps/server)

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/auth/login` | Login admin (JWT) |
| POST | `/api/media` (multipart) | Subir video/imagen |
| GET | `/api/media` | Listar |
| DELETE | `/api/media/:id` | Borrar |
| GET | `/api/playlist` | Leer playlist (admin) |
| PUT | `/api/playlist` | Guardar orden/edición de playlist |
| POST | `/api/player/sync` | Botón Sincronizar → incrementa `version` |
| GET | `/api/player/playlist?token=...` | Playlist pública para TVs |
| POST | `/api/devices/register` | El TV se registra (heartbeat) |
| GET | `/api/devices` | TVS conectados (panel) |
| Static | `/media/...` | Archivos multimedia |

## Fases de construcción (por partes, en orden)

### Fase 1 — Esqueleto del monorepo
- [x] Crear `package.json` raíz con workspaces `apps/*` y scripts
      `dev`/`build` con `concurrently`.
- [x] Scaffold `apps/server` (node + tsx + express mínimo con ruta `/ping`).
- [x] Scaffold `apps/panel` y `apps/player` con Vite + React + TS + Tailwind 4.
- [x] Verificación: `npm run dev` levanta los 3 procesos; `npm run build`
      compila los 3.

**Conceptos**: npm workspaces, monorepo, scripts concurrentes.

### Fase 2 — Backend base
- [x] Conexión a MongoDB con Mongoose (`db.ts`).
- [x] `.env.example` (`MONGO_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- [x] Módulo de config leyendo variables de entorno.
- [x] Verificación: server levanta y conecta a Mongo; `/ping` responde.

**Conceptos**: Express, middleware, Mongoose, variables de entorno.

### Fase 3 — Login de único admin
- [ ] Modelo `User`; script `seed.ts` que crea el admin (bcrypt).
- [ ] `POST /api/auth/login` valida y devuelve JWT.
- [ ] Middleware `authJWT` para proteger rutas del panel.
- [ ] Verificación: login con credenciales seed devuelve token; sin token → 401.

**Conceptos**: bcrypt, JWT, protección de rutas.

### Fase 4 — Subida y listado de media
- [ ] Modelo `Media`.
- [ ] `POST /api/media` con multer (acepta mp4/webm/jpg/png/webp, límites).
- [ ] `GET /api/media` y `DELETE /api/media/:id` (borra archivo + registro).
- [ ] `express.static` sirviendo `/media/...` desde `uploads/`.
- [ ] Verificación: subir archivo, listarlo, verlo por URL, borrarlo.

**Conceptos**: multer, express.static, CRUD base.

### Fase 5 — Playlist + versionado
- [ ] Modelo `Playlist` (una sola, `version`).
- [ ] `GET/PUT /api/playlist` (admin, protegido).
- [ ] `PUT` incrementa `version`.
- [ ] `GET /api/player/playlist` pública: devuelve items activos con URLs
      absolutas y la `version` actual.
- [ ] Verificación: armar playlist, ver que el endpoint público devuelve
      la versión correcta.

**Conceptos**: modelo de playlist, control de versiones.

### Fase 6 — Dispositivos + Sincronizar
- [ ] Modelo `Device`.
- [ ] `POST /api/devices/register` (name+token opcional) → heartbeats
      (`lastSeen`).
- [ ] `GET /api/devices` muestra TVs con online/offline (últimos 2 min).
- [ ] `POST /api/player/sync` → `version++`.
- [ ] Verificación: registrar un "TV" con curl, verlo online, sincronizar.

**Conceptos**: registro de dispositivos, heartbeat, polling.

### Fase 7 — Panel administrativo
- [ ] Login (guarda JWT en localStorage).
- [ ] Página Media: drag & drop de subida, grilla con preview, borrar.
- [ ] Página Playlist: editor con orden (drag & drop simple, sin lib si se
      puede) y botón **Sincronizar**.
- [ ] Página Devices: lista de TVs con estado.
- [ ] Verificación: ciclo completo desde el navegador.

**Conceptos**: frontend conectado a API, drag&drop, estado de sesión.

### Fase 8 — Player
- [ ] Pantalla completa (`100dvh`), registro/identificación del dispositivo
      (id persistente en localStorage/localstorage).
- [ ] Loop continuo: imágenes (con duración + fade) y videos fullscreen.
- [ ] Polling cada 30s de `/api/player/playlist`; si detecta cambio de
      `version`, recarga lista sin reiniciar.
- [ ] Pantalla de estado (URL de la playlist, versión, "sin contenido").
- [ ] Verificación: subir media, armar playlist, sincronizar y verlo
      reproducirse en el player (mismo navegador en modo TV).

**Conceptos**: ciclo de vida de React, `<video>`/`<img>`, loop de reproducción.

## Cómo retomar

1. Arrancar en la **Fase 1** (no está empezada aún).
2. Completar los checkboxes de cada fase.
3. Cada fase termina con: lint + build + prueba manual antes de seguir.
4. Si surge un cambio de decisión, actualizar la sección "Decisiones tomadas".

## Stack de referencia en otros proyectos (convenciones)

- `gestor-turnos`: React 19 + Vite + Tailwind 4 + TS; Express 5 + Mongoose;
  monorepo con `client/` y `server/` + `concurrently`.
- `finanzas-pwa-v2`: npm workspaces, Express + JWT + bcrypt + Mongoose.