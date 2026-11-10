# AGENTS.md — Guía de trabajo del proyecto

> **Este archivo manda.** Es la fuente de verdad de cómo se trabaja en
> Homefix Connect: ramas, commits, tests, entorno y reglas para humanos y para
> asistentes de IA.
>
> Los `AGENTS.md` de `backend/` y `frontend/` **solo añaden deltas** de su capa y
> enlazan aquí. Si algo se contradice, gana este archivo.

---

## 1. Contexto en 30 segundos

MVP de **videollamada 1-a-1** entre inquilina y técnica para evaluar una avería.
Al colgar, se envían **2 SMS** (gestora + inquilina) con Vonage Messages.

- Alcance y casos de uso: [`docs/MVP_DEFINITION.md`](./docs/MVP_DEFINITION.md)
- Tareas y orden de toma: [`docs/TASKS.md`](./docs/TASKS.md)
- Cómo levantar el proyecto: [`docs/LOCAL_SETUP.md`](./docs/LOCAL_SETUP.md)
- Decisiones de arquitectura: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

**Fuera de alcance** (no lo implementes aunque parezca fácil): crear
incidencias, proponer/confirmar citas, login real, dashboard de listados,
grabación de vídeo, RCS/WhatsApp/Voice.

---

## 2. Reglas duras (no negociables)

1. **1 tarea = 1 rama = 1 PR.** Si la tarea crece de 1 día, se parte en dos issues
   **antes** de seguir.
2. **Todo cambio lleva test.** Unitario como mínimo; contrato si toca la API.
3. **`pnpm check` y `pnpm test` en verde antes de abrir el PR.** No se delega en
   el CI.
4. **Nadie mergea su propio PR sin 1 approval** de otra persona del equipo.
5. **`backend/openapi.yaml` es la frontera.** Si cambia, se avisa en el sync y se
   actualiza el cliente del frontend.
6. **`schema.prisma` y `openapi.yaml` no se tocan sin PR aprobado.**
7. **Nunca se commitea un secreto.** Ni `.env`, ni `private.key`, ni tokens.
8. **No hay `npm` ni `yarn`.** Solo `pnpm`.

---

## 3. Entorno

| Pieza | Versión |Cómo se fija |
|---|---|---|
| Node.js | **24** | `.nvmrc` + `engines` en `package.json` |
| pnpm | **12** | `packageManager` + `corepack enable pnpm` |
| PostgreSQL | 16 | `docker-compose.yml` (único contenedor) |

- **Un solo `.env` en la raíz**, copiado de `.env.example`. Está en `.gitignore`.
- El backend lo carga desde `backend/` buscando `./.env` y `../.env`.
- Vite lo lee con `envDir: '..'` (solo expone variables `VITE_*`).
- Los comandos de Prisma lo cargan con `dotenv-cli` (por eso `db:push` y
  `db:seed` funcionan sin exportar nada a mano).

**Docker solo para Postgres.** No hay contenedor de backend ni de frontend, y no
se añaden sin un ADR aprobado.

---

## 4. Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Backend `:3000` + frontend `:5173` en paralelo |
| `pnpm dev:backend` / `pnpm dev:frontend` | Solo uno de los dos |
| `pnpm check` | ESLint + `tsc --noEmit` en ambos workspaces |
| `pnpm test` | Vitest en ambos workspaces |
| `pnpm --filter backend test` | Solo tests del backend |
| `pnpm --filter frontend test` | Solo tests del frontend |
| `pnpm build` | Compila backend y frontend |
| `pnpm db:up` / `pnpm db:down` | Arranca / para Postgres (conserva datos) |
| `pnpm db:push` | Sincroniza tablas con `schema.prisma` (sin migraciones) |
| `pnpm db:seed` | Datos de demo (idempotente) |
| `pnpm db:studio` | Explorador web de la base de datos |
| `pnpm db:reset` | ⚠️ Borra el volumen y recrea + siembra |

