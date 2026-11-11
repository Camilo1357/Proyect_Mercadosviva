from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g, current_app
from ..database.client import remote, rows, one, APIError
from ..schemas import validation as v
from ..services.auth import protected, staff
from ..services.tourism import search as tourism_search
from ..services.photos import city_photos
from ..services.assistant import ask, history_input
from ..services.preparation import overview
import requests

api = Blueprint("api", __name__)

def body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise APIError("Envía un objeto JSON válido.")
    return data

@api.get("/health")
def health():
    return {"status": "ok", "service": "centro-viajero", "database_configured": bool(current_app.config["SUPABASE_URL"] and current_app.config["SUPABASE_PUBLISHABLE_KEY"])}

@api.post("/auth/login")
def login():
    data=body()
    session = remote("POST", "/auth/v1/token?grant_type=password", payload={"email":v.text(data,"email",3,254),"password":v.text(data,"password",1,256)})
    profile = one("profiles", session["user"]["id"], session["access_token"])
    if not profile["active"] or profile["role"] not in ("agent", "editor"):
        raise APIError("Esta cuenta no tiene acceso al equipo. Solicita su habilitación al administrador.", 403)
    return session

@api.post("/auth/guest")
def guest():
    # Supabase creates an isolated authenticated identity, with no email/password.
    return remote("POST", "/auth/v1/signup", payload={"data": {"name": "Viajero invitado"}})

@api.post("/auth/signup")
def signup():
    data=body()
    payload={"email":v.text(data,"email",3,254),"password":v.text(data,"password",8,256),"data":{"name":v.text(data,"name",2,120)}}
    remote("POST", "/auth/v1/signup", payload=payload, params={"redirect_to":current_app.config["APP_URL"]})
    return {"message":"Revisa tu correo para confirmar la cuenta. Luego podrás iniciar sesión."}, 201

@api.post("/auth/refresh")
def refresh():
    return remote("POST", "/auth/v1/token?grant_type=refresh_token", payload={"refresh_token":v.text(body(),"refresh_token",10,4096)})

@api.post("/auth/logout")
@protected
def logout():
    remote("POST", "/auth/v1/logout", g.token)
    return {"ok":True}

@api.post("/auth/password")
@protected
def change_password():
    staff()
    data = body()
    current_password = data.get("current_password")
    password = data.get("password")
    if not isinstance(current_password, str) or not 1 <= len(current_password) <= 256:
        raise APIError("Escribe tu contraseña actual.")
    if not isinstance(password, str) or not 12 <= len(password) <= 256:
        raise APIError("La nueva contraseña debe tener entre 12 y 256 caracteres.")
    if password != data.get("confirmation"):
        raise APIError("Las contraseñas nuevas no coinciden.")
    if password == current_password:
        raise APIError("Elige una contraseña diferente de la actual.")
    verified = remote("POST", "/auth/v1/token?grant_type=password", payload={
        "email": g.user["email"], "password": current_password
    })
    if verified.get("user", {}).get("id") != g.user["id"]:
        raise APIError("No pudimos verificar tu cuenta.", 403)
    try:
        remote("PUT", "/auth/v1/user", verified["access_token"], {"password": password})
    except APIError:
        raise APIError("No pudimos cambiar la contraseña. Revisa que cumpla los requisitos y vuelve a intentarlo.", 400)
    return {"message": "Contraseña actualizada. Inicia sesión con tu nueva contraseña."}

@api.get("/me")
@protected
def me():
    return {**g.profile,"email":g.user.get("email"),"is_anonymous":g.user.get("is_anonymous",False)}

@api.get("/destinations")
@protected
def destinations():
    records = rows("destinations", g.token, active="eq.true", order="country.asc,city.asc")
    if request.args.get("scope") != "preparation":
        records = [item for item in records if item["city"] != item["country"]]
    return jsonify(records)

@api.post("/tourism/search")
@protected
def search_tourism():
    query = v.text(body(), "query", 2, 300)
    return jsonify(tourism_search(query, g.user["id"]))

@api.post("/tourism/photos")
@protected
def tourism_photos():
    data = body()
    city, country = v.text(data, "city", 2, 90), v.text(data, "country", 2, 90)
    current_app.extensions["photo_limits"].begin(g.user["id"], city + country)
    try:
        return jsonify(photos=city_photos(city, country))
    except (requests.RequestException, ValueError, TypeError, AttributeError):
        return jsonify(photos=[])

@api.route("/trips",methods=["GET","POST"])
@protected
def trips():
    if request.method=="GET":
        return jsonify(rows("trips",g.token,select="*,destination:destinations(*)",order="start_date.asc"))
    result=remote("POST","/rest/v1/rpc/create_trip",g.token,v.trip(body()))
    return jsonify(result),201

@api.get("/trips/<trip_id>/tasks")
@protected
def tasks(trip_id):
    one("trips",v.uuid(trip_id),g.token)
    return jsonify(rows("tasks",g.token,trip_id="eq."+trip_id,order="sort_order.asc"))

