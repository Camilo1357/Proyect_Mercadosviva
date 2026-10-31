const KEY='chambiray.session';
const GUEST_KEY='chambiray.guest';
const read=(storage,key)=>{try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}};
let session=read(sessionStorage,KEY)||read(localStorage,GUEST_KEY);
export function saveSession(value) {
  if(value){
    session=value;
    if(value.user?.is_anonymous) localStorage.setItem(GUEST_KEY,JSON.stringify(value));
    else sessionStorage.setItem(KEY,JSON.stringify(value));
  }else{
    if(session?.user?.is_anonymous)localStorage.removeItem(GUEST_KEY);
    else sessionStorage.removeItem(KEY);
    session=read(sessionStorage,KEY)||read(localStorage,GUEST_KEY);
  }
}
export function hasSession() { return Boolean(session?.access_token); }
let renewing;
async function refresh() {
  if(!session?.refresh_token) return false;
  if(!renewing) renewing=(async()=>{
    const r=await fetch('/api/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
    if(!r.ok)return false;
    saveSession(await r.json());return true;
  })().finally(()=>renewing=null);
  return renewing;
}
export async function api(path,options={},retried=false) {
  const headers={'Content-Type':'application/json'};
  if(session?.access_token) headers.Authorization='Bearer '+session.access_token;
  let r;
  try { r=await fetch('/api'+path,{...options,headers,body:options.body?JSON.stringify(options.body):undefined}); }
  catch { throw new Error('Sin conexión. Revisa tu red y vuelve a intentar.'); }
  if(r.status===401 && !path.startsWith('/auth/') && !retried && await refresh()) return api(path,options,true);
  const data=await r.json().catch(()=>({error:'El servidor no pudo procesar la solicitud.'}));
  if(!r.ok) { if(r.status===401&&!path.startsWith('/auth/')) saveSession(null); throw new Error(data.error||'No se pudo completar la acción.'); }
  return data;
}
export function acceptConfirmation() {
  const params=new URLSearchParams(location.hash.slice(1));
  if(params.get('access_token')) {
    saveSession({access_token:params.get('access_token'),refresh_token:params.get('refresh_token')});
    history.replaceState(null,'',location.pathname+'#/home');
  }
}
