# Sprint 2 · Preparación y asistente

Implementa US02, US05, US13 y US14 del backlog, junto con alertas dentro de la aplicación.

## Recorridos

- Mi preparación → Editar viaje. Cambia destino y fechas. Un cambio de fechas recalcula vencimientos y conserva el avance; un destino diferente vuelve a marcar las tareas como pendientes. La actualización y su checklist se ejecutan en una transacción.
- Mi preparación → Fechas que conviene tener presentes. Muestra pendientes vencidos, de hoy o de los próximos siete días y la salida próxima. Las tareas completadas y los viajes terminados dejan de generar esos avisos. El cálculo usa horario de Colombia.
- Mi preparación → Lecturas para tu viaje. Prioriza artículos vigentes de categorías pendientes y del destino, con guías generales como respaldo.
- turIA en el inicio. Abre el botón flotante «Habla con turIA», selecciona un viaje si corresponde, pregunta sobre tu preparación o destinos. El chat usa LangChain con OpenAI y la clave existente OPENAI_API_KEY. Conserva contexto durante la página abierta; recargar inicia una nueva conversación.
- Pedir ayuda a una persona. Revisa la pregunta y confirma el envío del contexto reciente. La solicitud aparece en Mis solicitudes y en Atención, identificada como CHATBOT. El identificador de envío evita duplicados al reintentar.

## Configuración

Instalar con `.venv\Scripts\python.exe -m pip install -r requirements.lock` y ejecutar `.venv\Scripts\python.exe -m flask --app app run --port 5050`. Abrir http://127.0.0.1:5050/#/home.

Se conserva OPENAI_MODEL del .env (gpt-4.1-mini por defecto). Las claves siguen únicamente en el backend. `iniciar.ps1` comprueba también la instalación de LangChain.

La migración `backend/migrations/20261109212810_sprint2_traveler_assistant.sql` ya está aplicada en centro-viajero. Fue generada con la CLI y su nombre se alineó con la versión del historial remoto. En una base nueva, aplicar primero las migraciones y el seed del sprint 1, luego esta migración.

## Límites y decisiones

El asistente recupera hasta ocho artículos vigentes del catálogo, priorizados por coincidencia de texto, y agrega la lista del viaje autorizado. El historial es contexto de conversación, no evidencia. Se validan referencias a fragmentos recuperados y se enlazan sus fuentes originales. Esta comprobación reduce respuestas sin respaldo, pero no demuestra por sí sola la exactitud semántica de cada frase generada. Si faltan fuentes o falla el proveedor, ofrece orientación humana.

Las alertas se calculan al abrir la preparación y tras marcar tareas. El chat no crea solicitudes hasta que el viajero confirma el envío. El contexto enviado aparece claramente etiquetado como aportado por el viajero. Las consultas usan el JWT del usuario y las reglas RLS existentes.

La limitación de consultas del asistente es por proceso, como en el buscador. Los límites de proveedor siguen siendo necesarios para controlar el gasto global en un despliegue con varios procesos.

## Validación

- 65 pruebas automáticas correctas, 2 pruebas anteriores omitidas por faltar credenciales QA.
- Prueba real de LangChain: equipaje con enlace a guía, tareas pendientes del viaje y consulta sin respaldo con derivación humana.
- Prueba real de Supabase: editar fechas conservando avance, cambiar destino reiniciando pendientes, recomendaciones, alertas, creación idempotente de solicitud y rechazo de acceso de otro viajero.
- Flujo SQL transaccional de agente verificado hasta CERRADA; rollback al terminar para conservar el rol original del usuario de prueba.
- Chrome a 1440 y 390 píxeles: pantallas, enlaces a fuentes, envío a atención y navegación al caso. Sin errores de JavaScript ni desbordamiento horizontal.

La cuenta de agente solicitada está creada y habilitada; requiere confirmar el correo para completar el acceso. El inicio de sesión del equipo valida el rol y dirige a Atención. El equipo puede cambiar su contraseña desde el enlace del pie de página. La publicación en Vercel sigue pendiente.

## Referencias de implementación

- https://docs.langchain.com/oss/python/integrations/chat/openai
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Dirección visual

