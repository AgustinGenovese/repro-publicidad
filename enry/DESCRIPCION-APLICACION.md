# Descripción de la aplicación: "Repro Publicidad"

## Contexto del negocio

Sistema de **cartelería digital (digital signage)** para una peluquería. Hay TVs en el local
que **no son smart TVs** (son teles clásicas con HDMI). El objetivo es mostrar publicidad
(videos + fotos) en ciclo perpetuo en esas TVs, administrada desde un panel web central.

Restricción del hardware: se va a usar un **Android TV box (Google TV)** conectado a la TV por
HDMI, conectado a internet **por WiFi (no hay Ethernet)**. El mismo device también se quiere
usar para **YouTube y basics** cuando no está mostrando publicidad.

Requisitos deseables en el device remoto:

- Arrancar en pantalla completa automáticamente al prender la TV (modo kiosco).
- Sobrevivir 12-16 horas encendido reproduciendo video sin colgarse ni perder memoria.
- Poder salir fácilmente a YouTube y volver al cartel.
- Reconectarse solo si se cae el WiFi o el server.

## Arquitectura

Monorepo con **npm workspaces**, 3 apps en `apps/*`:

```
apps/server → API Express 5 + MongoDB/Mongoose
apps/panel    → Panel administrativo React (SPA)
apps/player   → Reproductor React (SPA) que corre en la TV
deploy/       → Instaladores para cliente final (Windows .ps1/.bat y Linux .sh)
docs/PLAN.md  → Plan de construcción original
```

Un único proceso Node (el server) sirve **todo**: la API, los archivos de media, el panel y el
player. No hay build pipeline ni hosting externo.

## Stack

- **Monorepo**: npm workspaces (`apps/*`), `concurrently` para dev.
- **Frontends**: React 19, Vite 7, TypeScript, TailwindCSS 4 (`@tailwindcss/vite`).
- **Backend**: Node 22, Express 5, Mongoose 9, JWT (`jsonwebtoken`), bcrypt, multer, dotenv.
- **DB**: MongoDB.
- **Deploy**: un solo proceso Express + build estático de los dos SPAs.

Sin tests, sin linter, sin CI. Sin HTTPS (todo HTTP plano).

## Rutas del servidor (`apps/server/src/app.ts`)

```ts
app.get('/ping')                                  → { ok: true }
app.use('/media', express.static(uploadsDir))     → archivos media subidos (público, sin auth)
app.use('/panel',  express.static(webRoot+'/panel'))
app.use('/player', express.static(webRoot+'/player'))
app.get('/')                                      → redirect a /panel
app.use('/api/auth', authRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api/playlist', playlistRoutes)
app.use('/api/player', playerRoutes)
app.use('/api/devices', deviceRoutes)
app.get('/api/protegida', authJWT, ...)           → endpoint de prueba de auth
```

Configuración (`apps/server/src/config.ts`), leída de `.env` en la **raíz del monorepo**:

```
PORT=3000
MONGO_URL=mongodb://127.0.0.1:27017/repro-publicidad
JWT_SECRET=...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=...
uploadsDir = apps/server/uploads
webRoot    = apps/server/public   (acá se buildean panel/ y player/)
```

## Modelos de datos (Mongoose)

**User** — `username` (único, lowercase), `passwordHash`.
Seed: `apps/server/src/seed.ts` crea el admin desde `.env` con bcrypt (cost 10).

**Media** — `type: 'video' | 'image'`, `filename` (UUID + ext), `originalName`, `mimeType`,
`size`, `url: '/media/<filename>'`, `duration` (segundos, default 8, se usa solo para imágenes),
`active: boolean`, timestamps.

**Playlist** — documento **singleton** (se usa `getPlaylist()` que hace findOne o create).
`items: [{ mediaId: ObjectId ref Media, sortOrder: number }]`, `version: number`.
Cada modificación incrementa `version` — ese número es el mecanismo de sincronización
con los players.

**Device** — `name`, `token` (único, es el ID que el player se genera solo y guarda en
localStorage), `lastSeen`, `currentIp`, timestamps.
`ONLINE_WINDOW_MS = 2 minutos`: si pasó eso desde `lastSeen`, el device figura offline.

## API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | — | `{ username, password }` → `{ token, user }`. JWT 7 días |
| GET | `/api/media` | JWT | Lista media |
| POST | `/api/media` | JWT | `multipart/form-data` campo `file`. Máx 200 MB |
| DELETE | `/api/media/:id` | JWT | Borra archivo del disco + documento |
| GET | `/api/playlist` | JWT | Playlist completa con populate |
| PUT | `/api/playlist` | JWT | `{ items: [{ mediaId, sortOrder }] }`, valida que existan, incrementa version |
| GET | `/api/player/playlist` | **público** | Devuelve `{ version, items }` filtrando inactivos y con **URL absoluta** |
| POST | `/api/player/sync` | JWT | Fuerza `version + 1` |
| POST | `/api/devices/register` | **público** | `{ name, token }` → upsert, actualiza `lastSeen` e `currentIp` |
| GET | `/api/devices` | JWT | Lista con `online: boolean` calculado |

Auth: middleware `authJWT` lee `Authorization: Bearer <token>`, responde 401 si falta/inválido.
El panel guarda el token en `localStorage` (`repro_token`) y hace logout automático ante 401.

