import {esc, date} from './utils/format.js';

export function preparationOverview(data) {
  const labels = {overdue: 'Fecha pasada · por revisar', today: 'Para hoy', upcoming: 'Próximos 7 días', departure: 'Salida próxima'};
  return `<section class="preparation-notices" aria-labelledby="notices-title"><h2 id="notices-title">Fechas que conviene tener presentes</h2>
    <p class="muted">Se actualizan con tus fechas y tareas pendientes. Fechas calculadas en horario de Colombia.</p>
    ${data.alerts.length ? `<ul class="notice-list">${data.alerts.map(alert => `<li>
      <span><strong>${esc(alert.title)}</strong><small>${labels[alert.status]}</small></span>
      <time datetime="${alert.due_date}">${date(alert.due_date)}</time></li>`).join('')}</ul>` :
      '<p>No tienes alertas de preparación para los próximos siete días.</p>'}</section>
    <section class="preparation-recommendations" aria-labelledby="recommendations-title"><h2 id="recommendations-title">Lecturas para tu viaje</h2>
    ${data.recommendations.length ? `<div class="recommendation-list">${data.recommendations.map(article =>
      `<a href="#/article/${article.id}"><h3>${esc(article.title)}</h3><small>${esc(article.reason)}</small>
      <p>${esc(article.body.slice(0, 140))}${article.body.length > 140 ? '…' : ''}</p></a>`).join('')}</div>` :
      '<p>Aún no hay recomendaciones publicadas para este viaje. Puedes consultar al asistente o pedir orientación.</p>'}
    <a class="text-link" href="#/assistant">Hablar con turIA</a></section>`;
}

export function tripDestinationField(destinations, selected = '') {
  const countries = destinations.filter(d => d.city === d.country).sort((a,b) => a.country.localeCompare(b.country, 'es'));
  const cities = destinations.filter(d => d.city !== d.country).sort((a,b) => a.city.localeCompare(b.city, 'es'));
  const options = (items, countryOnly) => items.map(d => `<option value="${esc(d.id)}" ${d.id === selected ? 'selected' : ''}>${esc(countryOnly ? d.country : d.city + ', ' + d.country)}</option>`).join('');
  return `<label>Buscar país o destino<input type="search" data-trip-destination-search placeholder="Por ejemplo: Estados Unidos o Japón" autocomplete="off" aria-controls="trip-destination"></label>
    <label>País o destino<select id="trip-destination" name="destination_id" required>
    <option value="">Selecciona tu destino</option>
    <optgroup label="Países y territorios">${options(countries, true)}</optgroup>
    <optgroup label="Ciudades disponibles">${options(cities, false)}</optgroup></select></label>
    <p class="hint">Puedes preparar tu viaje a cualquier país o territorio de la lista.</p>`;
}

const destinationOptions = new WeakMap();
const searchKey = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
document.addEventListener('input', event => {
  if (!event.target.matches('[data-trip-destination-search]')) return;
  const select = event.target.form.querySelector('[name="destination_id"]');
  if (!destinationOptions.has(select)) destinationOptions.set(select, [...select.options].filter(o => o.value).map(o => ({value:o.value, label:o.textContent})));
  const selected = select.value;
  const matches = destinationOptions.get(select).filter(o => searchKey(o.label).includes(searchKey(event.target.value)));
  select.replaceChildren(new Option(matches.length ? 'Selecciona tu destino' : 'No encontramos ese destino', ''));
  for (const option of matches) select.add(new Option(option.label, option.value));
  select.value = matches.some(o => o.value === selected) ? selected : '';
});

export function editTripForm(trip, destinations) {
  return `<header class="page-head"><div><h1>Actualizar mi viaje</h1><p>Ajusta el destino y las fechas de tu preparación.</p></div></header>
    <form id="trip-edit-form" data-id="${trip.id}" class="panel form-panel">
    ${tripDestinationField(destinations, trip.destination_id)}
    <div class="form-grid"><label>Fecha de salida<input name="start_date" type="date" value="${trip.start_date}" required></label>
    <label>Fecha de regreso<input name="end_date" type="date" value="${trip.end_date}" required></label></div>
    <p class="hint">Al cambiar las fechas, actualizaremos los vencimientos conservando tu avance. Si cambias el destino, las tareas volverán a pendiente para revisar los preparativos del nuevo lugar.</p>
    <p class="form-error" role="alert" hidden></p><div class="form-actions"><a class="secondary" href="#/preparation">Cancelar</a>
    <button class="primary">Guardar cambios</button></div></form>`;
}
