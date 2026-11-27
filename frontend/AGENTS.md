# frontend/AGENTS.md — Reglas de la capa frontend

> **Deltas sobre [`AGENTS.md`](../AGENTS.md).** Si algo no está aquí,
> aplica la guía raíz. Este archivo no repite reglas globales.

---

## 1. Stack

React 19 · TypeScript · Vite 7 · TanStack Query 5 · Vitest + Testing Library +
jsdom · Vonage Video Web SDK `2.36.0` (C3).

## 2. Mapa de carpetas (estado actual)

```
frontend/
├── index.html               # entrada de Vite
├── vite.config.ts           # proxy /api → :3000, envDir: '..', vitest
└── src/
    ├── main.tsx             # QueryClientProvider + render
    ├── App.tsx              # render de IncidentDetail con ?incidentId=
    ├── api/client.ts        # transporte getJson/postJson + HttpError (C1/C3)
    ├── api/generated/       # tipos generados desde openapi.yaml (C1)
    ├── api/incidents.ts     # tipos generados + getIncident (C1/C2)
    ├── api/video.ts         # requestVideoToken (C3)
    ├── components/          # JoinButton (C2), VideoCall (C3/C4/C8), FinishToast (C5)
    ├── hooks/               # useIncident (C2/C5), useVideoToken/useVideoCall (C3/C4/C8), useFinishToast (C5)
    ├── pages/               # IncidentDetail (C2/C3)
    ├── index.css            # estilos base y stage de vídeo
    └── test/
        ├── fixtures/        # fixtures de API (C2)
        └── setup.ts         # jest-dom + cleanup de Testing Library
```

`components/`, `pages/`, `hooks/` y `test/fixtures/` se crearon en C2. C3 añade
`VideoCall` y sus hooks; C4, C5 y C8 añaden las suyas.

## 3. Componentes vs hooks

| Tipo | Responsabilidad | No hace |
|---|---|---|
| **Página** (`pages/`) | Componer datos + componentes para una ruta | Lógica de negocio compleja |
| **Componente** (`components/`) | Render y eventos de UI; recibe props | Llamar a la API directamente |
| **Hook** (`hooks/`) | Lógica reutilizable, estado, efectos, queries | Renderizar JSX |

Regla: si un componente pasa de ~120 líneas o mezcla `fetch` con JSX, extrae un
hook.

## 4. Datos: solo TanStack Query

- Toda lectura/escritura de la API va por `useQuery` / `useMutation`. **No**
  `useEffect` + `fetch` a mano.
- Claves de query en un solo sitio y con el mismo formato:

```ts
['health']
['incident', incidentId]
['video-session', visitId]
```

- **Nada se escribe a mano que duplique el contrato.** Los tipos viven en
  `src/api/generated/openapi.d.ts` y se regeneran con `pnpm gen:types`.
  `src/api/client.ts` es solo el transporte `fetch` fino.
- La URL base sale de `VITE_API_BASE_URL` (vacía en local: el proxy de Vite
  resuelve `/api`).

## 5. Pantalla de vídeo (C3/C4/C7)

- El token **lo genera el backend**. El frontend nunca ve `VONAGE_API_SECRET` ni
  la private key.
- Inicializa el SDK en un `useEffect` y **limpia siempre** en el `return`
  (`session.unsubscribe()`, `session.unpublish()`, `publisher.destroy()`,
  `session.disconnect()` y `off` de los listeners). Si no se limpia, la cámara se
  queda encendida.
- Estado mínimo explícito: `idle | connecting | connected | error | ended`.
  El texto de `ended` es "Desconectada".
- C4 escucha `streamCreated` / `streamDestroyed`: suscribe el vídeo remoto en su
  propio `<div ref>`, nunca en el contenedor local, y muestra
  "Esperando a la otra persona…" mientras no llega ese stream.
- Maneja `sessionDisconnected` / `connectionDestroyed` / `streamDestroyed` sin
  dejar la UI colgada. No hay reconexión automática ni timeout en el MVP.
- C8 expone `hangup()` en `useVideoCall` y un botón "Colgar" en `VideoCall`. La
  desconexión es local; el cierre global sigue por webhook de Vonage.
- C7 expone `switchCamera()` en `useVideoCall` y un botón "Alternar cámara" en
  `VideoCall`. Usa `publisher.cycleVideo()` sobre el publisher activo: **no** se
  recrea el publisher ni se llama a `unpublish()`, para no colgar al par vía
  `streamDestroyed`. El fallo es silencioso y el botón se deshabilita fuera de
  `connected`. El texto no promete cámara frontal/trasera.
- C5 detecta la transición a `VIDEO_COMPLETED` con `useFinishToast` y muestra
  `FinishToast` durante 5 s. `useIncident` consulta cada 5 s hasta que la
  incidencia se completa. Sin librería de toast.
- Los tests **no** abren cámara ni red: se mockea el SDK.

## 6. Estilos

- CSS plano por ahora (`index.css`). Sin framework de UI ni CSS-in-JS hasta que
  haya una necesidad real y un PR que lo justifique.
- Accesibilidad mínima obligatoria: botones reales (`<button>`), `label` en
  formularios, `aria-live` para toasts y estados.

## 7. Tests en esta capa

- Vitest con `environment: 'jsdom'` (ya configurado).
- Testing Library + `fireEvent` (`user-event` no está instalado). Nada de
  `container.querySelector`.
- Consulta por rol/texto visible: `getByRole('button', { name: /entrar/i })`.
- Mockea `fetch` con `vi.stubGlobal` (patrón ya usado en `App.test.tsx`).
- Nada de snapshots: se rompen solos y no dicen qué falla.

## 8. Comandos de esta capa

```bash
pnpm --filter frontend dev
pnpm --filter frontend test
pnpm --filter frontend typecheck
pnpm --filter frontend build
```

## 9. No hagas

- ❌ `fetch` dentro de un componente (usa un hook + TanStack Query).
- ❌ Guardar tokens o secretos en `localStorage`.
- ❌ Escribir a mano los tipos de la API en vez de generarlos con
  `pnpm gen:types`.
- ❌ Añadir un router, un estado global (Redux/Zustand) o una librería de UI sin
  PR y justificación.
- ❌ Cambiar `vite.config.ts` (proxy, `envDir`) sin avisar: afecta a todo el
  equipo.
- ❌ Usar `any` para callar a TypeScript.

## 10. Skills disponibles para esta capa

Están instaladas localmente en `skills/` dentro del repositorio y se usan durante el desarrollo del frontend:

- **`frontend-dev-guidelines`** (`skills/frontend-dev-guidelines/SKILL.md`): Directrices de estructura frontend con React y TypeScript, organización en componentes vs hooks, data-fetching con TanStack Query y TypeScript estricto.
- **`vercel-react-best-practices`** (`skills/vercel-react-best-practices/SKILL.md`): Reglas de optimización de rendimiento: eliminar waterfalls en datos asíncronos, evitar re-renders innecesarios, lazy loading para componentes pesados y limpieza de efectos.
- **`react-best-practices`** (`skills/react-best-practices/SKILL.md`): Patrones de diseño de componentes, composición limpia con props/children, custom hooks desacoplados y estado predecible.