@api.patch("/trips/<trip_id>")
@protected
def edit_trip(trip_id):
    trip_id = v.uuid(trip_id)
    one("trips", trip_id, g.token)
    payload = {"p_id": trip_id, **v.trip(body())}
    return jsonify(remote("POST", "/rest/v1/rpc/edit_trip", g.token, payload))

@api.get("/trips/<trip_id>/overview")
@protected
def trip_overview(trip_id):
    return jsonify(overview(g.token, v.uuid(trip_id)))

@api.post("/assistant/messages")
@protected
def assistant_message():
    return jsonify(ask(body(), g.token, g.user["id"]))

@api.post("/assistant/escalate")
@protected
def assistant_escalate():
    data = body()
    question = v.text(data, "message", 5, 1200)
    history = history_input(data)
    transcript = "\n\n".join(("Viajero" if entry["role"] == "user" else "Asistente") +
                              ": " + entry["content"] for entry in history)
    description = "Pregunta del viajero:\n" + question
    if transcript:
        description += "\n\nContexto del chat aportado por el viajero:\n" + transcript[-3500:]
    trip_id = v.uuid(data["trip_id"]) if data.get("trip_id") else None
    if trip_id:
        one("trips", trip_id, g.token)
    payload = {"p_request": v.uuid(data.get("request_id")), "p_trip": trip_id,
               "p_subject": question[:160], "p_description": description}
    return jsonify(remote("POST", "/rest/v1/rpc/escalate_chat", g.token, payload)), 201

@api.patch("/tasks/<task_id>")
@protected
def task(task_id):
    one("tasks",v.uuid(task_id),g.token)
    data=body()
    if type(data.get("completed")) is not bool:
        raise APIError("Indica el estado de la tarea.")
    return jsonify(remote("PATCH","/rest/v1/tasks",g.token,{"completed":data["completed"]},{"id":"eq."+task_id}))

@api.get("/articles")
@protected
def articles():
    params={"order":"updated_at.desc","limit":"200"}
    if request.args.get("manage")=="1":
        staff(editor=True)
    else:
        params["published"]="eq.true"
        params["or"]="(valid_until.is.null,valid_until.gte."+datetime.now(timezone.utc).date().isoformat()+")"
    records=rows("articles",g.token,**params)
    query=request.args.get("q","").strip().casefold()
    destination=request.args.get("destination")
    if destination:
        v.uuid(destination)
        records=[a for a in records if a["destination_id"] in (destination,None)]
    if query:
        records=[a for a in records if query in (a["title"]+" "+a["body"]).casefold()]
    return jsonify(records)

@api.get("/articles/<article_id>")
@protected
def article(article_id):
    return one("articles",v.uuid(article_id),g.token)

@api.post("/articles")
@protected
def create_article():
    staff(editor=True)
    return jsonify(remote("POST","/rest/v1/articles",g.token,v.article(body()))),201

@api.patch("/articles/<article_id>")
@protected
def update_article(article_id):
    staff(editor=True)
    one("articles",v.uuid(article_id),g.token)
    data=v.article(body())
    data["updated_at"]=datetime.now(timezone.utc).isoformat()
    return jsonify(remote("PATCH","/rest/v1/articles",g.token,data,{"id":"eq."+article_id}))

@api.route("/tickets",methods=["GET","POST"])
@protected
def tickets():
    if request.method=="GET":
        params={"order":"created_at.desc","limit":"200"}
        if request.args.get("scope")=="all":
            staff()
        else:
            params["user_id"]="eq."+g.user["id"]
        return jsonify(rows("tickets",g.token,**params))
    data=body()
    payload={"subject":v.text(data,"subject",3,160),"description":v.text(data,"description",5,5000)}
    if data.get("trip_id"):
        payload["trip_id"]=v.uuid(data["trip_id"])
        one("trips",payload["trip_id"],g.token)
    return jsonify(remote("POST","/rest/v1/tickets",g.token,payload)),201

@api.get("/tickets/<ticket_id>")
@protected
def ticket(ticket_id):
    record=one("tickets",v.uuid(ticket_id),g.token)
    record["responses"]=rows("responses",g.token,ticket_id="eq."+ticket_id,order="created_at.asc")
    record["events"]=rows("ticket_events",g.token,ticket_id="eq."+ticket_id,order="created_at.asc")
    return record

@api.post("/tickets/<ticket_id>/actions")
@protected
def ticket_action(ticket_id):
    staff()
    data=body()
    action=v.text(data,"action",1,20)
    if action not in ("assign","start","respond","close"):
        raise APIError("Acción desconocida.")
    payload={"p_id":v.uuid(ticket_id),"p_action":action}
    if action=="assign":
        payload["p_agent"]=v.uuid(data.get("agent_id"))
        payload["p_text"]=data.get("reason","")
        if not isinstance(payload["p_text"],str) or len(payload["p_text"])>1000:
            raise APIError("El motivo es demasiado largo.")
    if action=="respond":
        payload["p_text"]=v.text(data,"text",1,10000)
    return remote("POST","/rest/v1/rpc/ticket_action",g.token,payload)

@api.get("/agents")
@protected
def agents():
    staff()
    return jsonify(rows("profiles",g.token,role="in.(agent,editor)",active="eq.true",order="name.asc"))
