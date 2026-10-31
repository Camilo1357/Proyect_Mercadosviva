export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function date(value) { return value?new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value.length===10?value+'T12:00:00':value)):'Sin fecha'; }
export const states={NUEVA:'Nueva',ASIGNADA:'Asignada',EN_ATENCION:'En atención',RESUELTA:'Resuelta',CERRADA:'Cerrada'};
export const stateTag=s=>'<span class="status state-'+esc(s)+'">'+esc(states[s]||s)+'</span>';
export const categories=['Documentos','Equipaje','Moneda','Transporte','Seguridad','Preparación'];
export const icon=name=>{
const paths={home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',book:'<path d="M12 5v16M3 4h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z"/>',case:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12h18M12 10v5"/>',chat:'<path d="M21 11a9 9 0 0 1-9 9H3l1.5-5A9 9 0 1 1 21 11Z"/><path d="M8 10h8M8 14h5"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',plus:'<path d="M12 5v14M5 12h14"/>',exit:'<path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4"/>',edit:'<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z"/>',check:'<path d="m5 12 4 4L19 6"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'};
return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.arrow)+'</svg>';
};
