import requests
from flask import current_app

class APIError(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status

def remote(method, path, token=None, payload=None, params=None):
    url = current_app.config["SUPABASE_URL"]
    key = current_app.config["SUPABASE_PUBLISHABLE_KEY"]
    if not url or not key:
        raise APIError("Configura Supabase en el archivo .env para continuar.", 503)
    headers = {"apikey": key, "Content-Type": "application/json", "Prefer": "return=representation"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        r = requests.request(method, url.rstrip("/") + path, headers=headers, json=payload, params=params, timeout=20)
    except requests.RequestException:
        raise APIError("No pudimos conectar con el servicio. Intenta nuevamente.", 503)
    if not r.ok:
        try:
            data = r.json()
        except ValueError:
            data = {}
        if r.status_code == 429:
            raise APIError("Demasiados intentos. Espera un momento antes de volver a intentar.", 429)
        if path.startswith("/auth/"):
            if data.get("error_code") == "anonymous_provider_disabled":
                raise APIError("El acceso de invitados aún no está activado. Activa Anonymous Sign-Ins en Supabase para continuar.", 503)
            message = "Correo o contraseña incorrectos, o correo pendiente de confirmación."
            if "/signup" in path:
                message = "No se pudo completar el registro. Revisa el correo y usa una contraseña de al menos 8 caracteres."
            raise APIError(message, 401 if r.status_code in (400, 401, 403) else 502)
        code = data.get("code", "")
        if code == "42501":
            raise APIError("No tienes permiso para realizar esta acción.", 403)
        if code in ("P0001", "23514"):
            raise APIError(data.get("message", "Los datos no cumplen las reglas del sistema.") if code == "P0001" else "Revisa los datos: no cumplen las reglas del sistema.", 400)
        current_app.logger.warning("Supabase request failed: status=%s code=%s", r.status_code, code)
        raise APIError("No se pudo guardar o consultar la información. Intenta de nuevo.", 502)
    return r.json() if r.content else None

def rows(table, token, **params):
    return remote("GET", "/rest/v1/" + table, token, params=params)

def one(table, item_id, token):
    records = rows(table, token, id="eq." + item_id, limit="1")
    if not records:
        raise APIError("No se encontró el recurso o no tienes acceso.", 404)
    return records[0]
