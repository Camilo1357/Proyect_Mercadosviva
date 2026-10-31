from datetime import date
from uuid import UUID
from urllib.parse import urlparse
from ..database.client import APIError

def text(data, field, minimum=1, maximum=5000):
    value = data.get(field)
    if not isinstance(value, str) or not minimum <= len(value.strip()) <= maximum:
        raise APIError(f"Revisa el campo {field}: debe tener entre {minimum} y {maximum} caracteres.")
    return value.strip()

def uuid(value):
    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        raise APIError("El identificador no es válido.")

def trip(data):
    try:
        start, end = date.fromisoformat(data.get("start_date", "")), date.fromisoformat(data.get("end_date", ""))
    except (ValueError, TypeError):
        raise APIError("Ingresa fechas válidas.")
    if start < date.today() or end < start:
        raise APIError("La salida no puede estar en el pasado y el regreso debe ser posterior o igual.")
    return {"p_destination": uuid(data.get("destination_id")), "p_start": str(start), "p_end": str(end)}

def article(data):
    result = {key: text(data, key, low, high) for key, low, high in [
        ("title", 3, 160), ("body", 10, 20000), ("source_url", 8, 2048),
        ("category", 1, 40), ("kind", 1, 10)]}
    if result["category"] not in ["Documentos","Equipaje","Moneda","Transporte","Seguridad","Preparación"] or result["kind"] not in ["guide","faq"]:
        raise APIError("Selecciona una categoría y tipo válidos.")
    parsed = urlparse(result["source_url"])
    if parsed.scheme != "https" or not parsed.netloc or parsed.username:
        raise APIError("La fuente debe ser una dirección HTTPS válida.")
    if type(data.get("published")) is not bool:
        raise APIError("Indica si el contenido está publicado.")
    result["published"] = data["published"]
    result["destination_id"] = uuid(data["destination_id"]) if data.get("destination_id") else None
    try:
        result["valid_until"] = str(date.fromisoformat(data["valid_until"])) if data.get("valid_until") else None
    except (ValueError, TypeError):
        raise APIError("La fecha de vigencia no es válida.")
    return result
