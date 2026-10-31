# Inicio: explorador de destinos

Actualizado el 27 de octubre de 2026 según las referencias visuales del usuario.

- `#/home`: buscador de país o ciudad, accesos por país y tarjetas con fotografías locales.
- La búsqueda ignora mayúsculas y tildes. Los resultados se limitan al catálogo activo de Supabase; hoy contiene Cartagena, Medellín, Madrid y Lima.
- `#/destination/:id`: fotografía del destino, guías generales y específicas disponibles, filtro por categoría y acceso a crear un viaje con el destino seleccionado.
- `#/preparation`: conserva el tablero de preparación y su checklist. Crear o seleccionar un viaje lleva a este tablero.
- Navegación superior en escritorio y menú desplegable en móvil; se conserva el acceso sin registro del viajero.
- Fotografías y sus fuentes: `frontend/src/assets/destinations/sources.json`. Los archivos se sirven localmente para mantener la política de seguridad del contenido.
- No se añadieron paquetes, precios, requisitos migratorios ni un chatbot simulado.

Verificación: navegador real a 1440 y 390 píxeles; imágenes cargadas; búsqueda por país, ciudad y sin tildes; estado sin coincidencias y restablecimiento; filtros de guías; preselección de Madrid; acceso a preparación; menú móvil y Escape; sin desbordamiento horizontal ni errores JavaScript. Las 15 pruebas de validación y acceso invitado pasaron. La compilación de recursos para Vercel terminó correctamente. Despliegue aún pendiente.
