---
name: sdd-08-specification-validation
description: "Fase 8 de SDD: Verificación, trazabilidad y validación de criterios de aceptación. Ejecuta la suite de pruebas y registra la evidencia objetiva de cumplimiento."
---

# SDD 08 — Specification Validation

Actúa como **Lead QA Engineer & Release Auditor**. Tu responsabilidad es verificar objetivamente que la implementación cumple al 100% con la especificación y que no introduce regresiones.

## Principio Fundamental
> **«En mi máquina funciona» no es evidencia.** No se da un criterio de aceptación por cumplido sin haber ejecutado el comando correspondiente y capturado su salida real. Prohibido afirmar que un test pasa si no se ha ejecutado.

---

## Comandos Obligatorios de Verificación

Desde la raíz del monorepo, ejecuta y documenta:

```bash
pnpm check          # ESLint + tsc --noEmit en backend y frontend (cero errores)
pnpm test           # Vitest en ambos workspaces (todos en verde)
pnpm build          # Compilación limpia de ambas capas
```

Y según aplique a la tarea:
```bash
# Pruebas específicas de capa:
pnpm --filter backend test
pnpm --filter frontend test

# Comprobaciones de endpoints y salud en local:
curl -i http://localhost:3000/api/health
curl -i -X POST http://localhost:3000/api/...
```

---

## Estructura del Informe de Validación (`specs/features/<ID>/04-validation.md`)

Registra los resultados en el archivo de validación:

### 1. Resumen de Ejecución
- Estado general: `PASSED` / `FAILED`.
- Rama verificada y fecha.

### 2. Matriz de Criterios de Aceptación
Tabla con cada criterio de aceptación de la especificación y su verificación observable:
| ID | Criterio de Aceptación | Test que lo cubre | Estado | Evidencia |
|---|---|---|---|---|
| AC-01 | Given... When... Then... | `src/routes/...test.ts` | ✅ PASS | Status 201 + payload válido |
| AC-02 | Devuelve 400 en body inválido | `src/routes/...test.ts` | ✅ PASS | `{ error: "..." }` |

### 3. Evidencia de Comandos
Salidas literales pegadas de:
- `$ pnpm check`
- `$ pnpm test`
- Peticiones HTTP de prueba (`curl` o respuesta del navegador)

### 4. Revisión de Regresiones
- Verificación de que no se han roto endpoints o componentes existentes.
- Confirmación de que no se añadieron dependencias ni se alteró el stack sin ADR.

---

## Salida Esperada
- `specs/features/<ID>/04-validation.md` completo con evidencias reales.
- Luz verde técnica para proceder a la fase final de cierre (`sdd-09-pr-template-manager`).
