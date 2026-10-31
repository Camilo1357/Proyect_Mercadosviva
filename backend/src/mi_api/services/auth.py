from functools import wraps
from flask import request, g
from ..database.client import remote, one, APIError

def protected(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer ") or len(header) < 12:
            raise APIError("Inicia sesión para continuar.", 401)
        g.token = header[7:]
        g.user = remote("GET", "/auth/v1/user", g.token)
        g.profile = one("profiles", g.user["id"], g.token)
        if not g.profile["active"]:
            raise APIError("Esta cuenta está desactivada.", 403)
        return function(*args, **kwargs)
    return wrapped

def staff(editor=False):
    allowed = ("editor",) if editor else ("agent", "editor")
    if g.profile["role"] not in allowed:
        raise APIError("No tienes acceso a esta sección.", 403)
