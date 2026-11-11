# Directorio de Especificaciones (`specs/`)

Este directorio almacena los artefactos producidos por el flujo de **Spec-Driven Development (SDD)**.

## Estructura

```text
specs/
├── project-context.md          # Contexto general del proyecto (generado por sdd-01-project-discovery)
├── README.md                   # Este archivo
└── features/                   # Especificaciones por tarea/issue
    └── <ID-tarea>-<slug>/
        ├── 01-requirements.md   # Requisitos clasificados y notas de clarificación
        ├── 02-specification.md  # Contratos entrada/salida, reglas y acceptance criteria
        ├── 03-plan.md           # Plan técnico de implementación
        └── 04-validation.md     # Reporte de ejecución de tests y evidencias
```

## Reglas
1. **Inmutabilidad de alcance sin aprobación**: Si se descubre una regla nueva durante la implementación, se vuelve a la fase de especificación y se consulta.
2. **Trazabilidad**: Cada especificación debe enlazar al issue correspondiente de GitHub.
3. **Specs First**: No se inicia código en `backend/` o `frontend/` sin que `02-specification.md` y `03-plan.md` estén aprobados.
