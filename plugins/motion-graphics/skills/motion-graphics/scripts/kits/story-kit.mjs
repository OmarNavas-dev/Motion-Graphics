// Componentes narrativos configurables. Son recursos de autoría: el JSON final
// sólo contiene el SVG y GSAP generados, sin dependencias del kit.
import {n, checkTime} from './scene-kit.mjs';

const escape = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const color = (v) => { if (!/^#[0-9a-f]{6}$/i.test(v)) throw Error('Color hexadecimal de seis dígitos requerido'); return v; };
const finite = (...values) => { if (!values.every(Number.isFinite)) throw Error('Coordenada o dimensión inválida'); };

/** Mar, horizonte, reflejo y ondas en capas, con transición de hora reproducible. */
export function ocean(scene,{horizon=580,day='#86c8e7',night='#101d42',sea='#12699b',at=0,duration=0,layer='bg'}={}) {
  finite(horizon,at,duration); color(day);color(night);color(sea);
  if(horizon<0||horizon>scene.H||duration<0)throw Error('Horizonte/duración inválidos');
  const id=scene.nid('ocean'), wave=scene.nid('wave');
  const width=scene.W+440, waterH=scene.H-horizon+220;
  const waves=Array.from({length:13},(_,i)=>{const y=horizon+35+i*52;return `<path d="M-220 ${y}Q${scene.W*.24} ${y-16-i%3*5} ${scene.W*.52} ${y}T${scene.W+220} ${y}" fill="none" stroke="${i%3?'#a9e7ed':'#c8f4ef'}" stroke-width="${i%4+2}" opacity="${n(.08+(i%3)*.07)}"/>`;}).join('');
  scene.add(layer,`<g class="${id}"><rect x="-220" y="-220" width="${width}" height="${horizon+220}" fill="${day}"/><circle cx="${scene.W*.77}" cy="${horizon*.37}" r="65" fill="#ffdfa0"/><rect x="-220" y="${horizon}" width="${width}" height="${waterH}" fill="${sea}"/><path d="M-220 ${horizon}H${scene.W+220}" stroke="#def4ef" stroke-width="5" opacity=".7"/><g class="${wave}">${waves}</g><path d="M${scene.W*.77-8} ${horizon}L${scene.W*.77+8} ${horizon}L${scene.W*.88} ${scene.H}H${scene.W*.66}Z" fill="#fff2c0" opacity=".13"/><rect class="${id}-night" x="-220" y="-220" width="${width}" height="${scene.H+440}" fill="${night}" opacity="0"/></g>`);
  if(duration){checkTime(scene,at,duration,'ocean');scene.js(`tl.fromTo(S+' .${id}-night',{opacity:0},{opacity:.83,duration:${n(duration)},ease:'none',immediateRender:false},T0+${n(at)});`);}
  scene.use('story-ocean');return {id,waves:wave};
}

/** Interior de nave con perspectiva central, arcos, vitrales y velas. */
export function sanctuary(scene,{vanishX=scene.W/2,vanishY=495,floorY=815,arches=4,layer='bg'}={}) {
  finite(vanishX,vanishY,floorY); if(arches<2||arches>9||!Number.isInteger(arches)||vanishY>=floorY)throw Error('Perspectiva inválida');
  const id=scene.nid('sanctuary'),W=scene.W,H=scene.H;
  let markup=`<g class="${id}"><rect width="${W}" height="${H}" fill="#1c1728"/><path d="M0 0L${vanishX-85} ${vanishY}V${floorY}L0 ${H}Z" fill="#33283b"/><path d="M${W} 0L${vanishX+85} ${vanishY}V${floorY}L${W} ${H}Z" fill="#30283a"/><path d="M0 ${H}L${vanishX-85} ${floorY}H${vanishX+85}L${W} ${H}Z" fill="#332819"/>`;
  for(let i=0;i<arches;i++){
    const scale=Math.pow(.72,i), left=vanishX-(W*.54)*scale,right=vanishX+(W*.54)*scale,top=115+(vanishY-115)*(1-scale);
    markup+=`<path d="M${n(left)} ${n(floorY+(H-floorY)*(1-scale))}V${n(top+115*scale)}Q${n(vanishX)} ${n(top-155*scale)} ${n(right)} ${n(top+115*scale)}V${n(floorY+(H-floorY)*(1-scale))}" fill="none" stroke="#b39156" stroke-width="${n(Math.max(4,27*scale))}"/><path d="M${n(left+16*scale)} ${n(top+130*scale)}Q${n(vanishX)} ${n(top-120*scale)} ${n(right-16*scale)} ${n(top+130*scale)}" fill="none" stroke="#f8d99b" stroke-width="${n(Math.max(1,5*scale))}" opacity=".6"/>`;
  }
  for(let side of [-1,1])for(let i=0;i<4;i++){
    const y=floorY+75+i*105, x=vanishX+side*(110+i*72), w=18+i*16;
    markup+=`<path d="M${n(x)} ${y}L${n(x+side*w)} ${y+34}" stroke="#ad8d55" stroke-width="5"/><ellipse cx="${n(x)}" cy="${y}" rx="${n(4+i)}" ry="${n(11+i*2)}" fill="#ffd991" opacity=".86"/>`;
  }
  for(let i=-5;i<=5;i++)markup+=`<path d="M${vanishX+i*16} ${floorY}L${vanishX+i*170} ${H}" stroke="#aa8450" stroke-opacity=".42" stroke-width="2"/>`;
  markup+=`<path d="M${vanishX-100} ${floorY-80}H${vanishX+100}V${floorY}" fill="#c5a66a" opacity=".18"/></g>`;
  scene.add(layer,markup);scene.use('story-sanctuary');return {id};
}

/** Pergamino, sello físico y texto; el sello aparece cuando se solicita. */
export function sealedDocument(scene,{x=95,y=300,w=530,h=650,heading='DOCUMENTO',lines=10,seal='✦',at=0,layer='fg'}={}) {
  finite(x,y,w,h,at); if(w<=0||h<=0||lines<0||lines>22||!Number.isInteger(lines))throw Error('Documento inválido');
  const id=scene.nid('document'),sealId=scene.nid('seal');
  let rule='';for(let i=0;i<lines;i++){const yy=y+110+i*(h-225)/Math.max(lines,1);rule+=`<path d="M${x+45} ${n(yy)}h${n((w-90)*(i%4===3?.72:1))}" stroke="#67523d" stroke-width="3" opacity=".46"/>`;}
  scene.add(layer,`<g class="${id}"><path d="M${x+10} ${y+8}Q${x+w/2} ${y-12} ${x+w-10} ${y+8}L${x+w} ${y+h-13}Q${x+w*.55} ${y+h+10} ${x} ${y+h-8}Z" fill="#f1dfaf" stroke="#ae8850" stroke-width="9"/><path d="M${x+22} ${y+28}H${x+w-22}V${y+h-38}H${x+22}Z" fill="#d0b77b" opacity=".23"/><text x="${x+w/2}" y="${y+78}" text-anchor="middle" font-size="26" letter-spacing="3" font-weight="700" fill="#6e4f2e">${escape(heading)}</text>${rule}<g class="${sealId}"><circle cx="${x+w/2}" cy="${y+h-90}" r="45" fill="#a82e31" stroke="#e3a565" stroke-width="7"/><circle cx="${x+w/2}" cy="${y+h-90}" r="31" fill="none" stroke="#e7b57a" stroke-width="2"/><text x="${x+w/2}" y="${y+h-76}" text-anchor="middle" font-size="40" fill="#f7d9af">${escape(seal)}</text></g></g>`);
  if(at){checkTime(scene,at,.35,'sealedDocument');scene.js(`tl.fromTo(S+' .${sealId}',{opacity:0,scale:1.6,svgOrigin:'${n(x+w/2)} ${n(y+h-90)}'},{opacity:1,scale:1,duration:.35,ease:'back.out(1.5)',immediateRender:false},T0+${n(at)});`);}
  scene.use('story-document');return {id,sealId};
}

/** Libro abierto con dos páginas y énfasis localizado sobre una cita. */
export function scriptureBook(scene,{x=70,y=380,w=580,h=470,chapter='LUCAS',verse='23,43',excerpt='Hoy estarás conmigo',at=0,layer='fg'}={}) {
  finite(x,y,w,h,at);if(w<=0||h<=0)throw Error('Libro inválido');
  const id=scene.nid('scripture'),hi=scene.nid('verse'); const cx=x+w/2;
  let rules='';for(let side=0;side<2;side++)for(let i=0;i<15;i++){
    if(side===1&&i>=9&&i<=11)continue;
    const xx=x+32+side*w/2,yy=y+100+i*20;
    rules+=`<path d="M${n(xx)} ${n(yy)}h${n(w*.36-(i%4)*11)}" stroke="#8b7858" stroke-width="2" opacity=".45"/>`;
  }
  scene.add(layer,`<g class="${id}"><path d="M${x-12} ${y-5}Q${cx-w*.22} ${y-40} ${cx} ${y-5}Q${cx+w*.22} ${y-40} ${x+w+12} ${y-5}V${y+h+7}Q${cx+w*.22} ${y+h-22} ${cx} ${y+h+12}Q${cx-w*.22} ${y+h-22} ${x-12} ${y+h+7}Z" fill="#59422c" stroke="#c8a66f" stroke-width="7"/><path d="M${x} ${y}Q${cx-w*.22} ${y-25} ${cx} ${y}Q${cx+w*.22} ${y-25} ${x+w} ${y}V${y+h}Q${cx+w*.22} ${y+h-25} ${cx} ${y+h}Q${cx-w*.22} ${y+h-25} ${x} ${y+h}Z" fill="#f4e7bd"/><path d="M${cx} ${y}V${y+h}" stroke="#8a7049" stroke-width="5" opacity=".65"/><text x="${x+w*.74}" y="${y+60}" text-anchor="middle" font-size="23" fill="#9b4e2f" letter-spacing="3">${escape(chapter)}</text>${rules}<g class="${hi}"><rect x="${cx+22}" y="${y+262}" width="${w/2-44}" height="73" rx="7" fill="#f7cc5f" opacity=".66"/><text x="${cx+32}" y="${y+286}" font-size="17" font-weight="700" fill="#9d3b23">${escape(verse)}</text><text x="${cx+32}" y="${y+309}" font-size="14" fill="#5d402d">${escape(excerpt)}</text></g></g>`);
  if(at){checkTime(scene,at,.5,'scriptureBook');scene.js(`tl.fromTo(S+' .${hi}',{opacity:0},{opacity:1,duration:.5,immediateRender:false},T0+${n(at)});`);}
  scene.use('story-scripture');return {id,highlight:hi};
}

/** Placa narrativa: fecha, edad, cifra o capítulo; anclaje en HUD. */
export function storyPlate(scene,{label,value,x=28,y=70,w=210,accent='#e64b43',at=0,layer='hud'}={}) {
  finite(x,y,w,at);color(accent);if(!label||value===undefined||w<95)throw Error('Placa inválida');
  const id=scene.nid('storyplate');
  scene.add(layer,`<g class="${id}"><rect x="${x}" y="${y}" width="${w}" height="78" rx="8" fill="#0d1730" stroke="#c6d7e7" stroke-opacity=".45" stroke-width="2"/><rect x="${x}" y="${y}" width="7" height="78" rx="3" fill="${accent}"/><text x="${x+20}" y="${y+28}" font-size="14" font-weight="700" fill="#a8c7db" letter-spacing="2">${escape(label)}</text><text x="${x+20}" y="${y+62}" font-size="27" font-weight="800" fill="#ffffff">${escape(value)}</text></g>`);
  if(at){checkTime(scene,at,.35,'storyPlate');scene.js(`tl.fromTo(S+' .${id}',{opacity:0,y:18},{opacity:1,y:0,duration:.35,ease:'power2.out',immediateRender:false},T0+${n(at)});`);}
  scene.use('story-plate');return {id};
}

/** Tarjeta final propia: sólo si el usuario la solicita. No crea marcas ajenas. */
export function channelEndCard(scene,{channel='TU CANAL',cta='Seguir',teaser='',at=0,layer='hud'}={}) {
  finite(at);const id=scene.nid('endcard'),circle=scene.nid('avatar');const cx=scene.W/2,cy=scene.H*.56;
  const rays=Array.from({length:24},(_,i)=>`<path d="M${cx} ${cy}l0 -${scene.H}" transform="rotate(${i*15} ${cx} ${cy})" stroke="#d8a046" stroke-width="24" opacity=".14"/>`).join('');
  scene.add(layer,`<g class="${id}"><rect width="${scene.W}" height="${scene.H}" fill="#342018"/>${rays}<circle class="${circle}" cx="${cx}" cy="${cy-115}" r="95" fill="#f8e6c6" stroke="#cc812e" stroke-width="11"/><text x="${cx}" y="${cy-123}" text-anchor="middle" font-size="22" font-weight="800" fill="#382822">${escape(channel.slice(0,24))}</text><text x="${cx}" y="${cy+20}" text-anchor="middle" font-size="34" font-weight="800" fill="#ffffff">${escape(channel)}</text><rect x="${cx-104}" y="${cy+54}" width="208" height="66" rx="15" fill="#2e5d99"/><text x="${cx}" y="${cy+98}" text-anchor="middle" font-size="27" font-weight="700" fill="#fff">${escape(cta)}</text>${teaser?`<text x="${cx}" y="${cy+175}" text-anchor="middle" font-size="27" fill="#f8d090">${escape(teaser)}</text>`:''}</g>`);
  if(at){checkTime(scene,at,.6,'channelEndCard');scene.js(`tl.fromTo(S+' .${id}',{opacity:0},{opacity:1,duration:.6,immediateRender:false},T0+${n(at)});`);}
  scene.use('story-endcard');return {id};
}
