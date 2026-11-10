# Levantar Homefix Connect en local — paso a paso

> Guía para quien **no trabaja habitualmente con Node**. Todos los comandos se
> copian y se pegan tal cual, desde la raíz del repositorio.
>
> Si algo falla, salta a [Errores comunes](#10-errores-comunes).

## Resumen ultra corto (si ya lo tienes instalado)

```bash
git clone git@github.com:femCodersClub-vonage-program/homefix-connect.git
cd homefix-connect
git checkout chore/foundation          # mientras el scaffold no esté en main
pnpm install
cp -n .env.example .env
pnpm db:up
pnpm db:push
pnpm db:seed
pnpm dev
```

Abrir **http://localhost:5173** → debe decir **«Backend: ok»** en verde.
Para apagar: `Ctrl + C` y luego `pnpm db:down`. Detalle y comprobaciones, abajo.

---

## 0. Qué vas a levantar (mapa mental)

La aplicación son **tres piezas** que se ejecutan por separado:

| Pieza | Qué es | Dónde vive | Puerto | Cómo se levanta |
|-------|--------|-----------|--------|-----------------|
| **Base de datos** | PostgreSQL dentro de Docker. Guarda usuarios, incidencias, visitas, sesiones y notificaciones | `docker-compose.yml` | `5432` | `pnpm db:up` (queda en segundo plano) |
| **Backend** | Programa Node que habla con la base de datos y con Vonage. Expone `/api/...` | `backend/` | `3000` | `pnpm dev:backend` |
| **Frontend** | Página web (React) que se abre en el navegador y llama al backend | `frontend/` | `5173` | `pnpm dev:frontend` |

```
   navegador                           Docker
┌──────────────┐   /api/...   ┌──────────────┐   SQL   ┌────────────┐
│  Frontend    │ ───────────► │   Backend    │ ──────► │ PostgreSQL │
│  :5173       │              │   :3000      │         │  :5432     │
└──────────────┘              └──────────────┘         └────────────┘
       React                    Node/Express             Docker
```

**Lo importante:** el frontend **no** habla con la base de datos. Habla con el
backend. Si el backend está apagado, la web se abre pero dice
«Sin conexión con la API».

Son **dos «programas» tuyos** (backend y frontend) y **un contenedor** (Postgres).
Por eso hay dos formas de apagarlo todo, y hay que hacer las dos: ver
[§9 Apagar todo correctamente](#9-apagar-todo-correctamente).

---

## 1. Antes de empezar (solo la primera vez)

Abre una terminal y comprueba estas tres cosas.

### 1.1 Node.js 24

```bash
node -v
```

Tiene que decir `v24.x.x`. Si dice otra cosa o «command not found», instala
Node 24 (por ejemplo con [nvm](https://github.com/nvm-sh/nvm)) y vuelve a
comprobarlo.

### 1.2 pnpm (el gestor de paquetes del proyecto)

```bash
corepack enable pnpm
pnpm -v
```

Tiene que decir `12.x.x`.

> ⚠️ **Este proyecto NO usa `npm` ni `yarn`.** `npm install` aquí crea un
> `package-lock.json`, ignora el monorepo y rompe el entorno. Siempre `pnpm`.

> ℹ️ **No se instala nada «entrando en cada carpeta».** `pnpm install`, ejecutado
> en la raíz, instala las dependencias de `backend/`, de `frontend/` y de la
> raíz a la vez (eso es el monorepo).

### 1.3 Docker

```bash
docker -v
docker compose version
docker info
```

- `docker -v` y `docker compose version` deben responder con una versión.
- `docker info` **no** debe dar error de conexión: si lo da, abre Docker Desktop
  (o arranca el servicio `docker`) y espera a que esté listo.

**Docker solo se usa para PostgreSQL.** No hay contenedor del backend ni del
frontend: los dos corren directamente en tu máquina.

---

## 2. Clonar y primera puesta en marcha

### 2.1 Clonar el repositorio

```bash
git clone git@github.com:femCodersClub-vonage-program/homefix-connect.git
cd homefix-connect
```

Si no tienes clave SSH configurada en GitHub, usa HTTPS:

```bash
git clone https://github.com/femCodersClub-vonage-program/homefix-connect.git
```

### 2.2 Cambiar a la rama del scaffold

> ⚠️ **Mientras `chore/foundation` no esté mergeada en `main`, un clon normal se
> queda en `main` y no verá nada de esto.** Hay que cambiarse de rama a mano.

```bash
git checkout chore/foundation
```

Comprueba que estás en la rama correcta:

```bash
git branch --show-current     # debe imprimir: chore/foundation
```

### 2.3 Los 5 comandos

```bash
pnpm install
cp -n .env.example .env
pnpm db:up
pnpm db:push
pnpm db:seed
```

Qué hace cada uno y **qué deberías ver**:

| Comando | Qué hace | Salida esperada |
|---------|----------|-----------------|
| `pnpm install` | Descarga las dependencias de todo el monorepo | `Done in Xs using pnpm v12.x` |
| `cp -n .env.example .env` | Crea tu archivo de configuración local. El `-n` **no pisa** uno existente | Sin salida |
| `pnpm db:up` | Descarga (la primera vez) y arranca PostgreSQL en Docker | `Container homefix-db Started` |
| `pnpm db:push` | Crea las tablas en la base de datos | `Your database is now in sync with your Prisma schema` |
| `pnpm db:seed` | Mete datos de demo (incidencia, visita, sesión de vídeo) | `Seed OK` + 4 líneas con los IDs |

Notas de la primera vez:

- `pnpm install` puede tardar **1–3 minutos** (descarga Prisma, Vite, etc.).
- `pnpm db:up` la primera vez descarga la imagen de Postgres (~80 MB). Normal.
- Si `pnpm install` avisa de `Ignored build scripts`, ejecuta `pnpm approve-builds --all`
  una vez y repite la instalación.

Ejemplo de la salida del seed:

```
Seed OK
  incidencia : inc_demo (VISIT_ASSIGNED)
  visita     : visit_demo (CONFIRMED, 2026-11-11T18:14:31.739Z)
  video      : vs_demo (PENDING)
  usuarios   : usr_tenant_demo, usr_technician_demo, usr_manager_demo
```

> `db:push` y `db:seed` **solo hacen falta la primera vez**, o cuando alguien
> cambie el schema de la base de datos. En el día a día basta con `pnpm db:up`.

Comprueba que la base de datos está viva:

```bash
docker compose ps
```

Deberías ver `homefix-db` con estado `Up ... (healthy)`.

---

## 3. Arrancar todo (el comando del día a día)

```bash
pnpm dev
```

Esto arranca **backend y frontend a la vez**, cada uno con su recarga
automática. La terminal se queda ocupada mostrando los dos: es normal, **no la
cierres**.

Salida esperada:

```
frontend dev: VITE v7.x  ready in 162 ms
frontend dev: ➜  Local:   http://localhost:5173/
backend  dev: {"level":30,"service":"homefix-api","port":3000,"env":"development",
               "msg":"backend listening"}
```

Abre **http://localhost:5173** en el navegador. Deberías ver:

- el título **Homefix Connect**;
- una tarjeta **Backend** con **«Backend: ok»** en verde y la fecha/hora actual.

Para parar: `Ctrl + C` en esa terminal. **Postgres sigue encendido** (es un
contenedor en segundo plano); para pararlo, `pnpm db:down`
(ver [§9](#9-apagar-todo-correctamente)).

---

## 4. Solo backend o solo frontend

A veces no quieres los dos. Esto es lo que pasa en cada caso:

| Quiero… | Comando | Qué funciona | Qué no |
|---------|---------|--------------|--------|
| **Solo el backend** | `pnpm dev:backend` | `http://localhost:3000/api/...` (curl o Postman) | La web en `:5173` no está disponible |
| **Solo el frontend** | `pnpm dev:frontend` | La web abre en `http://localhost:5173` | Verás **«Sin conexión con la API»**: es lo esperado, el backend está apagado |
| **Solo los tests del backend** | `pnpm --filter backend test` | 4 tests de la API | — |
| **Solo los tests del frontend** | `pnpm --filter frontend test` | 3 tests de la interfaz | — |
| **Solo compilar el backend** | `pnpm --filter backend build` | Carpeta `backend/dist/` | — |
| **Solo compilar el frontend** | `pnpm --filter frontend build` | Carpeta `frontend/dist/` | — |

> **El frontend por sí solo no necesita Postgres.** El que necesita la base de
> datos es el backend. Pero para que la pantalla diga «Backend: ok» hacen falta
> backend + Postgres.

Si quieres **backend y frontend en terminales separadas** (para leer los logs de
cada uno sin mezclar):

- Terminal A: `pnpm db:up` y luego `pnpm dev:backend`
- Terminal B: `pnpm dev:frontend`

Cada terminal se para con su propio `Ctrl + C`.

---

## 5. Qué deberías ver, exactamente

### 5.1 En el navegador — http://localhost:5173

```
Homefix Connect
MVP: videollamada 1-a-1 con Vonage Video y SMS post-visita.

BACKEND
Backend: ok (2026-11-10T18:15:01.968Z)

Monorepo pnpm · backend y frontend separados
Docs: docs/MVP_DEFINITION.md · docs/TASKS.md
```

Si en vez de verde aparece **«Sin conexión con la API»** en rojo, el backend no
está corriendo o se ha caído: mira la terminal donde lanzaste `pnpm dev`.

### 5.2 El backend responde

```bash
curl http://localhost:3000/api/health
```

```json
{"status":"ok","timestamp":"2026-11-10T18:15:01.968Z"}
```

### 5.3 La base de datos está conectada

```bash
curl http://localhost:3000/api/incidents/inc_demo
```

Devuelve un JSON largo con `"id":"inc_demo"`, `"status":"VISIT_ASSIGNED"`, los
datos de la inquilina/técnica/gestora, la visita `CONFIRMED` y la sesión de
vídeo `PENDING`. **Si ves eso, la cadena Docker → Prisma → Express funciona.**

### 5.4 El frontend llega al backend a través del proxy

```bash
curl http://localhost:5173/api/health
```

Debe devolver lo mismo que el `curl` del punto 5.2. Así compruebas que la web
puede llamar a la API sin líos de CORS.

### 5.5 Los logs se escriben en un archivo

```bash
tail -f backend/logs/app.jsonl
```

Una línea JSON por petición, con método, ruta, código de respuesta y duración.
Es el sistema de observabilidad del MVP (no hay APM ni Grafana). `Ctrl + C` sale
del `tail` sin afectar a la app.

### 5.6 Checklist de «está todo bien»

- [ ] `docker compose ps` → `homefix-db` en `healthy`
- [ ] `pnpm dev` muestra `backend listening ... port: 3000`
- [ ] `pnpm dev` muestra `Local: http://localhost:5173/`
- [ ] Navegador en `:5173` → «Backend: ok» en verde
- [ ] `curl :3000/api/incidents/inc_demo` devuelve `inc_demo`
- [ ] `curl :5173/api/health` devuelve `"status":"ok"`

---

## 6. ¿Dónde está cada cosa?

```
homefix-connect/
├── package.json              ← comandos que ejecutas con pnpm (dev, db:up, test…)
├── pnpm-workspace.yaml       ← declara que backend/ y frontend/ son el monorepo
├── docker-compose.yml        ← PostgreSQL (lo único que va en Docker)
├── .env.example              ← plantilla de configuración; se copia a .env
├── .env                      ← TU configuración (no se sube a git)
│
├── backend/
│   ├── prisma/schema.prisma  ← definición de las tablas
│   ├── src/index.ts          ← arranca el servidor en el puerto 3000
│   ├── src/app.ts            ← rutas y middlewares de Express
│   ├── src/routes/           ← endpoints (/api/health, /api/incidents/:id)
│   ├── src/db/seed.ts        ← datos de demo
│   └── logs/app.jsonl        ← logs generados al ejecutar
│
├── frontend/
│   ├── index.html            ← la página que sirve Vite
│   └── src/App.tsx           ← la pantalla "Homefix Connect"
│
└── docs/                     ← definición del MVP, plan, arquitectura, esta guía
```

---

## 7. Comprobar que todo está sano

```bash
pnpm check     # lint + comprobación de tipos (ambos lados)
pnpm test      # tests del backend y del frontend
pnpm build     # compila backend y frontend como en producción
```

Salida esperada (resumida):

```
backend test:  Tests  4 passed (4)
frontend test: Tests  3 passed (3)
frontend build: ✓ built in ~2s
```

Si `pnpm check` termina sin escribir nada más, está bien: en estas herramientas
«sin noticias» significa «sin errores».

---

## 8. Reiniciar

| Quiero… | Qué hacer |
|---------|-----------|
| Reiniciar backend/frontend tras un cambio de código | No hace falta: `tsx watch` y Vite recargan solos. Si se quedan colgados: `Ctrl + C` y `pnpm dev` |
| Reiniciar Postgres | `pnpm db:down` y `pnpm db:up` (los datos se conservan) |
| Volver a cargar los datos de demo | `pnpm db:seed` (es idempotente, no duplica) |
| Recrear la base de datos entera | `pnpm db:reset` ⚠️ **borra los datos** |
| Recuperar el `.env` si lo borraste | `cp -n .env.example .env` |
| Reinstalar dependencias desde cero | `rm -rf node_modules backend/node_modules frontend/node_modules` y `pnpm install` |

---

## 9. Apagar todo correctamente

Hay **dos capas** que apagar: los programas de tu terminal y el contenedor de
Docker. Si solo haces una, queda algo vivo ocupando un puerto y la próxima vez
verás `EADDRINUSE` o `port is already allocated`.

### 9.1 Apagado normal (el 99 % de las veces)

**Paso 1 — Parar backend y frontend**

En la terminal donde corre `pnpm dev`, pulsa:

```
Ctrl + C
```

Si los lanzaste en terminales separadas, `Ctrl + C` en cada una.

Sabrás que pararon porque la terminal vuelve a mostrar el prompt y ya no salen
líneas nuevas.

**Paso 2 — Parar y retirar el contenedor de Postgres**

```bash
pnpm db:down
```

Salida esperada:

```
Container homefix-db  Stopped
Container homefix-db  Removed
Network homefix-connect_default  Removed
```

**Paso 3 — Comprobar que no queda nada**

```bash
docker compose ps
```

Debe salir **vacío** (solo la cabecera `NAME  IMAGE  COMMAND  SERVICE  CREATED  STATUS  PORTS`, sin filas).

```bash
ss -ltn | grep -E ':3000|:5173|:5432'
```

No debe devolver **nada**. Si devuelve algo, hay un proceso zombie: ver §9.4.

### 9.2 Qué se conserva y qué se borra

| Acción | Contenedor | Datos (incidencias, etc.) |
|--------|-----------|---------------------------|
| `Ctrl + C` | sigue | se conservan |
| `pnpm db:down` | se **para y elimina** | **se conservan** (volumen `homefix_pgdata`) |
| `pnpm db:reset` | se recrea | **se borran** (elimina el volumen y vuelve a hacer push + seed) |
| `docker compose down -v` | se elimina | **se borran** (igual que `db:reset` pero sin volver a sembrar) |

Es decir: **`pnpm db:down` es seguro**. Puedes apagar el portátil y mañana
`pnpm db:up` recupera todo tal cual.

### 9.3 Si quieres apagar Docker entero

Solo si no vas a usar ningún contenedor:

```bash
docker compose stop        # para el contenedor pero NO lo elimina
# o, para apagar el motor de Docker (Docker Desktop: cerrar la app)
sudo systemctl stop docker
```

> No hace falta apagar Docker para apagar el proyecto. Con `pnpm db:down` es
> suficiente.

### 9.4 Si algo quedó vivo (proceso zombie)

Síntoma típico al volver a arrancar: `EADDRINUSE: address already in use :::3000`
o `port is already allocated`.

**Ver qué ocupa el puerto:**

```bash
ss -ltnp | grep -E ':3000|:5173'
```

**Matar el proceso** (usa el PID que aparezca en la última columna, formato
`pid=12345`):

```bash
kill 12345
# si no se muere:
kill -9 12345
```

**Ver contenedores que sigan vivos:**

```bash
docker ps
docker ps -a | grep homefix
```

Si aparece `homefix-db` en `Up`, `pnpm db:down` debería quitarlo. Si está en
`Exited` y quieres limpiarlo: `docker rm homefix-db`.

> ⚠️ **Nunca uses `docker system prune -a` para «limpiar»**: borra imágenes y
> volúmenes de *todos* tus proyectos, no solo de este. Para este proyecto usa
> siempre `pnpm db:down` (o `pnpm db:reset` si quieres borrar datos).

### 9.5 Checklist de apagado

- [ ] `Ctrl + C` en la terminal de `pnpm dev` (o en las dos terminales)
- [ ] `pnpm db:down`
- [ ] `docker compose ps` → sin filas
- [ ] `ss -ltn | grep -E ':3000|:5173|:5432'` → sin resultados

---

## 10. Errores comunes

| Lo que ves | Qué significa | Qué hacer |
|-----------|---------------|-----------|
| `command not found: pnpm` | Corepack no está activado | `corepack enable pnpm` y reintenta |
| `EADDRINUSE: port 3000` / `5173` | Ya hay algo usando ese puerto | Ver §9.4 |
| `port is already allocated` (5432) | Ya tienes otro Postgres local | Para el otro Postgres o cambia `"5432:5432"` en `docker-compose.yml` |
| `Can't reach database server` | Postgres no está arriba o aún arranca | `pnpm db:up`, espera 5 s, `docker compose ps` debe decir `healthy` |
| `Environment variable not found: DATABASE_URL` | Falta el `.env` | `cp .env.example .env` |
| `Sin conexión con la API` (web) | El backend está apagado | Arranca `pnpm dev` o `pnpm dev:backend` |
| `Cannot find module '@prisma/client'` | No se generó el cliente de Prisma | `pnpm db:generate` |
| `docker: command not found` | Docker no está instalado | Instala Docker y `docker compose` |
| `Cannot connect to the Docker daemon` | Docker está instalado pero apagado | Abre Docker Desktop / `sudo systemctl start docker` |
| La web en `:5173` no carga | Vite no arrancó | Revisa la salida de `pnpm dev:frontend` |
| `npm ERR!` al instalar | Usaste `npm` en vez de `pnpm` | Borra `package-lock.json` y usa `pnpm install` |
| `Ignored build scripts` al instalar | pnpm 10+ bloquea scripts por seguridad | `pnpm approve-builds --all` y repite |
| `git branch` dice `main` | Clonaste y no cambiaste de rama | `git checkout chore/foundation` |

---

## 11. Glosario mínimo

| Término | Qué es, en corto |
|---------|------------------|
| **Monorepo** | Un solo repositorio con varios proyectos dentro (`backend/` y `frontend/`) |
| **Workspace** | Cada proyecto del monorepo; pnpm los trata como paquetes independientes |
| **pnpm** | Instalador de dependencias, como `npm` pero pensado para monorepos |
| **Dependencia** | Código de terceros que el proyecto usa (Express, React, Prisma…) |
| **Script** | Atajo definido en `package.json`; se ejecuta con `pnpm <nombre>` |
| **`node_modules/`** | Carpeta donde `pnpm install` deja las dependencias (no se sube a git) |
| **`.env`** | Archivo con configuración y secretos locales (no se sube a git) |
| **Postgres / base de datos** | Programa que guarda los datos; aquí corre en Docker |
| **Docker** | Caja que ejecuta programas aislados; aquí solo PostgreSQL |
| **Contenedor** | Instancia en ejecución de una imagen Docker (`homefix-db`) |
| **Volumen** | Almacenamiento de Docker que sobrevive al borrar el contenedor (aquí, los datos) |
| **Seed** | Script que rellena la base de datos con datos de ejemplo |
| **`db push`** | Sincronizar las tablas con lo que dice `schema.prisma` (sin migraciones) |
| **Puerto** | «Puerta» numerada de tu máquina: `:5173` web, `:3000` API, `:5432` base de datos |
| **Proxy** | Vite reenvía `/api/...` del `:5173` al `:3000`; por eso no hay CORS en local |
| **Compilar / build** | Traducir TypeScript a JavaScript listo para ejecutar |
| **Lint** | Revisión automática de estilo y errores tontos |
| **Test** | Comprobación automática de que algo funciona |
| **CI** | GitHub Actions ejecuta lint + tests en cada PR |

---

## 12. Lo que este esqueleto todavía NO hace

Es importante no confundir «levanta» con «funciona el MVP»:

- ❌ No hay videollamada (Vonage Video): carriles `A1-A5` y `C3-C4`.
- ❌ No hay envío de SMS (Vonage Messages): carriles `B1-B5`.
- ❌ No hay login: el MVP usa cabeceras simuladas `X-User-Id` / `X-User-Role`.
- ❌ No hay pantalla de detalle de incidencia: tarea `C2`.
- ✅ Lo que sí hay: monorepo, base de datos, seed, API de salud, endpoint de
  lectura de incidencia y pantalla que confirma que el backend responde.

El plan completo de tareas está en [`TASKS.md`](./TASKS.md) y el alcance del MVP
en [`MVP_DEFINITION.md`](./MVP_DEFINITION.md).
