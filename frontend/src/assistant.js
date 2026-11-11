import {api} from './services/api.js';
import {esc, date} from './utils/format.js';

let owner;
let tripId = '';
let messages = [];
let pending = false;
let error = '';
let question = '';
let requestId = '';
let ticketId = '';
let revision = 0;
let reviewing = false;

function resetConversation() {
  revision += 1;
  messages = [];
  pending = false;
  error = '';
  question = '';
  requestId = '';
  ticketId = '';
  reviewing = false;
  draft = '';
}

let opened = false;
let draft = '';
const chatIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-4 3 2-6a8 8 0 1 1 17-5Z"/><path d="M7 10h10M7 14h6"/></svg>';

export function syncAssistant(trips, selected, userId, visible, openNow = false) {
  let widget = document.querySelector('#turia-widget');
  if (owner !== userId) {
    owner = userId;
    tripId = selected || '';
    resetConversation();
    opened = false;
    widget?.remove();
    widget = null;
  }
  if (!visible || !userId) {
    if (widget) widget.hidden = true;
    return;
  }
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'turia-widget';
    widget.innerHTML = `
      <section id="turia-panel" role="dialog" aria-modal="false" aria-labelledby="turia-title" hidden>
        <header class="turia-header"><span class="turia-mark">${chatIcon}</span>
          <div><h2 id="turia-title">tur<span>IA</span></h2><p>Tu compañía antes de viajar</p></div>
          <button type="button" id="turia-close" aria-label="Minimizar turIA"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 12h12"/></svg></button>
        </header>
        <details class="turia-context"><summary>Personaliza con tu viaje</summary>
          <div class="assistant-toolbar"><label>Viaje de esta conversación<select id="assistant-trip"></select></label>
          <button type="button" class="secondary" id="assistant-reset">Nueva conversación</button></div>
        </details>
        <div id="assistant-body">${conversation()}</div>
        <p class="turia-footnote">Puedes pedir ayuda a una persona cuando lo necesites</p>
      </section>
      <button type="button" id="turia-launcher" aria-controls="turia-panel" aria-expanded="false">
        ${chatIcon}<span>Habla con <strong>turIA</strong></span><span id="turia-unread" hidden>Respuesta lista</span>
      </button>`;
    document.body.append(widget);
  }
  widget.hidden = false;
  const select = widget.querySelector('#assistant-trip');
  select.innerHTML = '<option value="">Consulta general</option>' + trips.map(trip =>
    `<option value="${trip.id}">${esc(trip.destination.city)} · ${date(trip.start_date)}</option>`).join('');
  if (tripId && !trips.some(trip => trip.id === tripId)) {
    tripId = '';
    resetConversation();
    refresh();
  }
  select.value = tripId;
  select.disabled = pending;
  widget.querySelector('#assistant-reset').disabled = pending;
  setOpen(openNow || opened, openNow);
}

function setOpen(value, focus = true) {
  opened = value;
  const panel = document.querySelector('#turia-panel');
  if (!panel) return;
  panel.hidden = !opened;
  document.querySelector('#turia-launcher').setAttribute('aria-expanded', String(opened));
  if (opened) {
    document.querySelector('#turia-unread').hidden = true;
    if (focus) document.querySelector('#turia-close').focus({preventScroll: true});
  } else if (focus) {
    document.querySelector('#turia-launcher').focus({preventScroll: true});
  }
}

