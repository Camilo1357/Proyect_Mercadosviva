"""Opt-in integration test against a disposable Supabase project.
Requires QA_ACCOUNTS_FILE with four temporary users: traveler, traveler, agent, editor.
Do not use production accounts. Cleanup is intentionally explicit after browser QA.
"""
import json,os
from datetime import date,timedelta
import pytest
from backend.src.mi_api import create_app

pytestmark=pytest.mark.skipif(not os.getenv("QA_ACCOUNTS_FILE"),reason="Temporary integration accounts not configured")

def test_full_sprint1_flow():
    app=create_app({"TESTING":True})
    client=app.test_client()
    accounts=json.load(open(os.environ["QA_ACCOUNTS_FILE"],encoding="utf-8"))
    tokens=[]
    for account in accounts:
        r=client.post("/api/auth/login",json={"email":account["email"],"password":account["password"]})
        assert r.status_code==200,r.json
        tokens.append(r.json["access_token"])
    headers=[{"Authorization":"Bearer "+t} for t in tokens]
    h,other,agent,editor=headers
    def request(method,path,actor=h,data=None,expected=200):
        r=client.open("/api"+path,method=method,headers=actor,json=data)
        assert r.status_code==expected,(path,r.status_code,r.json)
        return r.json
    destinations=request("GET","/destinations")
    assert destinations
    start=date.today()+timedelta(days=35)
    t=request("POST","/trips",data={"destination_id":destinations[0]["id"],"start_date":str(start),"end_date":str(start+timedelta(days=5))},expected=201)
    tasks=request("GET","/trips/"+t["id"]+"/tasks")
    assert len(tasks)==5
    request("GET","/trips/"+t["id"]+"/tasks",other,expected=404)
    request("PATCH","/tasks/"+tasks[0]["id"],other,{"completed":True},404)
    request("PATCH","/tasks/"+tasks[0]["id"],data={"completed":True})
    assert request("GET","/trips/"+t["id"]+"/tasks")[0]["completed"]
    assert request("GET","/articles?q=equipaje")
    request("GET","/articles?manage=1",h,expected=403)
    request("GET","/tickets?scope=all",h,expected=403)
    a=request("POST","/articles",editor,{"title":"QA · Guía de prueba","body":"Contenido temporal para comprobar edición y publicación.","category":"Preparación","kind":"guide","source_url":"https://www.colombia.travel/","published":False},201)[0]
    request("GET","/articles/"+a["id"],h,expected=404)
    a["published"]=True
    request("PATCH","/articles/"+a["id"],editor,a)
    request("GET","/articles/"+a["id"],h)
    ticket=request("POST","/tickets",data={"subject":"QA · Preparar mi llegada","description":"¿Cómo organizo los datos para el transporte de llegada?","trip_id":t["id"]},expected=201)[0]
    tid=ticket["id"]
    request("GET","/tickets/"+tid,other,expected=404)
    request("POST","/tickets/"+tid+"/actions",h,{"action":"close"},403)
    request("POST","/tickets/"+tid+"/actions",agent,{"action":"assign","agent_id":accounts[2]["id"]})
    request("POST","/tickets/"+tid+"/actions",agent,{"action":"close"},400)
    request("POST","/tickets/"+tid+"/actions",editor,{"action":"start"},403)
    request("POST","/tickets/"+tid+"/actions",agent,{"action":"start"})
    request("POST","/tickets/"+tid+"/actions",agent,{"action":"respond","text":"   "},400)
    request("POST","/tickets/"+tid+"/actions",agent,{"action":"respond","text":"Guarda la dirección y confirma el punto de encuentro con tu proveedor."})
    resolved=request("GET","/tickets/"+tid,h)
    assert resolved["state"]=="RESUELTA" and len(resolved["responses"])==1
    request("POST","/tickets/"+tid+"/actions",editor,{"action":"assign","agent_id":accounts[3]["id"],"reason":"Revisión de un segundo responsable."})
    request("POST","/tickets/"+tid+"/actions",editor,{"action":"start"})
    request("POST","/tickets/"+tid+"/actions",editor,{"action":"respond","text":"Hemos revisado la orientación y conservamos la respuesta anterior."})
    request("POST","/tickets/"+tid+"/actions",editor,{"action":"close"})
    closed=request("GET","/tickets/"+tid,h)
    assert closed["state"]=="CERRADA"
    assert len(closed["responses"])==2 and len(closed["events"])>=8
    request("POST","/tickets/"+tid+"/actions",editor,{"action":"assign","agent_id":accounts[2]["id"]},400)