> `pnpm gen:types` **todavía no existe**: lo añade la tarea **T1** al crear
> `backend/openapi.yaml`. Hasta entonces el frontend usa
> `frontend/src/api/http.ts`.

Todo el detalle (qué deberías ver, cómo apagar, errores comunes) está en
[`docs/LOCAL_SETUP.md`](./docs/LOCAL_SETUP.md).

---

## 5. Flujo de una tarea

```
1. Tomar el issue de la fila más alta de docs/TASKS.md §10
2. Asignármelo en GitHub Project y moverlo a "In progress"
3. REFINAR en el issue (comentario), antes de escribir código:
     - forma del payload / campos necesarios
     - estados / enums / nombres
     - dependencias reales (¿mock o espera?)
     - si crece > 1 día → partir en dos issues
4. Crear la rama
5. Escribir el test (rojo) → implementar (verde)
6. pnpm check && pnpm test
7. PR → CI verde + 1 approval → squash merge → "Done"
```

El refinamiento **no es opcional**: los issues fijan el caso de uso y el criterio
de aceptación, pero **no** fijan modelo, payload ni nombres.

---

## 6. Ramas

Desde `main` (o desde la rama base que indique el issue si es stacked):

```
<prefijo>/<ID>-<slug-corto-en-kebab-case>
```

| Prefijo | Cuándo |
|---|---|
| `chore/` | Infra, monorepo, CI, dependencias |
| `spec/` | `openapi.yaml`, `schema.prisma`, contrato |
| `feat/` | Funcionalidad nueva |
| `fix/` | Corrección de bug |
| `test/` | Solo tests |
| `docs/` | Solo documentación |

Ejemplos: `chore/T0-monorepo`, `spec/T1-openapi`, `feat/A3-video-tokens`,
`test/B5-messaging`, `docs/D-01-agents`.

---

## 7. Commits — Conventional Commits

```
<tipo>(<scope>): <descripción en imperativo, minúscula, sin punto final>
```

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección |
| `spec` | Contrato OpenAPI o modelo de datos |
| `test` | Tests |
| `docs` | Documentación |
| `chore` | Infra, build, dependencias |
| `refactor` | Cambio sin comportamiento nuevo |

Scopes habituales: `video`, `messaging`, `webhooks`, `api`, `db`, `frontend`,
`ci`, `monorepo`, `agents`.

```
feat(video): generate Vonage token endpoint
fix(webhooks): validate HMAC signature
spec(api): add VideoTokenResponse schema
test(contract): add POST /video-tokens
docs(agents): add commit and branch conventions
chore(monorepo): init pnpm workspaces
```

Commits pequeños y con un propósito. Nada de `wip`, `fixes` ni `varios cambios`.

---

## 8. Pull Requests

- **1 tarea = 1 rama = 1 PR**, con el ID en el título: `feat(A3): POST /video-tokens`.
- Descripción mínima: **qué**, **por qué**, **cómo probarlo**, **decisiones tomadas**.
- Requisitos para mergear: **CI verde + 1 approval**.
- Merge: **squash**. La rama se borra después.
- Si el PR cambia `openapi.yaml` o `schema.prisma`, decirlo explícitamente en la
  descripción y pedir revisión de otra persona.

---

## 9. Estándares de código