**Upload** (multer, `diskStorage` a `uploadsDir`): MIME permitidos `video/mp4`, `video/webm`,
`image/jpeg`, `image/png`, `image/webp`. Cualquier otro → 400 "Formato no soportado".
Límite 200 MB, con mensaje de error propio en un middleware.

## El Player (`apps/player/`)

Es una SPA que se sirve en `/player/`. Build: `vite build --base=/player/ --outDir ../server/public/player`.

**Ciclo de vida:**

1. `getDeviceId()` (`src/DeviceId.ts`): lee `repro_device_id` de `localStorage`; si no existe
   genera un UUID (`crypto.randomUUID()` con fallback a `crypto.getRandomValues`) y lo persiste.
   Ojo: `crypto.randomUUID` requiere *secure context* — en HTTP plano no está disponible y
   siempre cae al fallback.
2. `usePlaylist(30_000)` (`src/usePlaylist.ts`): `fetch('/api/player/playlist')` cada 30 s.
   Usa **rutas relativas**, así que el player debe servirse desde el **mismo origen** que la API.
   Compara `version` contra la anterior; si cambió, incrementa un contador `changes`.
   Errores de red se silencian y reintenta en el siguiente ciclo.
3. Heartbeat: `POST /api/devices/register` cada 30 s con `{ name: 'TV', token: deviceId }`.
   El `onClick` sobre el root **togglea un overlay de debug** (oculto por defecto) que muestra
   URL, versión de playlist, cantidad de items, estado de conexión e ID del device.

**Reproducción** (`src/components/Player.tsx`):

- Video: `<video autoPlay muted playsInline onEnded={advance} onError={advance}>`,
  `object-contain`, fondo negro.
- Imagen: `<img>` con `image-fade` de Tailwind y duración según `item.duration`.
- Ciclo continuo: al terminar un item pasa al siguiente, `% items.length`.
- **Precarga** del próximo item si es imagen (renderiza un `<img className="hidden">`).
- Al cambiar la playlist busca mantener el item actual: si el mediaId sigue existiendo en la
  nueva lista, salta a su posición; si no, reinicia en 0 y sube un `gen` que fuerza remount
  del elemento (por si quedó un video trabado).
- Si no hay contenido: pantalla negra con "Sin contenido" e instrucciones.

## El Panel (`apps/panel/`)

SPA en `/panel/`, build a `../server/public/panel`. Layout con sidebar oscuro. Tabs:

- **Media** — drag & drop de archivos (`UploadDropzone`), grilla de `MediaCard`, borrar.
- **Playlist** — armar el orden, guardar (`PUT /api/playlist`), botón "Sincronizar"
  (`POST /api/player/sync`).
- **Devices (TVs)** — lista con nombre, IP, `lastSeen` y online/offline.

## Deploy (`deploy/`)

- `instalar-en-cliente.ps1` / `.bat` (Windows): instala Node LTS y MongoDB vía `winget`,
  copia a `C:\repro-publicidad`, genera `.env` con JWT aleatorio, `npm ci`, `npm run build`,
  `npm run seed`, crea un Scheduled Task de arranque, abre el puerto 3000.
- `instalar-en-cliente.sh` (Debian/Ubuntu): instala Node 20, MongoDB 8 desde el repo oficial,
  systemd unit `repro-publicidad.service` con `Restart=always`, `ufw allow 3000`.
- **No existe** configuración de autoarranque del browser en modo kiosco todavía.

## Scripts raíz

```
npm run dev     → concurrently server(3000) + panel(5173) + player(5174)
npm run build   → tsc en server, vite build en panel y player
npm start       → build + node apps/server/dist/index.js
```

## Problemas conocidos / cosas a resolver

1. **Modo kiosco en Android TV**: no hay nada implementado. El player es una web app y los
   navegadores de Android TV no arrancan en pantalla completa ni se autoconectan a una URL.
   Habría que evaluar: PWA instalable + launcher por defecto, o incorporar un launcher local
   en el server (ej. `http://server:3000/kiosk`) con botones "Repro Publicidad" / "YouTube".
2. **URLs absolutas en `/api/player/playlist`**: se construyen con `req.protocol` +
   `req.get('host')`. Si el server se expone detrás de un proxy inverso o túnel hay que
   configurar `trust proxy` y `X-Forwarded-Proto`, o el player va a recibir URLs que no
   puede resolver.
3. **Sin HTTPS**: si se usa un dominio propio, `crypto.randomUUID` no estaría disponible
   (cae al fallback, no rompe) pero conviene HTTPS igual.
4. **Sin reconexión**: si el WiFi o el server se caen, el player sigue mostrando el último
   contenido indefinidamente sin avisar (el overlay de debug muestra "conectando" pero queda
   oculto). No hay pantalla de "sin conexión".
5. **Playback de video**: `<video>` con `src` directo y sin `preload` strategy explícita.
   En WebView de Android TV conviene verificar autoplay muted y si soporta H.264 vs HEVC.
6. **Sin caché/offline**: si se pierde la red, no hay nada local.
7. **Gestión de memoria**: `gen` y el remount con `key` evitan videos trabados, pero no hay
   rotación de `src` para liberar decodificadores en devices con poca RAM.
8. **Sin nombres editables de device**: el player siempre manda `name: 'TV'`.