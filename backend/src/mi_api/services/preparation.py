"""Current editorial recommendations and preparation notices, scoped by JWT."""
from datetime import date, datetime, timedelta, timezone
from ..database.client import one, rows


def today():
    return datetime.now(timezone(timedelta(hours=-5))).date()


def context(token, trip_id=None):
    trip = one("trips", trip_id, token) if trip_id else None
    tasks = rows("tasks", token, trip_id="eq." + trip_id, order="sort_order.asc") if trip else []
    articles = rows(
        "articles", token, published="eq.true", order="updated_at.desc", limit="200",
        **{"or": "(valid_until.is.null,valid_until.gte." + today().isoformat() + ")"},
    )
    articles = [article for article in articles if article["destination_id"] is None or
                (trip and article["destination_id"] == trip["destination_id"])]
    if trip:
        trip["destination"] = one("destinations", trip["destination_id"], token)
    return trip, tasks, articles


def overview(token, trip_id):
    trip, tasks, articles = context(token, trip_id)
    pending_categories = {task["category"] for task in tasks if not task["completed"]}
    articles.sort(key=lambda article: (article["category"] in pending_categories,
                                      article["destination_id"] == trip["destination_id"]), reverse=True)
    recommendations = [{**article, "reason": (
        "Relacionado con un pendiente de tu viaje" if article["category"] in pending_categories
        else "Guía de tu destino" if article["destination_id"] else "Preparación general"
    )} for article in articles[:6]]
    notices = []
    current = today()
    if date.fromisoformat(trip["end_date"]) >= current:
        for task in tasks:
            days = (date.fromisoformat(task["due_date"]) - current).days
            if not task["completed"] and days <= 7:
                notices.append({"id": task["id"], "title": task["title"], "due_date": task["due_date"],
                                "status": "overdue" if days < 0 else "today" if days == 0 else "upcoming"})
        departure_days = (date.fromisoformat(trip["start_date"]) - current).days
        if 0 <= departure_days <= 7:
            notices.append({"id": trip_id, "title": "Tu viaje comienza hoy" if departure_days == 0 else
                            f"Tu viaje comienza en {departure_days} días", "due_date": trip["start_date"],
                            "status": "departure"})
    notices.sort(key=lambda item: item["due_date"])
    return {"recommendations": recommendations, "alerts": notices, "today": current.isoformat()}
