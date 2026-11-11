import pytest
from backend.src.mi_api import create_app
from backend.src.mi_api.routes import api as routes

@pytest.mark.parametrize('role,active,allowed', [('agent',True,True),('editor',True,True),('traveler',True,False),('agent',False,False)])
def test_team_login_restricts_roles(monkeypatch, role, active, allowed):
    session={'user':{'id':'test-staff'},'access_token':'test-only-token','refresh_token':'test-only-refresh'}
    monkeypatch.setattr(routes,'remote',lambda *a,**kw:session)
    calls=[]
    def profile(table,user_id,token):
        calls.append((table,user_id,token))
        return {'role':role,'active':active}
    monkeypatch.setattr(routes,'one',profile)
    client=create_app({'TESTING':True}).test_client()
    response=client.post('/api/auth/login',json={'email':'test@example.org','password':'test-password'})
    assert calls==[('profiles','test-staff','test-only-token')]
    assert response.status_code==(200 if allowed else 403)
    if allowed:
        assert response.json==session
    else:
        assert 'access_token' not in response.json
        assert 'refresh_token' not in response.json
