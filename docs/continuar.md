# Continuar el proyecto

Carpeta de trabajo: C:\Users\USUARIO\Downloads\Proyect_Mercadosviva

## Estado guardado

Sprint 1 implementado y probado con Flask, JavaScript y Supabase. Base creada y migraciones aplicadas.
Interfaz revisada en escritorio y móvil; documentación visual en DESIGN.md.
Las cuatro cuentas temporales y sus datos de prueba fueron eliminados. Quedan cuatro destinos y cinco guías generales.
No se han creado usuarios reales, ni publicado en Vercel, ni hecho commit/push.
El logo image.png ya estaba preparado en Git y se conservó.

## Arranque

En la terminal de VS Code, dentro de la carpeta del proyecto:

```powershell
.\.venv\Scripts\python.exe app.py
```

Abrir http://127.0.0.1:5000/. Se requiere Internet para Supabase.

## Próximo trabajo

1. Viajeros: entrada automática como invitado. Equipo: crear una cuenta de agente desde Supabase Auth.
2. Asignar rol editor a la cuenta del equipo. El viajero no necesita correo ni contraseña.
3. Conectar GitHub a Vercel, configurar variables y URL de retorno en Supabase.
4. Comprobar registro, acceso y recorrido completo en el despliegue.
5. Revisar disponibilidad de protección contra contraseñas filtradas en Supabase Auth.

El Sprint 2 queda pendiente: edición de viaje, recomendaciones, alertas y chatbot LangChain.
