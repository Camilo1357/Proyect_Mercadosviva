# Búsqueda turística con Exa y OpenAI

## Activación local

En el `.env` de `Proyect_Mercadosviva`, completa las variables sin compartirlas por chat ni subir el archivo a Git:

```dotenv
EXA_API_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Reinicia Flask después de guardar. En Vercel, configura las mismas variables como secretos del proyecto y vuelve a desplegar. El complemento Exa de Codex no sustituye la clave de API de la aplicación.

## Flujo

`POST /api/tourism/search`, con sesión Supabase de invitado o usuario, recibe `{"query":"naturaleza en Perú"}`. No envía perfiles, viajes o solicitudes a los proveedores: únicamente la consulta escrita.

1. OpenAI Responses interpreta destino e intereses mediante JSON Schema estricto. Si el destino es ambiguo, devuelve una pregunta; si la consulta no trata de turismo, explica el alcance.
2. Exa Search consulta hasta ocho páginas con su contenido textual.
3. OpenAI organiza hasta seis actividades con título, ciudad, país, categoría y descripción. Cada tarjeta debe referir una fuente recibida y un fragmento literal verificable; el backend descarta referencias inexistentes y fragmentos que no aparecen en la fuente.
4. La interfaz presenta tarjetas, filtro por ciudad y enlaces a las publicaciones. Fotos remotas son imágenes de las publicaciones, no una garantía de que representen la actividad específica. Ante imagen ausente o fallida se muestra la ubicación, sin sustituirla por una fotografía inventada.

El buscador consulta destinos fuera del catálogo inicial. El formulario de registro de viajes todavía utiliza el catálogo administrado en Supabase; esta integración no crea destinos automáticamente ni implementa el chatbot de LangChain.

## Controles y límites

- Credenciales solo en Flask; conexiones a proveedores con endpoints fijos. URLs de resultados solo HTTPS, sin credenciales, IP literales ni hosts locales.
- Instrucciones de páginas tratadas como datos no confiables. Los resúmenes siguen siendo generados por IA; los vínculos permiten comprobarlos. La comprobación del fragmento no garantiza por sí sola toda la interpretación semántica.
- Solo el envío del formulario o un botón de país inicia una consulta; escribir no consume búsquedas.
- `store:false` en OpenAI. No se registran claves ni respuestas completas de errores de proveedor.
- Caché de consultas de 10 minutos, máximo 100 entradas por proceso; cinco búsquedas nuevas por usuario/minuto y 30 por proceso/minuto.
- Estos límites son por proceso, no una cuota distribuida. Antes del despliegue público, establecer presupuestos en los proveedores y límites compartidos o protección de plataforma; identidades anónimas pueden renovarse y Vercel puede ejecutar varios procesos.
- Vercel `maxDuration` configurado a 90 segundos; comprobar soporte del entorno al desplegar. Timeouts y fallos de proveedor se muestran con opción de reintentar.

## Verificación al implementar

31 pruebas de backend pasaron: validación, acceso invitado y búsqueda con proveedores simulados, incluyendo caché, referencias inválidas, URLs inseguras, timeout, configuración ausente y límites. Navegador real a 1440 y 390 px con respuestas simuladas: envío explícito, filtros, enlaces, ausencia de desbordamiento, error/reintento, aclaración, vacío, carga y descarte de respuestas al navegar. No se han comprobado todavía las credenciales ni resultados reales: faltan ambas claves en `.env`.

Documentación consultada: [Exa Search](https://exa.ai/docs/reference/search), [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

Verificación real del 27 de octubre de 2026: OpenAI y Exa respondieron HTTP 200. Una búsqueda de actividades culturales en Argentina completó el flujo desde el navegador y devolvió una actividad en Buenos Aires con enlace a la fuente. Se ajustó la interpretación para aceptar países completos sin exigir una ciudad. Las 16 pruebas del servicio de búsqueda pasaron. Las imágenes dependen de las fuentes; el resultado probado no incluía foto.
