# frontend/AGENTS.md — Reglas de la capa frontend

> **Deltas sobre [`AGENTS.md`](../AGENTS.md).** Si algo no está aquí,
> aplica la guía raíz. Este archivo no repite reglas globales.

---

## 1. Stack

React 19 · TypeScript · Vite 7 · TanStack Query 5 · Vitest + Testing Library +
jsdom · Vonage Video **Web** SDK (llega con C3).

## 2. Mapa de carpetas (estado actual)

```
frontend/
├── index.html               # entrada de Vite
├── vite.config.ts           # proxy /api → :3000, envDir: '..', vitest
└── src/
    ├── main.tsx             # QueryClientProvider + render
    ├── App.tsx              # pantalla "Homefix Connect" (smoke)
    ├── api/http.ts          # cliente HTTP provisional (C1 lo sustituye)
    ├── index.css            # estilos base
    └── test/setup.ts        # jest-dom
```

Carpetas que **se crean con las tareas**, no antes: `components/`, `pages/`,
`hooks/` (C2-C5).

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

- **Nada se escribe a mano que duplique el contrato.** Mientras `pnpm gen:types`
  no exista (T1), usa `getJson<T>()` de `src/api/http.ts` con tipos locales
  marcados como provisionales. Cuando T1 exista, C1 sustituye `http.ts` por el
  cliente generado y los tipos locales desaparecen.
- La URL base sale de `VITE_API_BASE_URL` (vacía en local: el proxy de Vite
  resuelve `/api`).

## 5. Pantalla de vídeo (C3/C4)

- El token **lo genera el backend**. El frontend nunca ve `VONAGE_API_SECRET` ni
  la private key.
- Inicializa el SDK en un `useEffect` y **limpia siempre** en el `return`
  (`session.disconnect()`, `publisher.destroy()`, parar tracks). Si no se limpia,
  la cámara se queda encendida.
- Estado mínimo explícito: `idle | connecting | connected | error | ended`.
- Maneja `session.end` / `session.disconnected` sin dejar la UI colgada.
- Los tests **no** abren cámara ni red: se mockea el SDK.

## 6. Estilos

- CSS plano por ahora (`index.css`). Sin framework de UI ni CSS-in-JS hasta que
  haya una necesidad real y un PR que lo justifique.
- Accesibilidad mínima obligatoria: botones reales (`<button>`), `label` en
  formularios, `aria-live` para toasts y estados.

## 7. Tests en esta capa

- Vitest con `environment: 'jsdom'` (ya configurado).
- Testing Library + `userEvent`. Nada de `container.querySelector`.
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
- ❌ Escribir a mano los tipos de la API en vez de generarlos (cuando T1 exista).
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

