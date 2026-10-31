import {api} from './services/api.js';
import {esc} from './utils/format.js';

const pending=new Map();
function search(city,country){
 const key=JSON.stringify([city,country]);
 if(!pending.has(key)){
  if(pending.size>=100)pending.delete(pending.keys().next().value);
  pending.set(key,api('/tourism/photos',{method:'POST',body:{city,country}}).then(r=>r.photos||[]).catch(()=>{pending.delete(key);return [];}));
 }
 return pending.get(key);
}

async function fallback(card){
 if(!card||card.dataset.photoAttempted)return;
 card.dataset.photoAttempted='true';
 const box=card.querySelector('.activity-image');
 const photos=await search(card.dataset.city,card.dataset.country);
 for(const photo of photos){
  if(!card.isConnected)return;
  const img=new Image();img.referrerPolicy='no-referrer';img.alt=photo.label+' — '+photo.title;
  img.width=640;img.height=400;
  const loaded=await new Promise(resolve=>{
   const timer=setTimeout(()=>resolve(false),8000);
   img.onload=()=>{clearTimeout(timer);resolve(true);};
   img.onerror=()=>{clearTimeout(timer);resolve(false);};
   img.src=photo.url;
  });
  if(!loaded)continue;
  if(!card.isConnected)return;
  box.querySelector('img')?.remove();box.prepend(img);
  const credit=document.createElement('div');credit.className='photo-credit';
  credit.innerHTML='<span>'+esc(photo.label)+'</span><a href="'+esc(photo.source_url)+'" target="_blank" rel="noopener noreferrer">Foto: '+esc(photo.author)+' · Wikimedia Commons</a><a href="'+esc(photo.license_url)+'" target="_blank" rel="noopener noreferrer">'+esc(photo.license)+' · imagen recortada</a>';
  box.after(credit);return;
 }
}

export function hydratePhotos(){
 document.querySelectorAll('.activity-card').forEach(card=>{
  const img=card.querySelector('.activity-image img');
  if(!img||(img.complete&&!img.naturalWidth))fallback(card);
 });
}
document.addEventListener('error',event=>{
 if(event.target.matches?.('.activity-image img')){event.target.hidden=true;fallback(event.target.closest('.activity-card'));}
},true);
