from datetime import date,timedelta
import pytest
from backend.src.mi_api.schemas.validation import trip, article, uuid
from backend.src.mi_api.database.client import APIError
from backend.src.mi_api import create_app

ID="11111111-1111-4111-8111-111111111111"
def test_valid_trip():
    today=str(date.today())
    assert trip({"destination_id":ID,"start_date":today,"end_date":today})["p_destination"]==ID

@pytest.mark.parametrize("change",[
 {"start_date":"not-a-date"},{"start_date":str(date.today()-timedelta(days=1))},
 {"end_date":"2000-01-01"},{"destination_id":"invalid"},{"end_date":None}])
def test_invalid_trip(change):
    d={"destination_id":ID,"start_date":str(date.today()),"end_date":str(date.today())}
    d.update(change)
    with pytest.raises(APIError):trip(d)

@pytest.mark.parametrize("url",["javascript:alert(1)","http://example.com","https://","https://a:b@example.com"])
def test_unsafe_source(url):
    with pytest.raises(APIError):
        article(dict(title="Prueba",body="Un contenido de prueba.",category="Documentos",kind="guide",source_url=url,published=True))

def test_frontend_security_headers():
    client=create_app({"TESTING":True}).test_client()
    r=client.get("/")
    assert r.status_code==200
    assert "frame-ancestors 'none'" in r.headers["Content-Security-Policy"]
    assert client.get("/api/trips").status_code==401
    assert client.get("/src/../../.env").status_code==404

def test_invalid_json():
    client=create_app({"TESTING":True}).test_client()
    assert client.post("/api/auth/login",json=["not","object"]).status_code==400
