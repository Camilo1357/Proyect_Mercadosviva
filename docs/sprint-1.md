# Sprint 1
Implementación de US01, US03, US04, US06-US12; autenticación, RLS y gestión editorial.
La API usa el JWT de cada usuario para todas las consultas. Nunca utiliza service_role.
Las operaciones de viaje/checklist y respuesta/estado son transacciones PostgreSQL.
Los roles se administran exclusivamente desde SQL privilegiado; el registro siempre crea traveler.
No hay chatbot, recomendaciones automáticas ni alertas: corresponden al Sprint 2.

## Dirección de la pantalla
Modo Operate para tareas; Read para artículos. Hereda Chambiray y la orientación aceptada.
## Direction contract
THESIS: preparar un viaje y llegar a una persona con el mínimo de fricción.
OWN-WORLD: azul petróleo para navegación, fondos marfil y blanco, acento teal; tipografía sans legible y estados explícitos.
STORY: elegir viaje, ver qué falta, consultar contenido o pedir ayuda.
FIRST VIEWPORT: navegación lateral estable, encabezado con acción Nuevo viaje, franja de viaje seleccionado; debajo checklist amplia y orientación en columna secundaria.
FORM: organización funcional de aplicación, ritmo editorial de guías de viaje, tercer candidato; seed:5eda60eb59480e63. El brief confirmado y el logo existente fijan las decisiones visuales.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Datos editoriales
Las guías iniciales son listas genéricas de preparación, no requisitos migratorios. Cada artículo tiene fuente y puede retirarse. No se inventan visados ni condiciones por nacionalidad.
