import json,os
import pytest,requests
from backend.src.mi_api import create_app

pytestmark=pytest.mark.skipif(not os.getenv('QA_ACCOUNTS_FILE'),reason='Temporary integration accounts not configured')

def test_direct_data_api_cannot_bypass_ownership_or_roles():
    app=create_app({'TESTING':True})
    accounts=json.load(open(os.environ['QA_ACCOUNTS_FILE'],encoding='utf-8'))
    client=app.test_client()
    tokens=[]
    for a in accounts[:2]:
        response=client.post('/api/auth/login',json={'email':a['email'],'password':a['password']})
        assert response.status_code==200
        tokens.append(response.json['access_token'])
    base=app.config['SUPABASE_URL']+'/rest/v1/'
    def headers(i):return {'apikey':app.config['SUPABASE_PUBLISHABLE_KEY'],'Authorization':'Bearer '+tokens[i],'Prefer':'return=representation'}
    own=requests.get(base+'trips',headers=headers(0),timeout=20).json()
    assert own
    r=requests.get(base+'trips',params={'id':'eq.'+own[0]['id']},headers=headers(1),timeout=20)
    assert r.status_code==200 and r.json()==[]
    r=requests.patch(base+'profiles',params={'id':'eq.'+accounts[0]['id']},json={'role':'editor'},headers=headers(0),timeout=20)
    assert r.status_code==403
    r=requests.get(base+'trips',headers={'apikey':app.config['SUPABASE_PUBLISHABLE_KEY']},timeout=20)
    assert r.status_code in (401,403)
    r=requests.post(base+'ticket_events',json={'ticket_id':own[0]['id'],'action':'Fake event'},headers=headers(0),timeout=20)
    assert r.status_code==403
