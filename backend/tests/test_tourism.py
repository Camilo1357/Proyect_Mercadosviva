import json
import pytest
import requests
from backend.src.mi_api import create_app
from backend.src.mi_api.database.client import APIError
from backend.src.mi_api.services import tourism
from backend.src.mi_api.services import auth


@pytest.fixture
def app():
    return create_app({'TESTING': True, 'EXA_API_KEY': 'test-exa', 'OPENAI_API_KEY': 'test-openai'})


def output(data):
    return {'status': 'completed', 'output': [{'type':'message','content':[{'type':'output_text','text':json.dumps(data)}]}]}


def fake_providers(monkeypatch, invalid=False):
    calls=[]
    def post(url, headers, payload, timeout=18):
        calls.append((url,payload))
        if url.endswith('/search'):
            return {'results':[{'title':'Turismo en Quito', 'url':'https://turismo.example.org/quito',
                                'text':'En Quito, Ecuador, puedes visitar el Museo de la Ciudad y conocer la historia local. Reserva tiempo para recorrer sus salas.',
                                'image':'http://localhost/private'}]}
        if len(calls)==1:
            return output({'tourism':True,'needs_clarification':False,'message':'','destination':'Ecuador','search_query':'Actividades culturales en Ecuador ciudad turismo'})
        return output({'activities':[{'title':'Visitar el Museo de la Ciudad', 'city':'Quito','country':'Ecuador',
                                      'description':'Conoce la historia local en sus salas.', 'category':'Cultura',
                                      'source_index':99 if invalid else 0,
                                      'evidence':'En Quito, Ecuador, puedes visitar el Museo de la Ciudad'}]})
    monkeypatch.setattr(tourism,'provider_post',post)
    return calls


def test_grounded_pipeline_and_cache(app,monkeypatch):
    calls=fake_providers(monkeypatch)
    with app.app_context():
        result=tourism.search('Ecuador','guest1')
        assert result['activities'][0]['city']=='Quito'
        assert result['activities'][0]['source_url']=='https://turismo.example.org/quito'
        assert result['activities'][0]['image_url']==''
        assert tourism.search('ECUADOR','guest2')['cached'] is True
    assert len(calls)==3
    assert calls[0][1]['store'] is False
    assert calls[0][1]['text']['format']['strict'] is True
    assert calls[1][1]['numResults']==8


def test_unverifiable_citations_are_not_returned(app,monkeypatch):
    fake_providers(monkeypatch,invalid=True)
    with app.app_context():
        result=tourism.search('Ecuador','guest1')
        assert result['status']=='empty' and not result['activities']


def test_ambiguous_query_does_not_spend_exa_call(app,monkeypatch):
    def clarify(*args,**kwargs):
        return {'tourism':True,'needs_clarification':True,'message':'¿Georgia país o estado?','destination':'','search_query':''}
    monkeypatch.setattr(tourism,'structured',clarify)
    monkeypatch.setattr(tourism,'provider_post',lambda *a,**k: pytest.fail('No search before clarification'))
    with app.app_context():
        assert tourism.search('Georgia','guest1')['status']=='clarification'


def test_missing_keys_never_call_providers(app,monkeypatch):
    app.config['EXA_API_KEY']=''
    monkeypatch.setattr(tourism,'provider_post',lambda *a,**k: pytest.fail('No keys'))
    with app.app_context(),pytest.raises(APIError) as err:
        tourism.search('Perú','guest1')
    assert err.value.status==503


@pytest.mark.parametrize('url',['javascript:alert(1)','http://example.com','https://127.0.0.1/x','https://[::1]/x','https://localhost/x','https://a.local/x','https://user:secret@example.com','https://example.com:8080','https://2130706433'])
def test_unsafe_links_rejected(url):
    assert tourism.public_https(url)==''


def test_provider_timeout_is_safe(app,monkeypatch):
    def timeout(*args,**kwargs): raise requests.Timeout('secret key detail')
    monkeypatch.setattr(tourism.requests,'post',timeout)
    with app.app_context(),pytest.raises(APIError) as err:
        tourism.provider_post('https://api.exa.ai/search',{}, {})
    assert err.value.status==504 and 'secret' not in err.value.message


def test_rate_limit():
    state=tourism.SearchState()
    for n in range(5): state.begin('user',str(n))
    with pytest.raises(APIError) as err: state.begin('user','sixth')
    assert err.value.status==429


def test_route_requires_session_and_valid_query(app,monkeypatch):
    client=app.test_client()
    assert client.post('/api/tourism/search',json={'query':'Perú'}).status_code==401
    monkeypatch.setattr(auth,'remote',lambda *a,**k:{'id':'test-user'})
    monkeypatch.setattr(auth,'one',lambda *a,**k:{'active':True,'role':'traveler'})
    for query in ['', 'x', 'z'*301, {'injection':'bad'}]:
        assert client.post('/api/tourism/search',headers={'Authorization':'Bearer token-test'},json={'query':query}).status_code==400
    fake_providers(monkeypatch)
    response=client.post('/api/tourism/search',headers={'Authorization':'Bearer token-test'},json={'query':'Ecuador'})
    assert response.status_code==200 and response.json['activities'][0]['city']=='Quito'