function conversation() {
  const transcript = messages.map(message => `<article class="chat-message chat-${message.role}">
    <strong>${message.role === 'user' ? 'Tú' : 'turIA'}</strong>
    <p class="preserve">${esc(message.content)}</p>
    </article>`).join('');
  return `<div class="chat-log" role="log" aria-label="Conversación" aria-live="polite">
      ${transcript || `<div class="chat-welcome"><h3>Hola, soy turIA.</h3>
        <p>¿Preparamos tu próxima aventura? Busco en nuestras guías y en la web. Pregúntame sobre destinos, documentos o tus pendientes.</p>
        <div class="chat-suggestions"><button class="secondary" data-chat-question="¿Cómo preparo mi equipaje?"><span>Preparar mi equipaje</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></button>
        <button class="secondary" data-chat-question="¿Qué tareas tengo pendientes?"><span>Consultar mis pendientes</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></button><button class="secondary" data-chat-question="¿Qué documentos debo revisar antes de viajar?"><span>Revisar mis documentos</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></button></div></div>`}
      ${pending ? `<p role="status" class="chat-wait"><span class="turia-dots" aria-hidden="true"><i></i><i></i><i></i></span>${reviewing ? 'Enviando tu solicitud al equipo…' : 'Buscando información para tu viaje…'}</p>` : ''}</div>
    ${error ? `<p class="form-error" role="alert">${esc(error)}</p>` : ''}
    ${ticketId ? `<p class="chat-confirmation" role="status">Solicitud enviada al equipo. <a href="#/ticket/${ticketId}">Consultar estado y respuesta</a></p>` : ''}
    ${reviewing ? `<form id="assistant-handoff" class="chat-handoff"><h2>Enviar mi duda a una persona</h2>
      <label>Pregunta para el equipo<textarea name="message" required minlength="5" maxlength="1200" rows="3">${esc(question)}</textarea></label>
      <p>Se enviarán esta pregunta y los últimos mensajes de esta conversación${tripId ? ', asociados al viaje seleccionado' : ''}.</p>
      <p class="hint">Revisa que no hayas incluido contraseñas, datos bancarios ni números de documentos.</p>
      <div class="form-actions"><button type="button" class="secondary" id="assistant-cancel">Volver al chat</button>
      <button class="primary" ${pending ? 'disabled' : ''}>Enviar al equipo</button></div></form>` :
      `<form id="assistant-form" class="chat-composer">
      <div class="turia-input-row"><label for="assistant-question" class="sr-only">Tu pregunta</label>
      <textarea id="assistant-question" name="message" rows="1" minlength="2" maxlength="1200" required
        placeholder="Escribe tu mensaje…" ${pending ? 'disabled' : ''}>${esc(draft)}</textarea>
      <button class="primary turia-send" aria-label="${pending ? 'Consultando' : 'Enviar pregunta'}" title="Enviar pregunta" ${pending ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m21 3-7 18-4-7-7-4L21 3Z"/><path d="m10 14 11-11"/></svg>
      </button></div>
      ${question && !ticketId ? '<button type="button" class="secondary" id="assistant-human">Pedir ayuda a una persona</button>' : ''}</form>`}`;
}

function refresh() {
  const body = document.querySelector('#assistant-body');
  if (!body) return;
  body.innerHTML = conversation();
  body.classList.toggle('is-reviewing', reviewing);
  const log = body.querySelector('.chat-log');
  if (log) {
    const latest = log.querySelector('.chat-message:last-of-type');
    if (!pending && latest?.classList.contains('chat-assistant')) {
      log.scrollTop += latest.getBoundingClientRect().top - log.getBoundingClientRect().top - 12;
    } else log.scrollTop = log.scrollHeight;
  }
  resizeComposer();
  document.querySelector('#assistant-trip').disabled = pending;
  document.querySelector('#assistant-reset').disabled = pending;
}

function history() {
  return messages.slice(-8).map(({role, content}) => ({role, content: content.slice(0, 2000)}));
}

document.addEventListener('submit', async event => {
  const form = event.target;
  if (!['assistant-form', 'assistant-handoff'].includes(form.id)) return;
  event.preventDefault();
  if (pending) return;
  const message = new FormData(form).get('message').trim();
  const currentRevision = revision;
  const previousHistory = history();
  const handoff = form.id === 'assistant-handoff';
  let restoreComposer = form.contains(document.activeElement);
  const cancelFocusRestore = () => { restoreComposer = false; };
  question = message;
  draft = '';
  if (!handoff) {
    requestId = crypto.randomUUID();
    ticketId = '';
    messages.push({role: 'user', content: message});
  }
  pending = true;
  error = '';
  refresh();
  const pendingFocus = document.querySelector('#turia-close');
  if (opened && restoreComposer && pendingFocus) {
    pendingFocus.focus({preventScroll: true});
    pendingFocus.addEventListener('blur', cancelFocusRestore, {once: true});
  }
  try {
    if (handoff) {
      const result = await api('/assistant/escalate', {method: 'POST', body: {
        message, history: previousHistory, trip_id: tripId || null, request_id: requestId
      }});
      if (revision !== currentRevision) return;
      ticketId = result.id;
      reviewing = false;
    } else {
      const result = await api('/assistant/messages', {method: 'POST', body: {
        message, history: previousHistory, trip_id: tripId || null
      }});
      if (revision !== currentRevision) return;
      messages.push({role: 'assistant', content: result.answer, sources: result.sources});
    }
  } catch (failure) {
    if (revision === currentRevision) { error = failure.message; draft = message; }
  } finally {
    pendingFocus?.removeEventListener('blur', cancelFocusRestore);
    if (revision === currentRevision) {
      pending = false;
      refresh();
      if (!opened) document.querySelector('#turia-unread')?.removeAttribute('hidden');
      const widget = document.querySelector('#turia-widget');
      if (opened && widget && !widget.hidden && restoreComposer) {
        document.querySelector('#assistant-question')?.focus({preventScroll: true});
      }
    }
  }
});

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.id === 'turia-launcher') { setOpen(!opened); return; }
  if (button.id === 'turia-close') { setOpen(false); return; }
  if (pending) return;
  if (button.id === 'assistant-reset') {
    resetConversation();
    refresh();
    document.querySelector('#assistant-question')?.focus();
  }
  if (button.id === 'assistant-human') {
    reviewing = true;
    error = '';
    refresh();
    document.querySelector('#assistant-handoff textarea')?.focus();
  }
  if (button.id === 'assistant-cancel') {
    reviewing = false;
    refresh();
    document.querySelector('#assistant-question')?.focus();
  }
  if (button.dataset.chatQuestion) {
    const input = document.querySelector('#assistant-question');
    input.value = button.dataset.chatQuestion;
    draft = input.value;
    document.querySelector('#assistant-form').requestSubmit();
  }
});

document.addEventListener('change', event => {
  if (event.target.id === 'assistant-trip') {
    tripId = event.target.value;
    resetConversation();
    refresh();
  }
});

function resizeComposer() {
  const input = document.querySelector('#assistant-question');
  if (!input) return;
  input.style.height = '44px';
  input.style.height = Math.min(104, Math.max(44, input.scrollHeight)) + 'px';
}

document.addEventListener('input', event => {
  if (event.target.id === 'assistant-question') {
    draft = event.target.value;
    resizeComposer();
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && opened && document.querySelector('#turia-widget')?.contains(event.target)) {
    event.preventDefault();
    setOpen(false);
  }
  if (event.target.id === 'assistant-question' && event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!pending) document.querySelector('#assistant-form').requestSubmit();
  }
});