Extensión Operate de la interfaz existente. Conversación principal con contexto de viaje, ayuda lateral, citas y revisión del envío. Alertas y recomendaciones acompañan la checklist. Se conservan Inter, colores, controles y espaciados del sistema existente. El detector señaló convenciones y valores preexistentes; las nuevas superficies reutilizan los tokens actuales.

Revisión independiente de Impeccable: ship para las superficies nuevas. Se corrigieron el orden de título/metadatos y el foco al abrir/cerrar la revisión del envío. El documentador verificó continuidad visual. DESIGN.md y su sidecar conservan descripciones históricas de la navegación lateral del sprint 1; el funcionamiento actual y el alcance del sprint 2 están documentados aquí.

## turIA desplegable

El asistente está integrado en el inicio y se retiró su entrada del menú. El enlace anterior #/assistant abre el inicio con el panel desplegado. Conserva la conversación y el borrador al minimizar, permite preguntas rápidas, muestra actividad durante la consulta y avisa de respuestas recibidas mientras está cerrado. Enter envía; Shift+Enter agrega una línea; Escape minimiza y devuelve el foco al botón. El movimiento respeta prefers-reduced-motion.

Pruebas de Chrome a 1440×1000 y 390×844 verificaron el desplegable, borradores, citas, envío a atención y navegación por teclado con API simulada. Una consulta real desde turIA respondió con una guía citada. Revisión independiente de Impeccable aprobada después de corregir la continuidad del foco.


## Búsqueda web de turIA

El asistente decide si responder con las guías y tareas del viaje o buscar páginas con Exa. Para destinos, actividades, transporte y requisitos específicos recupera hasta cinco fuentes web. Las fuentes se procesan internamente y no se muestran en el chat, por decisión del producto. Las preguntas de seguimiento utilizan el contexto reciente. Requiere EXA_API_KEY y OPENAI_API_KEY en el .env del backend.

Para requisitos personalizados de entrada pregunta por destino, nacionalidad del pasaporte, motivo y duración si faltan. Las consultas sobre migración, salud y seguridad filtran las fuentes por dominios de autoridades reconocidas. Esta lista no cubre todas las autoridades del mundo. Si no encuentra evidencia suficiente o el proveedor falla, ofrece atención humana. La fecha de consulta no garantiza que la publicación esté actualizada.

La búsqueda evita enviar identificadores evidentes en la consulta. Los textos recuperados se tratan como evidencia, no como instrucciones. El modelo selecciona identificadores de fragmentos recuperados, sin transcribir citas literales. El backend rechaza identificadores ajenos a la consulta y resuelve los enlaces originales. Esta validación comprueba la procedencia, no garantiza por sí sola que cada afirmación esté sustentada semánticamente.

Validación adicional: pruebas automáticas de filtrado de fuentes, consultas sensibles, aclaraciones, citas externas y fallos de proveedor; búsqueda real de requisitos para España con fuentes gubernamentales y respuesta sobre el Museo del Prado con enlace web.

## Países en la preparación

Crear y editar viajes permite buscar y seleccionar 257 países y territorios en español, además de las cuatro ciudades originales. El buscador ignora tildes. El catálogo de exploración conserva sus ciudades; `/api/destinations?scope=preparation` entrega el catálogo completo. Los destinos a nivel de país usan `city = country` y conservan las relaciones y políticas existentes.

En instalaciones nuevas, ejecutar también `backend/migrations/seed_countries.sql` después del esquema. Es una carga de datos idempotente, ya aplicada en centro-viajero. Nombres tomados de Unicode CLDR 48.0.0, archivos `cldr-core/supplemental/territoryInfo.json` y `cldr-localenames-full/main/es/territories.json`, excluyendo la región desconocida ZZ. Fuente: https://github.com/unicode-org/cldr-json/tree/48.0.0 ; licencia: https://www.unicode.org/license.txt . La selección no implica que existan guías específicas publicadas para cada lugar.

Verificado: crear viaje a Japón, generar cinco tareas y editar a Estados Unidos bajo rol authenticated en una transacción revertida. Chrome verificó selección, búsqueda sin tildes, validación sin resultados y composición a 1280 y 390 px.
