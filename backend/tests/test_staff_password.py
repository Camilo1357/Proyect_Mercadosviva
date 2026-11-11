import pytest
from backend.src.mi_api import create_app
from backend.src.mi_api.database.client import APIError
from backend.src.mi_api.services import auth
from backend.src.mi_api.routes import api as routes


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(auth, 'remote', lambda *args: {'id': 'staff', 'email': 'test@example.org'})
    monkeypatch.setattr(auth, 'one', lambda *args: {'id': 'staff', 'role': 'agent', 'active': True})
    return create_app({'TESTING': True}).test_client()


def payload():
    return {'current_password': 'old-test-only', 'password': 'new-test-only-123', 'confirmation': 'new-test-only-123'}


def test_password_change_requires_session_and_staff(client, monkeypatch):
    assert client.post('/api/auth/password', json=payload()).status_code == 401
    monkeypatch.setattr(auth, 'one', lambda *args: {'role': 'traveler', 'active': True})
    assert client.post('/api/auth/password', json=payload(), headers={'Authorization': 'Bearer test-token'}).status_code == 403


def test_password_change_verifies_current_password(client, monkeypatch):
    calls = []
    def remote(method, path, token=None, payload=None):
        calls.append((method, path, token, payload))
        if method == 'POST':
            return {'user': {'id': 'staff'}, 'access_token': 'fresh-token'}
        return {'id': 'staff'}
    monkeypatch.setattr(routes, 'remote', remote)
    response = client.post('/api/auth/password', json=payload(), headers={'Authorization': 'Bearer test-token'})
    assert response.status_code == 200
    assert calls[0][3]['email'] == 'test@example.org'
    assert calls[1] == ('PUT', '/auth/v1/user', 'fresh-token', {'password': 'new-test-only-123'})
    assert 'new-test' not in response.get_data(as_text=True)


def test_wrong_current_password_never_updates(client, monkeypatch):
    def rejected(method, *args, **kwargs):
        assert method == 'POST'
        raise APIError('Contraseña incorrecta.', 401)
    monkeypatch.setattr(routes, 'remote', rejected)
    response = client.post('/api/auth/password', json=payload(), headers={'Authorization': 'Bearer test-token'})
    assert response.status_code == 401


def test_mismatch_rejected_before_provider(client, monkeypatch):
    monkeypatch.setattr(routes, 'remote', lambda *args, **kwargs: pytest.fail('No provider call expected'))
    data = payload()
    data['confirmation'] = 'different'
    assert client.post('/api/auth/password', json=data, headers={'Authorization': 'Bearer test-token'}).status_code == 400
