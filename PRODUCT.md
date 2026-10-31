# Centro digital del viajero
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
JavaScript, HTML y CSS; Flask/Python; Supabase Auth y PostgreSQL; despliegue Vercel. LangChain se incorporará en Sprint 2.

## Users
Viajeros que preparan un viaje y agentes que atienden solicitudes. Agentes con permiso editorial administran contenidos.

## Product Purpose
Reunir orientación por destino, pendientes y atención humana trazable. El MVP funciona sin chatbot.

## Capabilities and Constraints
Sprint 1: US01, US03, US04, US06-US12, autenticación y edición de contenidos. Sprint 2: US02, US05, US13, US14 y alertas. Cada viajero solo accede a sus viajes y solicitudes. Una solicitud solo se cierra con una respuesta. La reasignación conserva historial.

## Evidence on Hand
Modulo_2_Historias_y_Backlog.docx, Fundamentos.drawio y tablero Miro uXjVEbvFcMs=. Repositorio existente Proyect_Mercadosviva. Logo Chambiray en frontend/src/assets/image.png; conservar original.

## Brand Commitments
Interfaz en español, lectura clara, identidad propia y sin decoración genérica de IA. Se mantiene el logo existente como activo del proyecto; nombre de producto descriptivo Centro del viajero.

## Open decisions
Proveedor LLM y embeddings para Sprint 2. Canal de alertas inicial dentro de la aplicación. No incluir datos legales de viaje sin fuentes y revisión editorial.

## Acceso actualizado
Por solicitud del usuario, el viajero entra sin login. Sesiones anónimas aisladas de Supabase; continuidad en el mismo navegador. Solo el equipo de atención mantiene acceso autenticado separado.
