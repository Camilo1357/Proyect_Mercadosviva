import {syncAssistant} from './assistant.js';
import {preparationOverview, editTripForm, tripDestinationField} from './preparation.js';
import {hydratePhotos} from './photos.js';
import {tourismResults,tourismError} from './tourism.js';
import {explorer,destinationResults,destinationPage} from './destinations.js';
import {api,saveSession,hasSession,acceptConfirmation} from './services/api.js';
import {esc,date,states,stateTag,categories,icon} from './utils/format.js';

const root=document.querySelector('#app');
const state={me:null,destinations:[],trips:[],selected:null,route:0,destinationQuery:'',destinationArticles:[],tourismResult:null,searchSerial:0,searchPending:false};
const staff=()=>['agent','editor'].includes(state.me?.role);
const editor=()=>state.me?.role==='editor';
const $=s=>document.querySelector(s);
const button=(text,action,cls='primary')=>'<button class="'+cls+'" data-action="'+action+'">'+text+'</button>';
const empty=(title,body,action='')=>'<section class="empty"><h2>'+title+'</h2><p>'+body+'</p>'+action+'</section>';
const loading=()=>'<div class="loading" role="status">Cargando información…</div>';
const opts=(selected='',all='Todos los destinos')=>'<option value="">'+all+'</option>'+state.destinations.map(d=>'<option value="'+d.id+'" '+(d.id===selected?'selected':'')+'>'+esc(d.city+', '+d.country)+'</option>').join('');
function notify(message){const n=$('#notice'); n.textContent=message;n.hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>n.hidden=true,5500);}
function go(path){if(location.hash==='#/'+path)render();else location.hash='/'+path;}
function head(title,subtitle,action=''){return '<header class="page-head"><div><h1>'+title+'</h1><p>'+subtitle+'</p></div>'+action+'</header>';}
function auth(){
 syncAssistant([],null,null,false);
 root.innerHTML='<main id="main" class="auth-main"><div class="auth-form"><h1>Acceso del equipo</h1><p>Solo para agentes que atienden solicitudes y administran contenidos.</p><form id="login"><label>Correo electrónico<input type="email" name="email" required autocomplete="email"></label><label>Contraseña<input type="password" name="password" required autocomplete="current-password"></label><p class="form-error" role="alert" hidden></p><button class="primary" type="submit">Entrar al equipo</button></form><p class="auth-switch"><a href="#/home">Volver a preparar mi viaje sin registro</a></p></div></main>';
}
function shell(){
 const nav=[['home','Explorar destinos'],['preparation','Mi preparación'],['trips','Mis viajes'],['library','Guías'],['tickets','Mis solicitudes']];
 if(staff())nav.push(['desk','Atención']);if(editor())nav.push(['manage','Contenidos']);
 root.innerHTML='<div class="travel-layout"><header class="travel-header"><a class="travel-brand" href="#/home" aria-label="Chambiray · Inicio"><img src="/src/assets/image.png" alt="Chambiray"><span>Centro del viajero</span></a><button class="icon-button mobile-menu" data-action="menu" aria-controls="sidebar" aria-expanded="false" aria-label="Abrir navegación">'+icon('menu')+'</button><nav id="sidebar" class="travel-nav" aria-label="Principal">'+nav.map(([path,label])=>'<a href="#/'+path+'" data-nav="'+path+'">'+label+'</a>').join('')+'</nav>'+(!state.me.is_anonymous?'<button class="icon-button" data-action="logout" aria-label="Cerrar sesión">'+icon('exit')+'</button>':'')+'</header><main id="main" tabindex="-1"></main><footer class="travel-footer"><div><strong>Que tu viaje empiece con tranquilidad.</strong><p>Guías, preparativos y un equipo para acompañarte.</p></div><a href="#/ticket-new">Pedir orientación '+icon('arrow')+'</a>'+(staff()?'<a href="#/password">Cambiar contraseña</a>':'<a href="#/staff-login">Acceso del equipo</a>')+'</footer></div>';
}
async function init(){
 acceptConfirmation();
 if(location.hash==='#/staff-login'){auth();return;}
 root.innerHTML='<main id="main" class="boot"><p role="status">Preparando tu espacio de viaje…</p></main>';
 try{
   if(!hasSession())saveSession(await api('/auth/guest',{method:'POST'}));
   state.me=await api('/me');
   [state.destinations,state.trips]=await Promise.all([api('/destinations'),api('/trips')]);
   state.selected=state.trips[0]?.id;
   shell();await render();
 }catch(e){root.innerHTML='<main id="main" class="boot">'+empty('No pudimos abrir tu espacio',esc(e.message),button('Volver a intentar','guest-retry'))+'</main>';}
}
function selectedTrip(){return state.trips.find(t=>t.id===state.selected)||state.trips[0];}
async function render(){
 if(!state.me||!$('#main')||!hasSession())return;
 const serial=++state.route;
 ++state.searchSerial;state.searchPending=false;
 const [rawPage,id]=location.hash.replace(/^#\//,'').split('/');
 const openTuria=rawPage==='assistant';
 const page=openTuria?'home':rawPage||'home';
 if(openTuria)history.replaceState(null,'','#/home');
 syncAssistant(state.trips,state.selected,state.me.id,page==='home');
 if(page==='staff-login'){auth();return;}
 $('#sidebar')?.classList.remove('open');
 $('.mobile-menu')?.setAttribute('aria-expanded','false');
 document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===(page==='destination'?'home':page);a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('#main').classList.toggle('explorer-main',page==='home');
 $('#main').innerHTML=loading();
 try{
  let html;
  if(page==='home'){html=explorer(state.destinations,state.destinationQuery);}
  else if(page==='preparation')html=await dashboard();
  else if(page==='destination'){
   const destination=state.destinations.find(d=>d.id===id);
   if(!destination)throw Error('Este destino no está disponible. Vuelve al inicio para elegir otro.');
   const articles=await api('/articles?destination='+encodeURIComponent(id));
   if(serial!==state.route)return;
   state.destinationArticles=articles;
   html=destinationPage(destination,articles,articleRows);
  }
  else if(page==='password'){if(!staff())throw Error('Entra con tu cuenta del equipo para cambiar la contraseña.');html=passwordForm();}
  else if(page==='trip-edit'){const trip=state.trips.find(item=>item.id===id);if(!trip)throw Error('No encontramos ese viaje.');html=editTripForm(trip,await api('/destinations?scope=preparation'));}
  else if(page==='trips')html=tripList();
  else if(page==='trip-new')html=tripForm(id,await api('/destinations?scope=preparation'));
  else if(page==='library')html=await library();
  else if(page==='article')html=await articleDetail(id);
  else if(page==='tickets')html=await ticketList(false);
  else if(page==='desk'){if(!staff())throw Error('No tienes acceso a la consola.');html=await ticketList(true);}
  else if(page==='ticket-new')html=ticketForm();
  else if(page==='ticket')html=await ticketDetail(id);
  else if(page==='manage'){if(!editor())throw Error('No tienes permiso editorial.');html=await manage();}
  else if(page==='article-edit'){if(!editor())throw Error('No tienes permiso editorial.');html=await articleForm(id);}
  else html=empty('Esta página no existe','Vuelve a tu preparación para continuar.','<a class="primary" href="#/home">Ir al inicio</a>');
  if(serial!==state.route)return;
  $('#main').innerHTML=html; if(page==='home'&&state.tourismResult)$('#destination-results').innerHTML=tourismResults(state.tourismResult); $('#main').focus({preventScroll:true});
  hydratePhotos();window.scrollTo({top:0});
  syncAssistant(state.trips,state.selected,state.me.id,page==='home',openTuria);
 }catch(e){if(serial===state.route)$('#main').innerHTML=empty('No pudimos cargar esta sección',esc(e.message),button('Volver a intentar','retry'));}
}
function passwordForm(){
 return head('Cambiar mi contraseña','Elige una contraseña personal para tu acceso al equipo.')+`
 <form id="password-form" class="panel form-panel">
 <label>Contraseña actual<input name="current_password" type="password" autocomplete="current-password" maxlength="256" required></label>
 <label>Nueva contraseña<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></label>
 <label>Repite la nueva contraseña<input name="confirmation" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></label>
 <p class="hint">Usa al menos 12 caracteres. Después de guardarla, entrarás de nuevo con tu contraseña personal.</p>
 <p class="form-error" role="alert" hidden></p>
 <div class="form-actions"><a class="secondary" href="#/desk">Volver a atención</a><button class="primary">Guardar contraseña</button></div></form>`;
}
function tripForm(destinationId='', destinations=[]){
 const today=new Date();today.setMinutes(today.getMinutes()-today.getTimezoneOffset());const min=today.toISOString().slice(0,10);
 return head('Un nuevo destino.','Cuéntanos cuándo viajas. Organizaremos una lista inicial de preparación.')+'<form id="trip-form" class="panel form-panel">'+tripDestinationField(destinations,destinationId)+'<div class="form-grid"><label>Fecha de salida<input type="date" name="start_date" min="'+min+'" required></label><label>Fecha de regreso<input type="date" name="end_date" min="'+min+'" required></label></div><p class="hint">La lista incluye preparativos generales. Los requisitos específicos deben verificarse con fuentes oficiales según tu situación.</p><p class="form-error" role="alert" hidden></p><div class="form-actions"><a class="secondary" href="#/trips">Cancelar</a><button class="primary">Guardar mi viaje '+icon('arrow')+'</button></div></form>';
}
function tripList(){
 return head('Mis viajes','Cada destino tiene su propia preparación.','<a class="primary" href="#/trip-new">'+icon('plus')+'Nuevo viaje</a>')+(state.trips.length?'<div class="trip-list">'+state.trips.map(t=>'<button class="trip-row" data-action="select-trip" data-id="'+t.id+'"><div class="destination-initial">'+esc(t.destination.city.slice(0,2).toUpperCase())+'</div><div><h2>'+esc(t.destination.city)+'</h2><p>'+esc(t.destination.country)+'</p></div><div class="trip-dates">'+date(t.start_date)+' — '+date(t.end_date)+'</div>'+icon('arrow')+'</button>').join('')+'</div>':empty('Tu próxima salida empieza aquí','Registra el destino y las fechas para organizar tus pendientes.','<a class="primary" href="#/trip-new">Registrar mi primer viaje</a>'));
}
async function dashboard(){
 const t=selectedTrip();
 if(!t)return head('Vamos a preparar tu próximo viaje.','Entra sin registro. Tus viajes se conservan en este navegador; si borras sus datos, perderás el acceso.')+'<div class="welcome-grid">'+empty('Todavía no has registrado un viaje','Cuando lo registres, aquí verás tu checklist y el avance de preparación.','<a class="primary" href="#/trip-new">'+icon('plus')+'Registrar mi primer viaje</a>')+'<aside class="help-panel"><h2>¿Primero quieres resolver una duda?</h2><p>Explora las guías o envía una pregunta a nuestro equipo de orientación.</p><a href="#/library">Consultar las guías '+icon('arrow')+'</a><a href="#/ticket-new">Pedir orientación '+icon('arrow')+'</a></aside></div>';
 const [tasks,articles,overview]=await Promise.all([api('/trips/'+t.id+'/tasks'),api('/articles?destination='+t.destination_id),api('/trips/'+t.id+'/overview')]);
 const done=tasks.filter(x=>x.completed).length;
 const overviewHtml='<div id="preparation-overview">'+preparationOverview(overview)+'</div>';
 return head('Tu viaje empieza aquí.','Un pendiente menos, un paso más cerca.','<a class="secondary" href="#/trip-edit/'+t.id+'">Editar viaje</a> <a class="secondary" href="#/trip-new">'+icon('plus')+'Nuevo viaje</a>')+'<section class="trip-banner"><div class="trip-place"><span class="location-label">'+icon('pin')+esc(t.destination.country)+'</span><h2>'+esc(t.destination.city)+'</h2><p>'+date(t.start_date)+' <span>—</span> '+date(t.end_date)+'</p></div><div class="trip-summary"><label for="trip-select">Estás preparando<select id="trip-select">'+state.trips.map(x=>'<option value="'+x.id+'" '+(x.id===t.id?'selected':'')+'>'+esc(x.destination.city)+' · '+date(x.start_date)+'</option>').join('')+'</select></label><p>'+esc(t.destination.description)+'</p></div></section><div class="dashboard-grid"><section class="preparation"><div class="section-title"><div><h2>Tu lista de preparación</h2><p>Avanza a tu ritmo. Tus cambios se guardan.</p></div><span class="count">'+done+' de '+tasks.length+'</span></div><progress max="'+Math.max(tasks.length,1)+'" value="'+done+'" aria-label="Preparación completada"></progress><div class="task-list">'+tasks.map(x=>'<label class="task-row '+(x.completed?'done':'')+'"><input type="checkbox" data-task="'+x.id+'" '+(x.completed?'checked':'')+'><span><strong>'+esc(x.title)+'</strong><small>'+esc(x.category)+' · Antes del '+date(x.due_date)+'</small></span></label>').join('')+'</div><p class="hint">Esta lista es un punto de partida. Consulta las condiciones de tu viaje antes de salir.</p></section><aside class="guide-aside"><h2>Antes de hacer la maleta</h2><p>Información que te ayuda a prepararte.</p><div class="article-mini">'+articles.slice(0,3).map(a=>'<a href="#/article/'+a.id+'"><span>'+esc(a.category)+'</span><h3>'+esc(a.title)+'</h3>'+icon('arrow')+'</a>').join('')+'</div><a class="text-link" href="#/library">Ver todas las guías '+icon('arrow')+'</a><div class="human-help"><h3>Hay una persona para ayudarte.</h3><p>Si algo no está claro, cuéntanos tu duda.</p><a href="#/ticket-new">Solicitar orientación '+icon('arrow')+'</a></div></aside></div>'+overviewHtml;
}
async function library(){
 const list=await api('/articles');
 return head('Viaja con información.','Guías y respuestas para preparar cada detalle.')+'<form id="search-form" class="filter-bar"><label class="search-field"><span class="sr-only">Buscar artículos y preguntas frecuentes</span>'+icon('search')+'<input name="q" placeholder="Busca documentos, equipaje, transporte…"></label><label><span class="sr-only">Destino</span><select name="destination">'+opts()+'</select></label><button class="primary">Buscar</button></form><div id="article-results">'+articleRows(list)+'</div>';
}
function articleRows(list){return list.length?'<div class="article-list">'+list.map(a=>'<a class="article-row" href="#/article/'+a.id+'"><span class="article-category">'+esc(a.category)+'</span><div><h2>'+esc(a.title)+'</h2><p>'+esc(a.body.slice(0,150))+(a.body.length>150?'…':'')+'</p><small>'+(a.kind==='faq'?'Pregunta frecuente':'Guía')+' · Actualizado '+date(a.updated_at)+'</small></div>'+icon('arrow')+'</a>').join('')+'</div>':empty('No encontramos coincidencias','Prueba con otra palabra o destino. También puedes solicitar orientación.','<a class="secondary" href="#/ticket-new">Hacer una pregunta</a>');}
async function articleDetail(id){
 const a=await api('/articles/'+encodeURIComponent(id));
 return '<a class="back" href="#/library">Volver a guías y respuestas</a>'+head(esc(a.title),esc(a.category)+' · Actualizado '+date(a.updated_at))+'<article class="reading"><div class="prose">'+a.body.split('\n').filter(Boolean).map(p=>'<p>'+esc(p)+'</p>').join('')+'</div><div class="source"><strong>Consulta la fuente</strong><a href="'+esc(a.source_url)+'" rel="noopener noreferrer" target="_blank">'+esc(new URL(a.source_url).hostname)+' '+icon('arrow')+'</a><p>'+(a.valid_until?'Vigencia editorial hasta '+date(a.valid_until):'Revisa siempre las condiciones actuales en la fuente oficial.')+'</p></div><div class="reading-help"><h2>¿Te quedó alguna duda?</h2><a class="secondary" href="#/ticket-new">Solicitar orientación</a></div></article>';
}
function ticketForm(){
 return head('Cuéntanos tu duda.','Un agente revisará tu solicitud. Podrás seguir la atención desde aquí.')+'<form class="panel form-panel" id="ticket-form"><label>¿Sobre qué necesitas orientación?<input name="subject" required minlength="3" maxlength="160" placeholder="Por ejemplo: cómo organizar mi llegada"></label><label>Viaje relacionado<select name="trip_id"><option value="">Consulta general</option>'+state.trips.map(t=>'<option value="'+t.id+'" '+(t.id===state.selected?'selected':'')+'>'+esc(t.destination.city)+' · '+date(t.start_date)+'</option>').join('')+'</select></label><label>Describe tu pregunta<textarea name="description" required minlength="5" maxlength="5000" rows="6" placeholder="Incluye el contexto necesario para que podamos orientarte."></textarea></label><p class="hint">No incluyas contraseñas, datos bancarios ni números completos de documentos.</p><p class="form-error" role="alert" hidden></p><div class="form-actions"><a class="secondary" href="#/tickets">Cancelar</a><button class="primary">Enviar solicitud '+icon('arrow')+'</button></div></form>';
}
async function ticketList(desk){
 const list=await api('/tickets'+(desk?'?scope=all':''));
 state.ticketList=list;
 return head(desk?'Cada pregunta merece atención.':'Mis solicitudes',desk?'Asigna un responsable y conserva el contexto de cada caso.':'Consulta el avance de tus preguntas y las respuestas del equipo.',desk?'':'<a class="primary" href="#/ticket-new">'+icon('plus')+'Nueva solicitud</a>')+'<div class="filter-bar"><label>Estado<select id="ticket-state"><option value="">Todos los estados</option>'+Object.entries(states).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label><span class="muted">'+list.length+' solicitudes</span></div><div id="ticket-results">'+ticketRows(list)+'</div>';
}
function ticketRows(list){
 return list.length?'<div class="table-wrap"><table><thead><tr><th>Solicitud</th><th>Estado</th><th>Creada</th><th><span class="sr-only">Abrir</span></th></tr></thead><tbody>'+list.map(t=>'<tr><td><a href="#/ticket/'+t.id+'"><strong>'+esc(t.subject)+'</strong><small>#'+t.id.slice(0,8).toUpperCase()+'</small></a></td><td>'+stateTag(t.state)+'</td><td>'+date(t.created_at)+'</td><td><a class="icon-button" aria-label="Abrir solicitud '+esc(t.subject)+'" href="#/ticket/'+t.id+'">'+icon('arrow')+'</a></td></tr>').join('')+'</tbody></table></div>':empty('No hay solicitudes en esta vista','Cuando se registre una solicitud, aparecerá aquí con su estado.');
}
async function ticketDetail(id){
 const t=await api('/tickets/'+encodeURIComponent(id));
 const agents=staff()?await api('/agents'):[];
 const owner=t.assigned_to===state.me.id;
 const agent=agents.find(a=>a.id===t.assigned_to);
 const actions=staff()&&t.state!=='CERRADA'?'<aside class="case-actions"><h2>Gestionar atención</h2><p>Responsable: <strong>'+esc(agent?.name||'Sin asignar')+'</strong></p><form id="assign-form" data-id="'+t.id+'"><label>Asignar a<select name="agent_id" required><option value="">Selecciona un agente</option>'+agents.filter(a=>a.id!==t.assigned_to).map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join('')+'</select></label>'+(t.assigned_to?'<label>Motivo de reasignación<textarea name="reason" minlength="5" maxlength="1000" required rows="3"></textarea></label>':'')+'<p class="form-error" role="alert" hidden></p><button class="secondary wide">Guardar responsable</button></form>'+(owner&&t.state==='ASIGNADA'?'<button class="primary wide" data-action="ticket-start" data-id="'+t.id+'">Iniciar atención</button>':'')+(owner&&t.state==='RESUELTA'?'<button class="primary wide" data-action="ticket-close" data-id="'+t.id+'">Cerrar solicitud</button><p class="hint">La respuesta y el historial se conservarán.</p>':'')+'</aside>':'';
 return '<a class="back" href="#/'+(staff()?'desk':'tickets')+'">Volver a solicitudes</a>'+head(esc(t.subject),'Solicitud #'+t.id.slice(0,8).toUpperCase()+' · '+date(t.created_at)+(t.origin==='CHATBOT'?' · Desde el asistente':''),stateTag(t.state))+'<div class="case-grid"><div><section class="case-description"><h2>La pregunta</h2><p class="preserve">'+esc(t.description)+'</p></section><section class="responses"><h2>Respuestas del equipo</h2>'+(t.responses.length?t.responses.map(r=>'<article class="response"><span>'+date(r.created_at)+'</span><p class="preserve">'+esc(r.body)+'</p></article>').join(''):'<p class="muted">Todavía no hay una respuesta. Puedes volver aquí para consultar el avance.</p>')+'</section>'+(staff()&&owner&&t.state==='EN_ATENCION'?'<form id="response-form" data-id="'+t.id+'" class="response-form"><label>Tu respuesta<textarea name="text" rows="6" required maxlength="10000" placeholder="Escribe una orientación clara y útil para el viajero."></textarea></label><p class="form-error" role="alert" hidden></p><button class="primary">Publicar respuesta</button></form>':'')+'<section class="history"><h2>Historial de atención</h2><ol>'+t.events.map(e=>'<li><strong>'+esc(states[e.action]||e.action)+'</strong><span>'+esc(e.detail)+'</span><small>'+date(e.created_at)+'</small></li>').join('')+'</ol></section></div>'+actions+'</div>';
}
async function manage(){
 const list=await api('/articles?manage=1');
 return head('Información que se mantiene al día.','Publica, actualiza o retira las guías de preparación.','<a class="primary" href="#/article-edit/new">'+icon('plus')+'Nuevo contenido</a>')+'<div class="table-wrap"><table><thead><tr><th>Contenido</th><th>Categoría</th><th>Publicación</th><th>Editar</th></tr></thead><tbody>'+list.map(a=>'<tr><td><strong>'+esc(a.title)+'</strong><small>Actualizado '+date(a.updated_at)+'</small></td><td>'+esc(a.category)+'</td><td><span class="status">'+(a.published?'Publicado':'Borrador')+'</span></td><td><a class="icon-button" aria-label="Editar '+esc(a.title)+'" href="#/article-edit/'+a.id+'">'+icon('edit')+'</a></td></tr>').join('')+'</tbody></table></div>';
}
async function articleForm(id){
 const a=id==='new'?{title:'',body:'',category:'Preparación',kind:'guide',published:false}:await api('/articles/'+id);
 return head(id==='new'?'Una nueva guía.':'Editar contenido.','La fuente y la vigencia ayudan a mantener una orientación confiable.')+'<form class="panel form-panel large-form" id="article-form" data-id="'+esc(id)+'"><label>Título<input name="title" value="'+esc(a.title)+'" required minlength="3" maxlength="160"></label><div class="form-grid"><label>Destino<select name="destination_id">'+opts(a.destination_id,'General · Todos los destinos')+'</select></label><label>Categoría<select name="category">'+categories.map(c=>'<option '+(c===a.category?'selected':'')+'>'+c+'</option>').join('')+'</select></label></div><label>Tipo<select name="kind"><option value="guide">Guía</option><option value="faq" '+(a.kind==='faq'?'selected':'')+'>Pregunta frecuente</option></select></label><label>Contenido<textarea name="body" rows="10" required minlength="10" maxlength="20000">'+esc(a.body)+'</textarea></label><label>Fuente oficial o de referencia<input type="url" name="source_url" value="'+esc(a.source_url)+'" placeholder="https://" required></label><label>Vigente hasta (opcional)<input type="date" name="valid_until" value="'+esc(a.valid_until)+'"></label><label class="checkbox-label"><input type="checkbox" name="published" '+(a.published?'checked':'')+'> Publicar para los viajeros</label><p class="form-error" role="alert" hidden></p><div class="form-actions"><a class="secondary" href="#/manage">Cancelar</a><button class="primary">Guardar contenido</button></div></form>';
}
document.addEventListener('submit',async e=>{
 const form=e.target;if(!(form instanceof HTMLFormElement)||form.id.startsWith('assistant-'))return;e.preventDefault();
 if(form.id==='destination-search'){await searchTourism();return;}
 const submit=form.querySelector('button[type="submit"],button:not([type])');const old=submit?.innerHTML;
 const error=form.querySelector('.form-error');if(error)error.hidden=true;
 if(submit){submit.disabled=true;submit.textContent=form.id==='login'?'Entrando…':'Guardando…';}
 const d=Object.fromEntries(new FormData(form));
 try{
  if(form.id==='login'){saveSession(await api('/auth/login',{method:'POST',body:d}));history.replaceState(null,'','#/desk');await init();}

  else if(form.id==='password-form'){await api('/auth/password',{method:'POST',body:d});saveSession(null);state.me=null;history.replaceState(null,'','#/staff-login');auth();notify('Contraseña actualizada. Entra con tu nueva contraseña.');}
  else if(form.id==='trip-form'){const t=await api('/trips',{method:'POST',body:d});state.trips=await api('/trips');state.selected=t.id;notify('Tu viaje y la checklist están guardados.');go('preparation');}
  else if(form.id==='trip-edit-form'){await api('/trips/'+form.dataset.id,{method:'PATCH',body:d});state.trips=await api('/trips');state.selected=form.dataset.id;notify('Viaje actualizado. Revisa las fechas y los pendientes.');go('preparation');}
  else if(form.id==='ticket-form'){const r=await api('/tickets',{method:'POST',body:d});notify('Solicitud enviada. Aquí podrás seguir la atención.');go('ticket/'+r[0].id);}
  else if(form.id==='search-form'){$('#article-results').innerHTML=articleRows(await api('/articles?'+new URLSearchParams(d))); }
  else if(form.id==='assign-form'){await api('/tickets/'+form.dataset.id+'/actions',{method:'POST',body:{action:'assign',agent_id:d.agent_id,reason:d.reason||''}});notify('Responsable actualizado.');await render();}
  else if(form.id==='response-form'){await api('/tickets/'+form.dataset.id+'/actions',{method:'POST',body:{action:'respond',text:d.text}});notify('Respuesta publicada para el viajero.');await render();}
  else if(form.id==='article-form'){d.published=form.elements.published.checked;await api('/articles'+(form.dataset.id==='new'?'':'/'+form.dataset.id),{method:form.dataset.id==='new'?'POST':'PATCH',body:d});notify('Contenido guardado.');go('manage');}
 }catch(err){if(error){error.textContent=err.message;error.hidden=false;}else notify(err.message);}
 finally{if(submit?.isConnected){submit.disabled=false;submit.innerHTML=old;}}
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return;
 const a=b.dataset.action;
 try{
 if(a==='guest-retry')await init();
 else if(a==='country-search'){if(state.searchPending)return;$('#destination-query').value=b.dataset.country;await searchTourism();}
 else if(a==='clear-destinations'){state.destinationQuery='';state.tourismResult=null;$('#destination-query').value='';updateDestinationResults();}
 else if(a==='retry-tourism'){await searchTourism();}
 else if(a==='refine-tourism'){$('#destination-query').focus();$('#destination-query').select();}
 else if(a==='destination-topic'){
  document.querySelectorAll('[data-action="destination-topic"]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  $('#destination-articles').innerHTML=articleRows(state.destinationArticles.filter(x=>!b.dataset.topic||x.category===b.dataset.topic));
 }
 else if(a==='retry')await render();
 else if(a==='menu'){const open=$('#sidebar').classList.toggle('open');b.setAttribute('aria-expanded',String(open));}
 else if(a==='logout'){try{await api('/auth/logout',{method:'POST'});}finally{saveSession(null);state.me=null;history.replaceState(null,'','#/home');await init();}}
 else if(a==='select-trip'){state.selected=b.dataset.id;go('preparation');}
 else if(a==='ticket-start'||a==='ticket-close'){b.disabled=true;await api('/tickets/'+b.dataset.id+'/actions',{method:'POST',body:{action:a==='ticket-start'?'start':'close'}});notify(a==='ticket-start'?'Atención iniciada.':'Solicitud cerrada.');await render();}
 }catch(err){b.disabled=false;notify(err.message);}
});
document.addEventListener('change',async e=>{
 const input=e.target;
 if(input.id==='trip-select'){state.selected=input.value;await render();}
 if(input.id==='ticket-state')$('#ticket-results').innerHTML=ticketRows(state.ticketList.filter(t=>!input.value||t.state===input.value));
 if(input.dataset.task){const checked=input.checked;input.disabled=true;try{await api('/tasks/'+input.dataset.task,{method:'PATCH',body:{completed:checked}});input.closest('.task-row').classList.toggle('done',checked);input.disabled=false;const boxes=[...document.querySelectorAll('[data-task]')];const done=boxes.filter(b=>b.checked).length;document.querySelector('.preparation progress').value=done;document.querySelector('.preparation .count').textContent=done+' de '+boxes.length;refreshOverview();notify(checked?'Tarea completada. Un paso más cerca.':'Tarea marcada como pendiente.');}catch(err){input.checked=!checked;input.disabled=false;notify(err.message);}}
});
function updateDestinationResults(){
 $('#destination-results').innerHTML=destinationResults(state.destinations,state.destinationQuery);
 document.querySelectorAll('[data-action="country-search"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.country===state.destinationQuery)));
}
async function searchTourism(){
 if(state.searchPending)return;
 const input=$('#destination-query');if(!input)return;
 const query=input.value.trim();
 if(query.length<2){input.setCustomValidity('Escribe al menos dos caracteres.');input.reportValidity();return;}
 input.setCustomValidity('');state.destinationQuery=query;state.tourismResult=null;
 const serial=++state.searchSerial;state.searchPending=true;
 const results=$('#destination-results');
 const controls=[...document.querySelectorAll('#destination-search button,[data-action="country-search"]')];
 controls.forEach(b=>b.disabled=true);
 results.setAttribute('aria-busy','true');
 results.innerHTML='<section class="tourism-loading" role="status"><span class="search-spinner" aria-hidden="true"></span><h2>Buscando ideas para tu viaje…</h2><p>Estamos interpretando tu búsqueda y consultando fuentes turísticas. Puede tardar unos segundos.</p></section>';
 try{
  const data=await api('/tourism/search',{method:'POST',body:{query}});
  if(serial!==state.searchSerial||!results.isConnected)return;
  state.tourismResult=data;results.innerHTML=tourismResults(data);hydratePhotos();
 }catch(error){if(serial===state.searchSerial&&results.isConnected)results.innerHTML=tourismError(error.message);}
 finally{
  if(serial===state.searchSerial){state.searchPending=false;controls.forEach(b=>b.disabled=false);results.removeAttribute('aria-busy');}
 }
}
document.addEventListener('input',e=>{if(e.target.id==='destination-query'){e.target.setCustomValidity('');state.destinationQuery=e.target.value;}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#sidebar')?.classList.contains('open')){$('#sidebar').classList.remove('open');$('.mobile-menu')?.setAttribute('aria-expanded','false');$('.mobile-menu')?.focus();}});
window.addEventListener('hashchange',()=>$('#sidebar')?render():init());
init();

let overviewSerial = 0;
async function refreshOverview(){
 const serial = ++overviewSerial;
 const trip=selectedTrip();
 const container=document.querySelector('#preparation-overview');
 if(!trip||!container)return;
 try{const data=await api('/trips/'+trip.id+'/overview');if(container.isConnected && serial===overviewSerial)container.innerHTML=preparationOverview(data);}
 catch(error){if(container.isConnected && serial===overviewSerial)container.innerHTML='<p role="alert">'+esc(error.message)+'</p>'; }
}
