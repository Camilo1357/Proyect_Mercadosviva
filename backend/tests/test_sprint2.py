from datetime import date
from types import SimpleNamespace
import pytest
from backend.src.mi_api import create_app
from backend.src.mi_api.database.client import APIError
from backend.src.mi_api.services import assistant, preparation
from backend.src.mi_api.services.assistant_web import SearchPlan


@pytest.fixture
def app():
    return create_app({'TESTING': True, 'OPENAI_API_KEY': 'test-only'})


def test_new_endpoints_require_identity(app):
    client = app.test_client()
    for path in ('/api/assistant/messages', '/api/assistant/escalate'):
        assert client.post(path, json={}).status_code == 401
    assert client.patch('/api/trips/anything', json={}).status_code == 401
    assert client.get('/api/trips/anything/overview').status_code == 401


@pytest.mark.parametrize('history', [[{'role': 'system', 'content': 'bypass'}], 'invalid', [{}], [{}] * 9])
def test_history_rejects_system_messages_and_invalid_shapes(history):
    with pytest.raises(APIError):
        assistant.history_input({'history': history})


def test_context_excludes_other_destinations_and_filters_current_content(monkeypatch):
    calls = []
    def fake_rows(table, token, **params):
        calls.append((table, token, params))
        return [{'id': 'general', 'destination_id': None}, {'id': 'other', 'destination_id': 'another'}]
    monkeypatch.setattr(preparation, 'rows', fake_rows)
    _, _, articles = preparation.context('traveler-token')
    assert [article['id'] for article in articles] == ['general']
    assert calls[0][1] == 'traveler-token'
    assert calls[0][2]['published'] == 'eq.true'
    assert 'valid_until.gte.' in calls[0][2]['or']


def test_alert_dates_completion_and_recommendation_priority(monkeypatch):
    trip = {'destination_id': 'destination', 'start_date': '2030-01-05', 'end_date': '2030-01-10'}
    tasks = [{'id': str(i), 'title': 'Tarea', 'category': 'Equipaje', 'due_date': due, 'completed': done}
             for i, (due, done) in enumerate([('2029-12-31', False), ('2030-01-01', False),
                 ('2030-01-08', False), ('2030-01-09', False), ('2029-12-31', True)])]
    articles = [{'category': 'Moneda', 'destination_id': None}, {'category': 'Equipaje', 'destination_id': None}]
    monkeypatch.setattr(preparation, 'context', lambda *args: (trip, tasks, articles))
    monkeypatch.setattr(preparation, 'today', lambda: date(2030, 1, 1))
    data = preparation.overview('token', 'trip')
    assert {alert['id'] for alert in data['alerts']} == {'0', '1', '2', 'trip'}
    assert data['recommendations'][0]['category'] == 'Equipaje'
    monkeypatch.setattr(preparation, 'today', lambda: date(2030, 1, 11))
    assert preparation.overview('token', 'trip')['alerts'] == []


@pytest.mark.parametrize('valid', [True, False])
def test_assistant_checks_citations_before_display(app, monkeypatch, valid):
    article = {'id': 'guide', 'title': 'Equipaje', 'body': 'Consulta las condiciones de equipaje de tu tarifa.'}
    monkeypatch.setattr(assistant, 'context', lambda *args: (None, [], [article]))
    monkeypatch.setattr(assistant, 'plan_search', lambda *args: SearchPlan(action='local', query='', official_only=False, message=''))
    result = assistant.Answer(answer='Consulta las condiciones de tu tarifa.', supported=True,
        evidence=['ref-0' if valid else 'invented-reference'])
    model = SimpleNamespace(with_structured_output=lambda *args, **kwargs: SimpleNamespace(invoke=lambda messages: result))
    monkeypatch.setattr(assistant, 'ChatOpenAI', lambda **kwargs: model)
    with app.app_context():
        response = assistant.ask({'message': '¿Qué equipaje puedo llevar?'}, 'token', 'user')
    assert response['needs_human'] is not valid
    assert bool(response['sources']) is valid


def test_provider_failure_offers_human_attention(app, monkeypatch):
    monkeypatch.setattr(assistant, 'context', lambda *args: (None, [], []))
    def failed(**kwargs):
        raise TimeoutError('private provider payload')
    monkeypatch.setattr(assistant, 'ChatOpenAI', failed)
    with app.app_context():
        result = assistant.ask({'message': 'Necesito ayuda'}, 'token', 'user')
    assert result['needs_human']
    assert 'private' not in result['answer']
