from types import SimpleNamespace
import pytest
from backend.src.mi_api import create_app
from backend.src.mi_api.database.client import APIError
from backend.src.mi_api.services import assistant, assistant_web


@pytest.fixture
def app():
    return create_app({'TESTING': True, 'OPENAI_API_KEY': 'test', 'EXA_API_KEY': 'test'})


def plan(action='web', official=False, query='Museos en Madrid'):
    return assistant_web.SearchPlan(action=action, query=query, official_only=official, message='¿Cuál es la nacionalidad de tu pasaporte?')


def test_web_sources_filter_unsafe_duplicate_and_unofficial_urls(app, monkeypatch):
    text = 'Información de entrada para viajeros publicada por la autoridad competente. ' * 2
    urls = ['https://www.exteriores.gob.es/visados', 'https://www.exteriores.gob.es/visados',
            'https://www.exteriores.gob.es.evil.com/visa', 'https://blog.example.com/visa', 'http://localhost/secret']
    monkeypatch.setattr(assistant_web, 'provider_post', lambda *args, **kwargs: {'results': [
        {'url': url, 'title': 'Fuente', 'text': text} for url in urls]})
    with app.app_context():
        sources, status = assistant_web.web_sources(plan(official=True))
    assert status == 'searched'
    assert len(sources) == 1
    assert sources[0]['href'] == urls[0]
    assert sources[0]['kind'] == 'web'


@pytest.mark.parametrize('query', ['a@b.com', 'documento 123456789', 'https://example.org/private', 'sk-secret-token'])
def test_sensitive_search_query_not_sent(app, monkeypatch, query):
    monkeypatch.setattr(assistant_web, 'provider_post', lambda *args, **kwargs: pytest.fail('Must not send'))
    with app.app_context():
        assert assistant_web.web_sources(plan(query=query)) == ([], 'unavailable')


def test_provider_failure_is_explicit(app, monkeypatch):
    def unavailable(*args, **kwargs):
        raise APIError('quota', 503)
    monkeypatch.setattr(assistant_web, 'provider_post', unavailable)
    with app.app_context():
        assert assistant_web.web_sources(plan()) == ([], 'unavailable')


def setup_assistant(monkeypatch, selected_plan, answer=None):
    monkeypatch.setattr(assistant, 'context', lambda *args: (None, [], []))
    monkeypatch.setattr(assistant, 'plan_search', lambda *args: selected_plan)
    model = SimpleNamespace(with_structured_output=lambda *args, **kwargs: SimpleNamespace(invoke=lambda *args: answer))
    monkeypatch.setattr(assistant, 'ChatOpenAI', lambda **kwargs: model)


def test_clarification_does_not_search_or_invent_answer(app, monkeypatch):
    setup_assistant(monkeypatch, plan(action='clarify'))
    monkeypatch.setattr(assistant, 'web_sources', lambda *args: pytest.fail('No search before clarification'))
    with app.app_context():
        result = assistant.ask({'message': '¿Necesito visa para España?'}, 'token', 'user')
    assert 'nacionalidad' in result['answer']
    assert result['sources'] == []
    assert result['needs_human'] is False


def test_external_answer_retains_verified_url(app, monkeypatch):
    quote = 'El museo ofrece una colección dedicada a la historia de la ciudad.'
    answer = assistant.Answer(answer=quote, supported=True, evidence=['ref-0'])
    setup_assistant(monkeypatch, plan(), answer)
    monkeypatch.setattr(assistant, 'web_sources', lambda *args: ([{'id': 'web-0', 'title': 'Museo',
        'text': quote, 'href': 'https://museo.example.org', 'kind': 'web', 'checked_at': '2030-01-01'}], 'searched'))
    with app.app_context():
        result = assistant.ask({'message': '¿Qué hay en el museo?'}, 'token', 'user')
    assert result['sources'][0]['href'] == 'https://museo.example.org'
    assert result['sources'][0]['kind'] == 'web'
    assert result['web_status'] == 'searched'


def test_web_failure_does_not_fall_back_to_unsupported_specific_claim(app, monkeypatch):
    setup_assistant(monkeypatch, plan())
    monkeypatch.setattr(assistant, 'web_sources', lambda *args: ([], 'unavailable'))
    with app.app_context():
        result = assistant.ask({'message': 'Precio actual de entrada al museo'}, 'token', 'user')
    assert 'No pude consultar la web' in result['answer']
    assert result['needs_human']

def test_translated_answer_uses_selected_passage_without_literal_quote(app, monkeypatch):
    source_text = 'Visitor visas include tourism under category B-2.'
    answer = assistant.Answer(answer='La categoría B-2 corresponde al turismo.', supported=True,
                              evidence=['ref-0'])
    setup_assistant(monkeypatch, plan(), answer)
    monkeypatch.setattr(assistant, 'web_sources', lambda *a: ([{'id':'web-0','title':'Authority',
        'href':'https://travel.state.gov/visa','text':source_text,'kind':'web'}], 'searched'))
    with app.app_context():
        result = assistant.ask({'message':'Voy cinco días a Disney'}, 'token', 'translation-test')
    assert result['answer'] == answer.answer
    assert result['sources'][0]['href'] == 'https://travel.state.gov/visa'
    assert result['needs_human'] is False


def test_passages_preserve_source_mapping_and_text():
    sources = [{'id':'a','title':'First','text':'A' * 3000},
               {'id':'b','title':'Second','text':'English text.\n\nOtro párrafo.'}]
    passages, lookup = assistant.source_passages(sources)
    assert ''.join(p['text'] for p in passages if p['source_id'] == 'a') == 'A' * 3000
    assert len({p['id'] for p in passages}) == len(passages)
    assert all(lookup[p['id']]['id'] == p['source_id'] for p in passages)
    assert all(len(p['text']) <= 1400 for p in passages)
