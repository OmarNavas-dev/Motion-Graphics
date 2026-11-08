// Small configurable illustration resources. Compose original scenes from them;
// none of these establishes a universal theme or an imitation of a creator.
export function contactShadow(scene,{x,y,rx=80,ry=12,opacity=.35,layer='fg'}={}){
 if(![x,y,rx,ry,opacity].every(Number.isFinite)||rx<=0||ry<=0||opacity<0||opacity>1)throw Error('Sombra invalida.');
 scene.add(layer,`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#030915" opacity="${opacity}"/>`);
}
export function tiledRoom(scene,{tile=96,tone='#536b87',night=true,floorY=940}={}){
 if(!Number.isFinite(tile)||tile<20||!/^#[0-9a-f]{6}$/i.test(tone)||!Number.isFinite(floorY))throw Error('Habitacion invalida.');
 const p=scene.gid('tiles'),f=scene.gid('tile-noise'),g=scene.gid('room-light');
 scene.defs('tile-noise',`<filter id="${f}"><feTurbulence baseFrequency=".025" numOctaves="3" seed="12"/><feColorMatrix type="saturate" values="0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`);
 scene.defs('tiles',`<pattern id="${p}" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse"><rect width="${tile}" height="${tile}" fill="${tone}"/><rect x="3" y="3" width="${tile-6}" height="${tile-6}" fill="#c1d1df" opacity=".2" filter="url(#${f})"/><path d="M0 ${tile}V0H${tile}" fill="none" stroke="#142a40" stroke-width="5"/><path d="M5 ${tile-4}H${tile-4}V5" fill="none" stroke="#aec2d4" stroke-opacity=".3"/></pattern>`);
 scene.defs('room-light',`<radialGradient id="${g}" cx=".55" cy=".36" r=".85"><stop stop-color="${night?'#d7edff':'#ffffff'}" stop-opacity=".15"/><stop offset="1" stop-color="#020916" stop-opacity="${night?.85:.35}"/></radialGradient>`);
 scene.add('bg',`<rect x="-220" y="-220" width="${scene.W+440}" height="${scene.H+440}" fill="url(#${p})"/><rect y="${floorY}" width="${scene.W}" height="${scene.H-floorY}" fill="#192e43"/>${Array.from({length:9},(_,i)=>`<path d="M${scene.W/2+(i-4)*25} ${floorY}L${scene.W/2+(i-4)*180} ${scene.H}" stroke="#43576d" stroke-width="2"/>`).join('')}<rect x="-220" y="-220" width="${scene.W+440}" height="${scene.H+440}" fill="url(#${g})"/>`);
 scene.use('illustration');
}
export function bedroom(scene,{windowX=505,windowY=170}={}){
 if(![windowX,windowY].every(Number.isFinite))throw Error('Ventana invalida.');
 const g=scene.gid('wall');scene.defs('wall',`<linearGradient id="${g}" x2="0" y2="1"><stop stop-color="#101a3b"/><stop offset="1" stop-color="#070d21"/></linearGradient>`);
 scene.add('bg',`<rect x="-220" y="-220" width="${scene.W+440}" height="${scene.H+440}" fill="url(#${g})"/><rect y="980" width="${scene.W}" height="400" fill="#12142b"/><path d="M0 980H720" stroke="#3a3554" stroke-width="3"/><rect x="68" y="190" width="130" height="95" rx="4" fill="#252c48" stroke="#78684e" stroke-width="6"/><path d="M77 273L118 230L145 253L172 222L190 273Z" fill="#4b597a"/><g transform="translate(${windowX} ${windowY})"><rect width="145" height="310" fill="#17274c" stroke="#3c3557" stroke-width="8"/><circle cx="87" cy="69" r="27" fill="#e4ebfc"/><path d="M72 0V310M0 150H145" stroke="#3c3557" stroke-width="7"/><path d="M-25-15H8V320H-35ZM137-15H171V320H145Z" fill="#483559"/></g>`);
 scene.use('illustration');
}
export function bed(scene,{id='bed',x=360,y=765,w=320,h=440,blanket='#5e71c7',layer='fg'}={}){
 if(!/^[A-Za-z][\w-]*$/.test(id)||![x,y,w,h].every(Number.isFinite)||w<=0||h<=0||!/^#[0-9a-f]{6}$/i.test(blanket))throw Error('Cama invalida.');
 scene.add(layer,`<g class="${id}" transform="translate(${x} ${y})"><rect x="${-w*.56}" y="${-h*.63}" width="${w*1.12}" height="${h*.6}" rx="24" fill="#51405f"/><rect x="${-w*.52}" y="${-h*.35}" width="${w*1.04}" height="${h*.95}" rx="15" fill="#cedbea"/><ellipse cy="${-h*.28}" rx="${w*.45}" ry="${h*.12}" fill="#f3f5fd"/><path d="M${-w*.51} ${-h*.13}Q0 ${-h*.18} ${w*.51} ${-h*.13}L${w*.56} ${h*.57}H${-w*.56}Z" fill="${blanket}"/><path d="M${-w*.29} 0L${-w*.32} ${h*.51}M${w*.02} 0L${w*.04} ${h*.52}M${w*.3} 0L${w*.35} ${h*.5}" stroke="#243d88" stroke-opacity=".3" stroke-width="3"/></g>`);
 scene.use('illustration');
}
export function book(scene,{id='book',x=360,y=640,w=500,h=330}={}){
 if(!/^[A-Za-z][\w-]*$/.test(id)||![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)throw Error('Libro invalido.');
 const g=scene.gid(id+'-paper');scene.defs(id+'-paper',`<linearGradient id="${g}"><stop stop-color="#aa8650"/><stop offset=".18" stop-color="#e7cd8a"/><stop offset=".48" stop-color="#cfb57a"/><stop offset=".5" stop-color="#5b452b"/><stop offset=".54" stop-color="#b29157"/><stop offset=".8" stop-color="#e7cd8a"/><stop offset="1" stop-color="#a5814b"/></linearGradient>`);
 let lines='';for(let side=0;side<2;side++)for(let i=0;i<17;i++){const xx=-w*.43+side*w*.5,yy=-h*.38+i*h*.045;lines+=`<path d="M${xx} ${yy}h${w*(.31+((i*7)%5)*.012)}" stroke="#594d37" stroke-opacity=".44" stroke-width="${h*.008}"/>`;}
 scene.add('fg',`<g class="${id}" data-motion-actor="${id}" transform="translate(${x} ${y})"><path d="M${-w*.52} ${-h*.51}Q${-w*.24} ${-h*.57} 0 ${-h*.48}Q${w*.25} ${-h*.57} ${w*.52} ${-h*.51}V${h*.52}Q${w*.25} ${h*.45} 0 ${h*.54}Q${-w*.25} ${h*.45} ${-w*.52} ${h*.52}Z" fill="#584027"/><path d="M${-w*.5} ${-h*.48}Q${-w*.22} ${-h*.53} 0 ${-h*.45}Q${w*.23} ${-h*.53} ${w*.5} ${-h*.48}V${h*.48}Q${w*.25} ${h*.42} 0 ${h*.51}Q${-w*.25} ${h*.42} ${-w*.5} ${h*.48}Z" fill="url(#${g})"/>${lines}</g>`);scene.use('illustration');
}
