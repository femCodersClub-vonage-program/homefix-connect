# 02 — Specification · C1 · Cliente API generado desde OpenAPI

> **Issue:** [#17](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/17)
> **Rama:** `feat/C1-api-client` · **Size:** XS
> **Base:** `01-requirements.md` (mismo directorio) · `docs/ARCHITECTURE.md` ADR-006
> **Estado:** pendiente de aprobación. No se implementa hasta el OK explícito.

---

## 1. Objetivo

Sustituir los tipos manuales del frontend por tipos generados desde
`backend/openapi.yaml`, con un comando reproducible y la salida commiteada, sin
añadir un cliente runtime ni cambiar el comportamiento de C2.

---

## 2. Alcance

### Dentro

- `openapi-typescript` como devDependency de la raíz.
- Script `pnpm gen:types`.
- `frontend/src/api/generated/openapi.d.ts` generado y commiteado.
- Alias de tipos en `frontend/src/api/incidents.ts`.
- `frontend/src/api/client.ts` como transporte fino (sustituye a `http.ts`).
- Test de tipos que compara los alias con el schema generado.
- ADR-013 y actualización de `AGENTS.md`/`frontend/AGENTS.md`.
- Fixture de C2 actualizada al schema completo.

### Fuera

- Cliente runtime generado (`openapi-fetch`, `orval`).
- `postJson`, `PUT`, `DELETE` o nuevos endpoints.
- Cambios en `backend/openapi.yaml`, `schema.prisma` o backend.
- Lógica de C3/C4/C5.
- Check de frescura del generado en CI.
- Cambios de UI o de comportamiento visible.

---

## 3. Decisiones Cerradas

| Decisión | Elección |
|---|---|
| Herramienta | `openapi-typescript` (solo tipos, sin runtime). |
| Ubicación de la dependencia | `devDependencies` de la raíz. |
| Comando | `pnpm gen:types` → `openapi-typescript backend/openapi.yaml -o frontend/src/api/generated/openapi.d.ts` |
| Salida | `frontend/src/api/generated/openapi.d.ts`, commiteada. |
| Edición manual | Prohibida; se regenera. |
| Transporte | `frontend/src/api/client.ts` con `HttpError` y `getJson<T>`. |
| Tipos de incidencia | Alias de `components['schemas']`; sin enums locales. |
| Rol de UI | `Extract<Role, 'TENANT' \| 'TECHNICIAN'>`. |
| Test de contrato de tipos | `expectTypeOf` de Vitest; sin runtime. |
| CI | Sin cambios en C1. |

---

## 4. Contrato de Generación

### Comando

```bash
pnpm gen:types
```

Equivalente a:

```bash
openapi-typescript backend/openapi.yaml \
  --output frontend/src/api/generated/openapi.d.ts
```

Requisitos:

- Idempotente: ejecutarlo dos veces sin cambios en `openapi.yaml` no produce
  diff.
- Falla con código distinto de 0 si el YAML no es válido.
- No escribe fuera de `frontend/src/api/generated/`.
- No requiere que el backend esté arrancado ni Postgres.

### Salida

El archivo generado exporta, como mínimo:

```ts
export interface paths { /* ... */ }
export interface components {
  schemas: {
    Error: { error: string };
    IncidentStatus: 'REPORTED' | 'VISIT_ASSIGNED' | 'VIDEO_COMPLETED' | 'CLOSED';
    VisitStatus: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
    Role: 'TENANT' | 'TECHNICIAN' | 'MANAGER';
    Incident: { /* id, title, description, status, technician, visit */ };
    VideoTokenRequest: { incidentId: string };
    VideoTokenResponse: { applicationId: string; sessionId: string; token: string };
    /* ... */
  };
}
```

La forma exacta la decide el generador. El frontend consume los tipos; no se
copian a mano.

---

## 5. Tipos del Frontend

### `frontend/src/api/incidents.ts`

```ts
import type { components } from './generated/openapi.js';
import { getJson } from './client.js';

type Schemas = components['schemas'];

export type Incident = Schemas['Incident'];
export type IncidentDetailData = Incident;
export type IncidentStatus = Schemas['IncidentStatus'];
export type VisitStatus = Schemas['VisitStatus'];
export type Role = Schemas['Role'];
export type UserRole = Extract<Role, 'TENANT' | 'TECHNICIAN'>;

export function getIncident(
  incidentId: string,
  role: UserRole,
): Promise<IncidentDetailData> {
  return getJson<IncidentDetailData>(
    `/api/incidents/${encodeURIComponent(incidentId)}`,
    {
      headers: {
        'X-User-Id': demoUserIdByRole[role],
        'X-User-Role': role,
      },
    },
  );
}
```

Reglas:

- No se declaran enums ni interfaces de API a mano.
- `UserRole` excluye `MANAGER` porque la pantalla de C2 solo ofrece inquilina y
  técnica.
- `IncidentDetailData` es un alias, no una copia estructural.
- Las cabeceras y la URL no cambian respecto a C2.

### `frontend/src/api/client.ts`

Se mueve el contenido actual de `http.ts` sin cambios funcionales:

```ts
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export class HttpError extends Error { /* ... */ }

export type GetJsonOptions = { headers?: Record<string, string> };

export async function getJson<T>(
  path: string,
  options: GetJsonOptions = {},
): Promise<T> { /* ... */ }
```

Cambios:

- Desaparece el comentario “cliente provisional”.
- `http.ts` se elimina.
- `IncidentDetail.tsx` importa `HttpError` desde `../api/client.js`.
- `incidents.ts` importa `getJson` desde `./client.js`.

`getJson` sigue lanzando `HttpError` con el `status` HTTP para que C2 distinga
404 del resto. No se añade `postJson` en C1.

### Fixture de C2

`frontend/src/test/fixtures/incident.ts` debe cumplir el schema `Incident`:

```ts
{
  id: 'inc_demo',
  title: 'Fuga de agua en el baño',
  description: 'La tubería pierde bajo el lavabo.',
  status: 'VISIT_ASSIGNED',
  technician: { id: 'usr_technician_demo', name: 'Técnica Demo' },
  visit: {
    id: 'visit_demo',
    scheduledAt: '2026-11-17T10:00:00.000Z',
    status: 'CONFIRMED',
    videoSession: { id: 'vs_demo', status: 'PENDING' },
  },
}
```

No cambia ningún texto visible ni el comportamiento de los tests de C2.

---

## 6. Test de Tipos

Nuevo `frontend/src/api/types.test.ts`:

```ts
import { expectTypeOf, test } from 'vitest';

import type { components } from './generated/openapi.js';
import type { IncidentDetailData, Role, UserRole } from './incidents.js';

type Schemas = components['schemas'];

test('IncidentDetailData es el schema Incident generado', () => {
  expectTypeOf<IncidentDetailData>().toEqualTypeOf<Schemas['Incident']>();
});

test('UserRole excluye MANAGER', () => {
  expectTypeOf<UserRole>().toEqualTypeOf<'TENANT' | 'TECHNICIAN'>();
});

test('Role incluye MANAGER', () => {
  expectTypeOf<Role>().toEqualTypeOf<'TENANT' | 'TECHNICIAN' | 'MANAGER'>();
});
```

Objetivo: si alguien vuelve a escribir un tipo manual o el generador cambia,
`pnpm typecheck`/`pnpm test` lo detecta.

No se duplican los tests de comportamiento de C2 (render, 404, cabeceras); ya
existen y deben seguir pasando.

---

## 7. Errores y Comportamiento

- Sin cambios en la API ni en los códigos HTTP.
- `getJson` mantiene `HttpError.status`; C2 sigue mostrando “Incidencia no
  encontrada” para 404.
- `pnpm gen:types` falla si `openapi.yaml` no es parseable; no hay fallback a
  tipos manuales.
- Si el generador produce un tipo incompatible con C2, se ajusta el consumo del
  frontend, no el contrato.

---

## 8. ADR-013

Añadir a `docs/ARCHITECTURE.md`:

```md
### ADR-013 — Tipos de API generados con openapi-typescript

- **Contexto:** OpenAPI es la frontera (ADR-006), pero el frontend escribía los
  tipos a mano y se desincronizaban.
- **Decisión:** `openapi-typescript` como devDependency de la raíz; comando
  `pnpm gen:types`; salida commiteada en `frontend/src/api/generated/`; sin
  cliente runtime. `client.ts` sigue siendo un transporte `fetch` fino.
- **Consecuencias:** una sola fuente de verdad y menos retrabajo. A cambio, hay
  que regenerar y commitear al cambiar el contrato, y el archivo generado añade
  ruido al diff. Se descartan `openapi-fetch`/`orval` por KISS/YAGNI.
```

---

## 9. Criterios de Aceptación

- [ ] `pnpm gen:types` existe en la raíz y genera el archivo esperado.
- [ ] Ejecutarlo dos veces sin cambios en el YAML no produce diff.
- [ ] `frontend/src/api/generated/openapi.d.ts` está commiteado.
- [ ] `incidents.ts` no declara enums/interfaces de API a mano.
- [ ] `http.ts` ya no existe; `client.ts` conserva `HttpError` y `getJson`.
- [ ] `UserRole` excluye `MANAGER`; `Role` lo incluye.
- [ ] El test de tipos pasa.
- [ ] Los tests de C2 siguen pasando sin cambios de comportamiento.
- [ ] `pnpm check`, `pnpm test` y `pnpm build` en verde.
- [ ] ADR-013 y notas de `AGENTS.md`/`frontend/AGENTS.md` actualizadas.
- [ ] Sin cambios en `openapi.yaml`, `schema.prisma` ni backend.

---

## 10. Validación en Local

```bash
pnpm gen:types
git diff --exit-code -- frontend/src/api/generated/openapi.d.ts
pnpm check
pnpm test
pnpm build
```

Evidencia esperada:

- `gen:types` sin errores y sin diff en la segunda ejecución.
- Backend: 52 tests. Frontend: 12 existentes + 3 de tipos.
- `check` y `build` sin errores.
