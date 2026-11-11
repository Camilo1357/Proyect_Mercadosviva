# Chambiray · Centro del viajero

Sprints 1 y 2 del centro digital de orientación y preparación del viajero.
Frontend JavaScript, HTML y CSS; API Flask; autenticación y base PostgreSQL en Supabase.
El logo original del repositorio se conserva sin modificaciones.

## Ejecutar en Windows

Abre la carpeta Proyect_Mercadosviva en VS Code. En su terminal PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock
.\.venv\Scripts\python.exe app.py
```

Abre http://127.0.0.1:5000/. También puedes ejecutar `iniciar.ps1`.
La aplicación necesita conexión a Internet para consultar Supabase.
El archivo local `.env` ya apunta al proyecto nuevo y está excluido de Git.
En otra máquina copia `.env.example` a `.env` y configura las variables.

## Qué está implementado

- Entrada directa como invitado, sin registro ni login para viajeros; sesión anónima aislada en Supabase.
- Registro de destino/fechas y creación transaccional de cinco tareas iniciales.
- Consulta y búsqueda de guías/preguntas frecuentes; filtro por destino.
- Checklist con estado persistente y progreso.
- Creación y seguimiento de solicitudes de orientación.
- Bandeja de agentes: asignar, iniciar atención, responder, reasignar con motivo y cerrar.
- Historial inmutable y respuestas conservadas.
- Gestión editorial: crear, editar, publicar y retirar contenidos con fuente y vigencia.
- RLS, autorización del servidor, roles no modificables por viajeros y acceso bloqueado a cuentas desactivadas.
- Frontend responsive y controles accesibles, sin dependencias de ejecución en el navegador.

US01, US03, US04, US06, US07, US08, US09, US10, US11, US12.
Las tareas son generales y no representan requisitos migratorios personalizados.
La búsqueda y bandeja recuperan hasta 200 registros por consulta en este MVP; paginación pendiente para volúmenes mayores.

## Acceso sin login

El viajero entra directamente. Supabase crea una identidad anónima para aislar sus viajes y solicitudes.
Activa **Allow anonymous sign-ins** en Authentication / Sign In / Providers.
La sesión del invitado se conserva en este navegador. Al borrar sus datos o cambiar de dispositivo no puede recuperar el acceso a esos viajes.
No hay un usuario compartido entre todos los visitantes.

El enlace **Acceso del equipo** abre un acceso separado para agentes y editores.
Un administrador debe crear sus cuentas en Supabase Authentication / Users y asignar el rol en SQL:

```sql
update public.profiles set role = 'editor'
where id = (select id from auth.users where email = 'CORREO_DEL_AGENTE');
```

La sesión del equipo es independiente de la del invitado: al salir del equipo se recupera el espacio de invitado de ese navegador.
No compartas contraseñas en el chat. Las claves privilegiadas no se usan en el frontend ni en Flask.

## Supabase

Proyecto: `centro-viajero` · ref `gpgopptywzxomfkozxzh`.
Panel: https://supabase.com/dashboard/project/gpgopptywzxomfkozxzh

Las migraciones ya están aplicadas en ese proyecto; **no las vuelvas a ejecutar allí**.
Para una base vacía, aplica en orden:
1. `backend/migrations/sprint1_schema.sql`.
2. `backend/migrations/sprint1_active_accounts.sql`.
3. `backend/migrations/seed.sql`.

La API usa la clave publicable y el JWT individual. No necesita ni contiene una clave service_role.
Los datos iniciales contienen cuatro destinos y cinco guías generales con fuentes.
Las cuentas QA temporales no son usuarios para producción.

## Pruebas

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Las pruebas de integración se omiten sin `QA_ACCOUNTS_FILE`.
Para ejecutarlas se requieren cuatro cuentas desechables en orden: viajero, otro viajero, agente, editor.
El archivo JSON externo al repositorio contiene `id`, `email` y `password` de cada cuenta.
No uses cuentas reales: las pruebas crean viajes, tareas, contenidos y solicitudes.
Configura `QA_ACCOUNTS_FILE` a su ruta absoluta y ejecuta pytest.
Ver `docs/verificacion.md` para resultados y limitaciones.

## Desplegar en Vercel

1. Conecta el repositorio GitHub a tu cuenta Vercel y selecciona su raíz.
2. Vercel debe detectar Flask y `app.py`. Python 3.13; dependencias en `requirements.txt`.
3. Configura `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `APP_URL` con la URL definitiva.
4. El comando `python build.py` copia recursos del frontend a `public/src` para el CDN.
5. En Supabase Authentication / URL Configuration agrega la URL de Vercel al Site URL y Redirect URLs.
6. Despliega y verifica acceso, confirmación de correo, checklist y atención con cuentas reales.

`vercel.json` está preparado; todavía no se ha publicado ni vinculado un proyecto Vercel.
No se ha hecho commit ni push: los cambios están en tu carpeta local.

## Estructura

- `app.py`: entrada Flask local/Vercel.
- `backend/src/mi_api/routes`: endpoints API.
- `backend/src/mi_api/schemas`: validación.
- `backend/src/mi_api/services`: autenticación y autorización.
- `backend/src/mi_api/database`: adaptador HTTP a Supabase.
- `backend/migrations`: esquema y datos iniciales.
- `backend/tests`: pruebas de validación, recorridos y acceso directo RLS.
- `frontend/src`: aplicación modular, estilos, utilidades y recursos.
- `docs`: planificación y verificación.

## Sprint 2

El asistente con LangChain, edición de viajes, recomendaciones, alertas y envío a atención humana están descritos en [docs/sprint-2.md](docs/sprint-2.md). Instala las dependencias de `requirements.lock` antes de iniciar esta versión.
