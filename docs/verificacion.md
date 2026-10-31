# Verificación del Sprint 1

## Cambio posterior: viajeros sin login

Entrada directa mediante sesiones anónimas de Supabase, activadas en el proyecto por el usuario.
15 pruebas locales aprobadas (incluidas tres de acceso invitado).
Prueba real en Chrome: entrada sin contraseña, creación de viaje, persistencia al recargar, aislamiento de dos invitados, consola protegida y regreso desde acceso del equipo sin perder el viaje. Sin errores JavaScript.
Las dos cuentas usadas en el recorrido final y su viaje fueron eliminados después de verificarlo.
La sesión de invitado se conserva en el navegador; no es recuperable desde otro dispositivo sin vincular una cuenta, funcionalidad fuera de este cambio.

Fecha: 26 de octubre de 2026.

## Resultado funcional

- 12 pruebas locales de validación, rutas y cabeceras.
- 1 prueba integrada con Supabase: viaje, cinco tareas, persistencia, aislamiento entre usuarios, búsqueda, borrador/publicación, asignación, respuesta, reasignación y cierre con historial.
- 1 prueba de acceso directo a la API de Supabase: lectura ajena bloqueada, modificación de roles bloqueada, acceso anónimo bloqueado e inserción de eventos inventados bloqueada.
- 14 pruebas únicas. Las 13 iniciales pasaron; la prueba RLS adicional y las 12 locales pasaron después del refuerzo de cuentas activas.
- Revisión de seguridad de Supabase inicial: sin advertencias del esquema.
- Revisión final: el esquema sigue sin advertencias; Auth señala que la protección contra contraseñas filtradas está desactivada. Revisar su disponibilidad y activación antes de producción: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Navegador

Chrome local a 1440×1000 y 390×844. Acceso, panel de preparación, búsqueda, lectura, historial de solicitud, menú móvil, bandeja de agente y formulario editorial.
Sin errores JavaScript ni recursos fallidos durante el recorrido. Sin desbordamiento horizontal de página en móvil.
Se corrigió la ruta inicial vacía. Se verificó visibilidad del menú cerrado/abierto y conservación del desplazamiento al marcar tareas (606 px antes y después).

## Revisión visual

Revisión independiente de Impeccable: diseño coherente y funcional; tres observaciones resueltas en código:
- Conservar posición y foco al completar tareas.
- Excluir el menú móvil cerrado de la navegación por teclado.
- Aumentar contraste de placeholders.
La tipografía Inter se conserva de forma deliberada para una interfaz de operación y lectura.
Veredicto independiente final: ship, las tres observaciones resueltas y capturas verificadas con tareas/contador/progreso consistentes.

## Límites de verificación

No se ha desplegado en Vercel ni probado la entrega de correos de confirmación a usuarios reales.
La primera cuenta real con rol agent/editor está pendiente.
Pruebas funcionales de backend con datos temporales; no son una auditoría de seguridad externa.
La configuración de despliegue y el empaquetado local están preparados, pero la validación en Vercel requiere conectar la cuenta/repositorio.
