---
name: sdd-09-pr-template-manager
description: "Fase 9 de SDD: Documentación final y generación del Pull Request (.github/pull_request_template.md). Usar para preparar la entrega formal, consolidar evidencias y dejar el PR listo para revisión."
---

# SDD 09 — PR Template Manager

Actúa como **Release Coordinator & Documentation Specialist**. En esta fase final, consolidas todo el trabajo realizado y generas la descripción completa del Pull Request siguiendo la plantilla oficial de este repositorio en `.github/pull_request_template.md`.

## Principio Fundamental
> **Transparencia y evidencia completa.** La descripción del PR debe permitir al revisor entender exactamente qué hace, cómo lo hace y cómo se probó sin necesidad de investigar por su cuenta. Sin comandos de prueba pegados, el PR no se abre.

---

## Estructura Obligatoria de `.github/pull_request_template.md`

Rellena todas las secciones de la plantilla del repositorio:

```markdown
## Tarea

Closes #<ID>

## Qué hace

<!-- Resultado observable para quien usa la app o la API. En 1-2 frases. -->

## Cómo lo hace

<!-- Enfoque técnico, piezas tocadas (rutas, services, componentes, prisma) y decisiones de diseño. -->

## Cómo se probó en local

<!-- Comandos reales ejecutados y su salida pegada directamente desde specs/features/<ID>/04-validation.md -->

```text
$ pnpm test
$ pnpm check
$ curl ...
```

## Decisiones de especificación

<!-- Decisiones acordadas durante la fase de refinamiento y clarificación (sdd-03/sdd-04). Si no hubo cambios sobre el issue original, escribir "N/A". -->

## Riesgos o pendientes

<!-- Funcionalidades que quedan expresamente fuera de este PR o dependencias pendientes. Si no hay, "Ninguno". -->

## Checklist

- [x] Un solo issue en este PR
- [x] Tests añadidos o actualizados (unitario / contrato / integración según aplique)
- [x] `pnpm check` sin errores
- [x] `pnpm test` en verde
- [x] Probado en local (comandos y resultado arriba)
- [x] `openapi.yaml` / `schema.prisma` actualizados en este PR (si aplica)
- [x] Refinamiento del issue anotado como comentario
- [x] Sin secretos, tokens ni teléfonos reales
```

---

## Reglas de Entrega y Operación

1. **Revisión de Seguridad**: Verificar con `git status` y `git diff` que no se cuelan archivos temporales, logs, variables `.env` ni credenciales de prueba.
2. **Convención de Rama**: Confirmar que la rama sigue `<prefijo>/<ID>-<slug>` (ej. `feat/A3-video-tokens`).
3. **Regla de oro de los asistentes**: **NUNCA hagas `git push`, abras un PR ni merges a `main` sin autorización explícita de una persona**.
4. **Propuesta al Usuario**: Presenta el cuerpo del PR formateado en Markdown para que el usuario pueda copiarlo o autorizar su publicación.
