import {esc,icon} from './utils/format.js';

const photos={
 Madrid:{file:'madrid.jpg',alt:'Edificio Metrópolis y Gran Vía de Madrid',caption:'Arquitectura, cultura y paseos por la ciudad.'},
 Cartagena:{file:'cartagena.jpg',alt:'Calle de fachadas coloridas y balcones en Cartagena',caption:'Calles llenas de color frente al Caribe.'},
 'Medellín':{file:'medellin.jpg',alt:'Vista de Medellín entre montañas',caption:'Una ciudad para descubrir entre montañas.'},
 Lima:{file:'lima.jpg',alt:'Costa de Lima junto al océano Pacífico',caption:'La ciudad y el Pacífico, en un mismo viaje.'}
};
export const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
export function photo(destination,cls='',priority=false){
 const p=photos[destination.city];
 return p?'<img class="'+cls+'" src="/src/assets/destinations/'+p.file+'" alt="'+esc(p.alt)+'" '+(priority?'fetchpriority="high"':'loading="lazy"')+' width="1000" height="700">':'<div class="destination-placeholder '+cls+'">'+icon('pin')+'</div>';
}
export function destinationResults(destinations,query=''){
 const terms=normalize(query).split(/\s+/).filter(Boolean);
 const list=destinations.filter(d=>terms.every(t=>normalize(d.city+' '+d.country).includes(t)));
 const title=query?'Destinos para “'+esc(query)+'”':'Un lugar para tu próximo viaje';
 return '<div class="explore-heading"><div><h2>'+title+'</h2><p>'+(query?'Elige una ciudad para consultar sus guías.':'Elige un destino y empieza a preparar cada detalle.')+'</p></div><span class="result-count" role="status">'+list.length+' '+(list.length===1?'destino disponible':'destinos disponibles')+'</span></div>'+(list.length?'<div class="destination-grid '+(!query?'featured-grid':'')+'">'+list.map((d,i)=>'<a class="destination-card" href="#/destination/'+d.id+'">'+photo(d,'',i<2)+'<div class="destination-card-copy"><span>'+icon('pin')+esc(d.country)+'</span><h3>'+esc(d.city)+'</h3><p>'+esc(photos[d.city]?.caption||d.description)+'</p><div class="destination-card-link">Explorar destino '+icon('arrow')+'</div></div></a>').join('')+'</div>':'<section class="empty"><h3>Aún no tenemos ese destino</h3><p>Prueba con otro país o ciudad. También puedes consultar al equipo sobre tu viaje.</p><button class="secondary" data-action="clear-destinations">Ver todos los destinos</button> <a class="text-link" href="#/ticket-new">Pedir orientación '+icon('arrow')+'</a></section>');
}
export function explorer(destinations,query=''){
 const countries=[...new Set(destinations.map(d=>d.country))];
 return '<section class="explore-hero"><div class="explore-hero-inner"><h1>¿A dónde quieres ir?</h1><p>Descubre tu destino. Resuelve tus dudas. Viaja con todo listo.</p><form id="destination-search" role="search"><label for="destination-query">Busca un destino o cuéntanos qué quieres hacer</label><div class="destination-search-box">'+icon('search')+'<input id="destination-query" name="q" type="search" value="'+esc(query)+'" placeholder="Por ejemplo: naturaleza en Perú o museos en Madrid" autocomplete="off" maxlength="300" minlength="2" required><button class="primary" type="submit">Buscar actividades '+icon('arrow')+'</button></div></form><div class="country-shortcuts"><span>Explora por país</span>'+countries.map(c=>'<button type="button" data-action="country-search" data-country="'+esc(c)+'">'+esc(c)+'</button>').join('')+'</div></div></section><section class="explore-content" aria-label="Destinos"><div id="destination-results" aria-live="polite">'+destinationResults(destinations)+'</div><div class="preparation-strip"><div><h2>¿Ya sabes a dónde vas?</h2><p>Guarda tu viaje y lleva tus pendientes en un solo lugar.</p></div><a class="secondary" href="#/trip-new">Preparar mi viaje '+icon('arrow')+'</a></div></section>';
}
export function destinationPage(destination,articles,articleRows){
 const available=[...new Set(articles.map(a=>a.category))];
 return '<a class="back" href="#/home">← Volver a explorar destinos</a><section class="destination-intro"><div><p class="destination-country">'+icon('pin')+esc(destination.country)+'</p><h1>'+esc(destination.city)+': tu viaje empieza aquí.</h1><p>'+esc(destination.description)+'</p><a class="primary" href="#/trip-new/'+destination.id+'">Preparar mi viaje '+icon('arrow')+'</a></div>'+photo(destination,'destination-cover',true)+'</section><section class="destination-guides"><div class="explore-heading"><div><h2>Antes de viajar a '+esc(destination.city)+'</h2><p>Documentos, equipaje y preparativos: encuentra por dónde empezar.</p></div></div><div class="topic-filters" role="group" aria-label="Filtrar guías por tema"><button data-action="destination-topic" data-topic="" aria-pressed="true">Todos los temas</button>'+available.map(c=>'<button data-action="destination-topic" data-topic="'+esc(c)+'" aria-pressed="false">'+esc(c)+'</button>').join('')+'</div><p class="hint">Las guías generales también aplican a otros destinos. Verifica los requisitos de entrada según tu nacionalidad y las fechas de viaje.</p><div id="destination-articles">'+articleRows(articles)+'</div></section><div class="preparation-strip"><div><h2>Una pregunta puede cambiar tu viaje.</h2><p>Si no encuentras lo que necesitas, nuestro equipo puede orientarte.</p></div><a class="secondary" href="#/ticket-new">Hacer una pregunta '+icon('arrow')+'</a></div>';
}
