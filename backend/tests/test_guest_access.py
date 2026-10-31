from backend.src.mi_api import create_app
from backend.src.mi_api.database.client import APIError
from backend.src.mi_api.routes import api as routes

def test_guest_does_not_collect_credentials(monkeypatch):
    calls=[]
    def fake(method,path,token=None,payload=None,params=None):
        calls.append((method,path,payload))
        return {'access_token':'test-only','user':{'is_anonymous':True}}
    monkeypatch.setattr(routes,'remote',fake)
    r=create_app({'TESTING':True}).test_client().post('/api/auth/guest')
    assert r.status_code==200 and r.json['user']['is_anonymous']
    assert calls==[('POST','/auth/v1/signup',{'data':{'name':'Viajero invitado'}})]

def test_guest_configuration_failure_is_actionable(monkeypatch):
    def unavailable(*args,**kwargs):
        raise APIError('Activa Anonymous Sign-Ins en Supabase para continuar.',503)
    monkeypatch.setattr(routes,'remote',unavailable)
    r=create_app({'TESTING':True}).test_client().post('/api/auth/guest')
    assert r.status_code==503 and 'Anonymous' in r.json['error']

def test_guest_endpoint_does_not_make_business_endpoints_public():
    c=create_app({'TESTING':True}).test_client()
    for path in ['/api/trips','/api/tickets?scope=all','/api/agents','/api/articles?manage=1']:
        assert c.get(path).status_code==401
