# 04 — Validación · C7 · Alternar cámara durante la visita

> **Rama:** `feat/C7-camera-switch` · **Spec:** `02-specification.md`
> **Fecha:** 27/11/2026 · **Entorno:** local, sin cámara ni red reales en tests.

---

## 1. TDD

### Fase roja

```text
$ pnpm --filter frontend test
Test Files  1 failed | 5 passed (6)
Tests       7 failed | 54 passed (61)
VideoCall.test.tsx: Unable to find an accessible element with the role "button"
and name "Alternar cámara"  (7 tests)
```

Los 7 tests nuevos fallaron por la ausencia del botón y de `switchCamera()`.

### Fase verde

```text
$ pnpm --filter frontend test
Test Files  6 passed (6)
Tests       61 passed (61)
VideoCall.test.tsx  27 tests
```

---

## 2. Validación completa

```text
$ pnpm check
$ eslint .                          → sin errores
$ tsc --noEmit (frontend)           → OK
$ tsc --noEmit (backend)            → OK

$ pnpm test
backend  → 15 ficheros · 174 tests passed
frontend →  6 ficheros ·  61 tests passed

$ pnpm build
backend build  → Done (tsc)
frontend build → Done (vite, 94 módulos)
warning: chunks > 500 kB (deuda ya conocida, no introducida por C7)
```

Nota: al cambiar a una rama con `schema.prisma` distinto hubo que ejecutar
`pnpm --filter backend db:generate` para regenerar el cliente Prisma de
`node_modules`; después de eso `pnpm check` quedó en verde.

---

## 3. Trazabilidad de criterios

| AC | Resultado |
|---|---|
| AC-01 `cycleVideo()` sin otro publisher | ✅ test "alterna la cámara sin crear otro publisher" |
| AC-02 llamada conectada tras el cambio | ✅ test "mantiene la llamada conectada al alternar" |
| AC-03 fallo silencioso | ✅ test "no muestra error si falla el cambio de cámara" |
| AC-04 botón deshabilitado fuera de `connected` | ✅ test "deshabilita Alternar cámara…" |
| AC-05 doble clic ignorado | ✅ test "ignora un segundo clic…" |
| AC-06 cleanup durante el cambio | ✅ test "destruye solo el publisher activo…" |
| AC-07 sin cámara/red y suites verdes | ✅ comandos anteriores; sin dependencias nuevas |

---

## 4. Pendiente para el PR

- Demo manual en móvil con dos pestañas y Vonage real: pulsar "Alternar cámara"
  y comprobar que la otra persona no se cuelga y que el LED se apaga al salir.
  No ejecutada aquí: requiere dispositivo con cámara y cuenta Vonage.
- `docs/PROJECT_STATUS.md` y el resto de cambios de alcance están guardados en
  el stash `docs/C7-mvp-scope: alcance C7`, listos para aplicar en esa rama y
  aprobarse antes de este PR de código.
- No se han hecho push ni PR: se espera autorización explícita.