- **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`). Prohibido `any`
  implícito; si necesitas escapar, usa `unknown` + validación.
- **ESM en el backend**: los imports internos llevan extensión `.js`
  (`import { prisma } from './db/client.js'`).
- **Validación de entrada con `zod`** en todo endpoint que reciba datos.
- **Sin `console.log`** en backend: usa el logger (`src/lib/logger.ts`).
- **Sin secretos ni teléfonos reales** en código, tests, seeds ni fixtures.
- **Sin refactors oportunistas** dentro de un PR de funcionalidad.
- Comentarios solo para el **por qué**, no para el qué.

---

## 10. Testing

| Tipo | Herramienta | Dónde | Cuándo |
|---|---|---|---|
| Unitario | Vitest | `src/**/*.test.ts(x)` | Siempre |
| Contrato | Pact | `backend/tests/contract/` | Endpoints de la API |
| Integración | Supertest | `backend/tests/integration/` | Rutas + BD/webhooks |
| E2E | Playwright | `frontend/tests/e2e/` | Flujo completo (I1) |

Reglas:

- Los tests **unitarios no tocan Postgres**. Se mockea Prisma o se usa un doble.
- Los **contract tests y E2E los define el equipo**, no la IA (ver §12).
- Nombres descriptivos en español o inglés, pero **consistentes dentro del archivo**:
  `it('devuelve 404 cuando la incidencia no existe')`.
- Un bug arreglado = un test que lo reproduce.

> Las carpetas `tests/contract`, `tests/integration` y `tests/e2e` se crean con
> las tareas A5, B5, C6 e I1. No las crees vacías "por si acaso".

---

## 11. Frontera backend ↔ frontend

- El backend expone `/api/...`. El frontend **nunca** habla con Postgres.
- El contrato vive en `backend/openapi.yaml` (**T1**).
- El frontend consume **solo** tipos/cliente generados. Nada de interfaces
  escritas a mano que dupliquen el contrato.
- En desarrollo, Vite reenvía `/api` a `http://localhost:3000` (sin CORS).
- Los errores de la API son JSON: `{ "error": "<mensaje>" }` con el status
  adecuado (`400`, `403`, `404`, `409`, `500`).

---

## 12. Constraints para asistentes de IA (Copilot, Cursor, etc.)

**Permitido**

- Implementar una tarea ya refinada en el issue.
- Escribir tests unitarios y de integración.
- Refactorizar dentro del alcance del PR.
- Explicar código y proponer alternativas.

**Prohibido sin un PR explícito y aprobado**

- Modificar `backend/openapi.yaml` o `backend/prisma/schema.prisma`.
- Escribir specs, arquitectura o ADRs (`docs/ARCHITECTURE.md`).
- Escribir contract tests (Pact) o E2E (Playwright).
- Añadir dependencias nuevas.
- Cambiar el alcance del MVP o inventar requisitos que no están en
  `docs/MVP_DEFINITION.md`.
- Tocar `.github/workflows/`, `docker-compose.yml` o la configuración de
  seguridad sin justificarlo.

**Siempre**

- Si falta información, **preguntar** en vez de suponer.
- Ejecutar `pnpm check` y `pnpm test` antes de proponer el cambio como terminado.
- Responder con el **diff mínimo** necesario, sin reformatear archivos ajenos.
- No pegar secretos, tokens ni teléfonos reales en ejemplos.

---

## 13. Cómo verificar que lo hiciste bien

Antes de pedir review, desde la raíz:

```bash
pnpm check          # debe terminar sin errores
pnpm test           # todos los tests en verde
pnpm build          # compila ambos workspaces
pnpm dev            # backend en :3000 y frontend en :5173
```

Y comprobar a mano lo que aplica a tu tarea:

```bash
curl http://localhost:3000/api/health
docker compose ps                  # homefix-db en healthy
tail -f backend/logs/app.jsonl     # aparece tu petición en JSONL
```

**Criterio de "Done"** (resumen de [`docs/TASKS.md`](./docs/TASKS.md) §12):

- [ ] Caso de uso cumplido y criterio de aceptación marcado en el issue
- [ ] Decisiones de refinamiento anotadas en el issue
- [ ] Tests añadidos y en verde
- [ ] `pnpm check` sin errores
- [ ] Contrato/schema actualizado en el mismo PR (si aplica)
- [ ] Demo local del slice verificada
- [ ] CI verde + 1 approval → squash merge

---

## 14. Si te bloqueas

1. Mira [`docs/LOCAL_SETUP.md`](./docs/LOCAL_SETUP.md) §10 (errores comunes).
2. Comenta en el issue qué has probado y qué esperabas.
3. Llévalo al sync (2×/semana, máx. 30 min). Todo lo demás, async.

**No** dejes una rama parada en silencio una semana. Si no llegas, se parte la
tarea.
