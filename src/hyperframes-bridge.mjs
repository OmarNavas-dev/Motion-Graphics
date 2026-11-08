import {getStylePreset} from './style-catalog.mjs';
import {compileSceneDirection} from './direction-compiler.mjs';
import {chooseConcept, identities, supportingLine, visualHeadline} from './semantic-director.mjs';
import {directMediaScene} from './media-director.mjs';
import {wordCaptionTrack, WORD_CAPTION_CSS} from './word-captions.mjs';
import {renderAuthored} from './authored-renderer.mjs';
import {BUNDLED_FONT_FACES} from './project-assets.mjs';
import {repairLegacyCaptionScript} from './caption-compat.mjs';

const h = (value) => String(value ?? '').replace(/&/g, '&amp;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const getDimensions = (format, resolution = '720p') => {
  const scale = resolution === '1080p' ? 1.5 : 1;
  return format === 'horizontal'
    ? {width: Math.round(1280 * scale), height: Math.round(720 * scale)}
    : {width: Math.round(720 * scale), height: Math.round(1280 * scale)};
};
const resolveSceneStyle = (project, scene) => scene.style ?? project.style ?? 'modern';
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const seconds = (value) => Math.max(0, number(value)).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');

const veniceFigure = (detail, sceneId) => {
  const p = `${sceneId}-v`;
  const open = `<svg class="figure venice-figure" viewBox="0 0 620 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
    <linearGradient id="${p}-sky" x1="0" y1="0" x2="0.8" y2="1"><stop stop-color="#20364D"/><stop offset=".56" stop-color="#101B2A"/><stop offset="1" stop-color="#080E18"/></linearGradient>
    <linearGradient id="${p}-water" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#56D5E0"/><stop offset=".4" stop-color="#2389A4"/><stop offset="1" stop-color="#0B2942"/></linearGradient>
    <linearGradient id="${p}-stone" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#F4D79F"/><stop offset=".45" stop-color="#B87961"/><stop offset="1" stop-color="#493B48"/></linearGradient>
    <linearGradient id="${p}-wood" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#422A2B"/><stop offset=".34" stop-color="#E0A45F"/><stop offset=".58" stop-color="#96603E"/><stop offset="1" stop-color="#34252B"/></linearGradient>
    <linearGradient id="${p}-soil" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#594B48"/><stop offset=".46" stop-color="#302B32"/><stop offset="1" stop-color="#141923"/></linearGradient>
    <linearGradient id="${p}-gate" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#EAC77F"/><stop offset=".48" stop-color="#8297A8"/><stop offset="1" stop-color="#344557"/></linearGradient>
    <radialGradient id="${p}-glow"><stop stop-color="#F3C679" stop-opacity=".44"/><stop offset="1" stop-color="#F3C679" stop-opacity="0"/></radialGradient>
    <pattern id="${p}-grain" width="46" height="34" patternUnits="userSpaceOnUse"><path d="M0 12Q14 4 30 12T60 12M-10 28Q7 20 20 28T50 28" fill="none" stroke="#F2C88C" stroke-opacity=".18" stroke-width="2"/></pattern>
    <filter id="${p}-shadow" x="-.3" y="-.3" width="1.7" height="1.8"><feDropShadow dx="0" dy="12" stdDeviation="9" flood-color="#02060B" flood-opacity=".72"/></filter>
    <filter id="${p}-soft"><feGaussianBlur stdDeviation="13"/></filter>
    </defs><rect class="venice-sky" width="620" height="620" fill="url(#${p}-sky)"/>`;
  const atmosphere = `<ellipse cx="470" cy="142" rx="190" ry="175" fill="url(#${p}-glow)"/><circle cx="503" cy="112" r="26" fill="#F4D99F" opacity=".78"/><path d="M0 180Q150 151 300 176T620 166" fill="none" stroke="#B2C5D3" stroke-opacity=".14" stroke-width="3"/>`;
  const city = `<g class="venice-city" filter="url(#${p}-shadow)" stroke="#0A111A" stroke-width="7" stroke-linejoin="round">
    <path d="M22 350V230L111 176L201 230V351Z" fill="url(#${p}-stone)"/><path d="M7 232L111 164L215 232Z" fill="#A85F4A"/>
    <path d="M218 350V208L316 148L415 208V352Z" fill="#A9B9BF"/><path d="M198 211L316 133L434 211Z" fill="#D5AC6D"/>
    <path d="M427 350V250L505 202L583 250V352Z" fill="url(#${p}-stone)"/><path d="M410 253L505 187L600 253Z" fill="#A85F4A"/>
    <path d="M289 150V80H338V158M279 82L313 42L348 82Z" fill="#D8B875"/>
    ${[65,111,157,264,316,369,466,505,548].map((x,i)=>`<path d="M${x} ${i<3?254:i<6?229:270}v43m-12-43a12 12 0 0 1 24 0" fill="none" stroke="#101925" stroke-width="8"/><rect x="${x-4}" y="${i<3?258:i<6?233:274}" width="8" height="27" rx="4" fill="#F0C774" opacity=".82"/>`).join('')}
    </g>`;
  const water = `<g class="venice-water"><path d="M0 347Q135 325 280 348T620 341V620H0Z" fill="url(#${p}-water)" opacity=".94"/><path d="M0 350Q135 328 280 351T620 344M0 406Q150 385 310 406T620 399M0 472Q150 453 310 472T620 467" fill="none" stroke="#B5FAF3" stroke-opacity=".55" stroke-width="4"/><path d="M0 350Q135 328 280 351T620 344V620H0Z" fill="url(#${p}-grain)" opacity=".38"/></g>`;
  const ground = `<g class="venice-ground"><path d="M0 405Q145 391 300 407T620 401V620H0Z" fill="url(#${p}-soil)"/><path d="M0 452Q120 434 250 454T500 450T620 452M0 528Q140 512 300 531T620 522" fill="none" stroke="#C89667" stroke-opacity=".45" stroke-width="3"/><path d="M0 486Q120 469 250 488T500 485T620 486M0 565Q140 549 300 567T620 560" fill="none" stroke="#E4C299" stroke-opacity=".14" stroke-width="2"/></g>`;
  const platform = `<g class="venice-platform" filter="url(#${p}-shadow)"><path d="M34 337L585 337L548 371L72 371Z" fill="#E9E0CE" stroke="#101925" stroke-width="7"/><path d="M72 371H548L526 397H94Z" fill="#778997" stroke="#101925" stroke-width="6"/><path d="M86 378H533" stroke="#F8F0DF" stroke-opacity=".55" stroke-width="3"/></g>`;
  const piles = `<g class="venice-piles">${[100,170,240,310,380,450,520].map((x)=>`<g class="venice-pile" style="transform-origin:${x}px 400px" filter="url(#${p}-shadow)"><path d="M${x-16} 391L${x-14} 530L${x} 562L${x+14} 530L${x+16} 391Z" fill="url(#${p}-wood)" stroke="#E9C78F" stroke-width="3"/><path d="M${x-6} 407V519M${x+6} 405V522" stroke="#FFE0A7" stroke-opacity=".56" stroke-width="3"/><path d="M${x-11} 454H${x+10}M${x-10} 485H${x+10}" stroke="#513832" stroke-opacity=".7" stroke-width="3"/></g>`).join('')}</g>`;
  const labels = `<g class="venice-callouts" fill="none" stroke="#F5D48F" stroke-width="3" opacity=".9"><path d="M101 424H54V457"/><circle cx="101" cy="424" r="5" fill="#F5D48F"/><path d="M516 520H568V484" stroke="#81E0E5"/><circle cx="516" cy="520" r="5" fill="#81E0E5"/></g>`;
  const mechanical = `<g class="venice-mechanical" filter="url(#${p}-shadow)"><path d="M78 205V512M542 205V512" stroke="#B9C9D5" stroke-width="9"/><path d="M67 211H553" stroke="#E8D8AE" stroke-width="8"/><path d="M67 503H553" stroke="#263846" stroke-width="14"/><path d="M86 268H534M86 450H534" stroke="#6D8798" stroke-width="3" stroke-dasharray="8 9" opacity=".8"/>${[86,534].map(x=>`<circle cx="${x}" cy="211" r="8" fill="#F2D18E" stroke="#182633" stroke-width="4"/><circle cx="${x}" cy="503" r="8" fill="#F2D18E" stroke="#182633" stroke-width="4"/>`).join('')}<rect x="215" y="232" width="190" height="92" rx="8" fill="#172631" stroke="#D3DCE0" stroke-width="4"/><path d="M232 251H388M232 274H388M232 297H388" stroke="#9EB4C1" stroke-width="4" opacity=".72"/><circle cx="233" cy="250" r="6" fill="#E8C980"/><circle cx="387" cy="250" r="6" fill="#E8C980"/><circle cx="233" cy="304" r="6" fill="#E8C980"/><circle cx="387" cy="304" r="6" fill="#E8C980"/></g>`;
  const arrows = `<g class="venice-load-arrows" fill="none" stroke="#FFD27D" stroke-width="8" stroke-linecap="round"><path d="M175 279V330" stroke-dasharray="54"/><path d="M310 264V330" stroke-dasharray="68"/><path d="M445 279V330" stroke-dasharray="54"/><path d="M160 390V482" stroke="#80DDE1" stroke-dasharray="92"/><path d="M310 390V510" stroke-dasharray="120"/><path d="M460 390V482" stroke="#80DDE1" stroke-dasharray="92"/></g>`;
  const tideScene = `<g class="venice-tide-water"><path d="M0 319Q140 296 290 318T620 312V620H0Z" fill="url(#${p}-water)"/><path d="M0 319Q140 296 290 318T620 312" fill="none" stroke="#B5FAF3" stroke-width="7"/></g><path d="M35 312H585" stroke="#F4D58D" stroke-opacity=".5" stroke-dasharray="5 11" stroke-width="2"/>`;
  const barriers = `<g class="venice-gates">${[170,310,450].map((x)=>`<g class="venice-barrier" style="transform-origin:${x}px 390px"><path d="M${x-52} 390V358" stroke="#D6E0E6" stroke-width="8"/><path d="M${x-42} 386L${x+44} 350L${x+50} 366L${x-36} 402Z" fill="url(#${p}-gate)" stroke="#F5D48F" stroke-width="5" filter="url(#${p}-shadow)"/><path d="M${x-27} 380L${x+30} 356M${x-15} 389L${x+39} 366" stroke="#F3E1B4" stroke-opacity=".58" stroke-width="3"/></g>`).join('')}</g>`;
  if (detail === 'mose') return `${open}${atmosphere}<path d="M0 270Q90 224 180 264L212 356H0ZM620 270Q530 224 440 264L408 356H620Z" fill="#39434B" stroke="#17202A" stroke-width="7"/><path d="M0 340Q130 320 260 341T620 336V620H0Z" fill="url(#${p}-water)"/><path d="M0 340Q130 320 260 341T620 336" fill="none" stroke="#B5FAF3" stroke-opacity=".68" stroke-width="5"/>${barriers}<path d="M0 421Q145 402 300 423T620 416" fill="none" stroke="#83C9D8" stroke-opacity=".35" stroke-width="3"/></svg>`;
  if (detail === 'tide') return `${open}${atmosphere}${city}${tideScene}<path d="M35 350H585" stroke="#FFDA8B" stroke-opacity=".68" stroke-dasharray="5 10" stroke-width="3"/><circle cx="545" cy="316" r="9" fill="#FFDA8B" filter="url(#${p}-shadow)"/></svg>`;
  if (detail === 'timber') return `${open}${atmosphere}<g class="venice-water"><path d="M0 268Q150 245 310 269T620 264V344H0Z" fill="url(#${p}-water)" opacity=".86"/><path d="M0 270Q150 247 310 271T620 266" fill="none" stroke="#B5FAF3" stroke-width="6"/></g><g class="venice-ground"><path d="M0 314H620V620H0Z" fill="url(#${p}-soil)"/><path d="M0 388Q150 368 310 390T620 382M0 504Q150 484 310 506T620 498" fill="none" stroke="#C89667" stroke-opacity=".42" stroke-width="3"/><path d="M0 430Q150 410 310 432T620 424M0 560Q150 540 310 562T620 554" fill="none" stroke="#E4C299" stroke-opacity=".16" stroke-width="2"/></g><g class="venice-rig" filter="url(#${p}-shadow)"><path d="M92 70V580M528 70V580" stroke="#B9C9D5" stroke-width="10"/><path d="M72 78H548" stroke="#E8D8AE" stroke-width="9"/><path d="M72 548H548" stroke="#263846" stroke-width="15"/><path d="M92 176H528M92 472H528" stroke="#7690A0" stroke-width="3" stroke-dasharray="9 12"/><circle cx="92" cy="78" r="9" fill="#F2D18E"/><circle cx="528" cy="78" r="9" fill="#F2D18E"/><g class="venice-central-pile"><path d="M253 191V535Q253 568 310 602Q367 568 367 535V191Z" fill="url(#${p}-wood)" stroke="#F3D19A" stroke-width="6"/><path d="M278 220V522M342 220V522" stroke="#F7DCA9" stroke-opacity=".64" stroke-width="6"/><path d="M263 305H357M260 398H360M258 482H362" stroke="#513832" stroke-width="7"/><path d="M253 191Q310 157 367 191Q310 225 253 191Z" fill="#D69A5A" stroke="#F4D39A" stroke-width="6"/><ellipse cx="310" cy="191" rx="39" ry="12" fill="none" stroke="#6F4333" stroke-width="4"/><ellipse cx="310" cy="191" rx="18" ry="6" fill="none" stroke="#6F4333" stroke-width="4"/></g><g class="venice-clamp"><rect x="202" y="270" width="216" height="126" rx="9" fill="#172631" stroke="#D3DCE0" stroke-width="5"/><path d="M220 292H400M220 320H400M220 348H400" stroke="#9EB4C1" stroke-width="5" opacity=".72"/><circle cx="220" cy="292" r="8" fill="#E8C980"/><circle cx="400" cy="292" r="8" fill="#E8C980"/><circle cx="220" cy="374" r="8" fill="#E8C980"/><circle cx="400" cy="374" r="8" fill="#E8C980"/><path d="M174 312H202M418 312H446" stroke="#6D8798" stroke-width="18"/></g><path d="M310 78V152" stroke="#FFD27D" stroke-width="7" stroke-dasharray="10 9"/><path d="M286 145L310 171L334 145" fill="none" stroke="#FFD27D" stroke-width="7" stroke-linecap="round"/></g><g class="venice-side-piles" opacity=".66">${[120,500].map((x)=>`<path d="M${x-15} 360V575L${x} 603L${x+15} 575V360Z" fill="url(#${p}-wood)" stroke="#E9C78F" stroke-width="3"/>`).join('')}</g><g class="venice-callouts" fill="none" stroke="#F5D48F" stroke-width="3"><path d="M202 270H82V235"/><circle cx="202" cy="270" r="6" fill="#F5D48F"/><path d="M367 535H548V505" stroke="#81E0E5"/><circle cx="367" cy="535" r="6" fill="#81E0E5"/></g></svg>`;
  if (detail === 'load') return `${open}${atmosphere}${city}${water}${ground}${platform}${mechanical}${piles}${arrows}${labels}</svg>`;
  if (detail === 'foundation') return `${open}${atmosphere}${city}${water}${ground}${platform}${mechanical}${piles}${labels}</svg>`;
  return `${open}${atmosphere}${city}${water}<path d="M80 403Q310 365 540 403" fill="none" stroke="#F0CE8A" stroke-opacity=".62" stroke-width="4"/><path d="M150 420Q310 384 470 420" fill="none" stroke="#A5E5E9" stroke-opacity=".5" stroke-width="3"/></svg>`;
};

const figure = (kind, detail, accent, second, ink, sceneId = 'hf') => {
  if (kind === 'venice') return veniceFigure(detail, sceneId);
  const open = '<svg class="figure" viewBox="0 0 620 620" aria-hidden="true">';
  const disc = '<circle cx="310" cy="310" r="256" fill="' + second + '" fill-opacity=".15"/>';
  if (kind === 'immune' && detail === 'skin') return open + disc +
    '<path d="M52 344Q311 310 567 344V546H52Z" fill="' + second + '" fill-opacity=".18"/>' +
    [0, 1, 2].map(row => Array.from({length: 6}, (_, i) => '<rect x="' + (49 + i * 93 - (row % 2 ? 38 : 0)) + '" y="' + (357 + row * 60) + '" width="89" height="56" rx="13" fill="' + (row === 0 ? accent : second) + '" stroke="' + ink + '" stroke-width="4"/>').join('')).join('') +
    '<path d="M58 344Q313 312 560 344" fill="none" stroke="' + ink + '" stroke-width="10" stroke-linecap="round"/>' +
    [[117, 180], [312, 157], [486, 203]].map(([x, y]) => '<g class="microbe" transform="translate(' + x + ' ' + y + ')"><circle r="37" fill="' + accent + '" stroke="' + ink + '" stroke-width="6"/><circle cx="-10" cy="-6" r="4" fill="' + ink + '"/><circle cx="10" cy="-6" r="4" fill="' + ink + '"/><path d="M-9 12Q0 19 9 12" fill="none" stroke="' + ink + '" stroke-width="3"/></g>').join('') + '</svg>';
  if (kind === 'immune' && detail === 'wash') return open + disc +
    '<path d="M234 459 C192 421 197 388 214 376 C230 361 255 378 269 393 L269 261 Q268 229 290 225 Q315 223 319 255 V341 L325 243 Q326 217 348 220 Q370 222 370 245 V349 L385 278 Q392 254 414 260 Q437 270 424 306 L405 443 Q393 501 332 521 Q277 525 234 459Z" fill="' + accent + '" stroke="' + ink + '" stroke-width="10"/>' +
    [[177, 214, 20], [415, 154, 27], [464, 224, 16], [208, 299, 11], [356, 133, 15]].map(([x, y, r]) => '<circle class="node" cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none" stroke="' + second + '" stroke-width="6"/>').join('') + '</svg>';
  if (kind === 'immune') return open + disc +
    '<path d="M311 127 479 208 463 375Q408 495 311 528 208 489 158 370L145 206Z" fill="' + second + '" stroke="' + ink + '" stroke-width="9"/>' +
    '<path d="m230 322 60 64 106-138" fill="none" stroke="' + accent + '" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/>' +
    [[112, 164], [495, 177], [487, 460], [120, 466]].map(([x, y]) => '<g class="microbe" transform="translate(' + x + ' ' + y + ')"><circle r="34" fill="' + accent + '" stroke="' + ink + '" stroke-width="5"/><circle cx="-10" cy="-5" r="4" fill="' + ink + '"/><circle cx="10" cy="-5" r="4" fill="' + ink + '"/><path d="M-8 11Q0 18 8 11" fill="none" stroke="' + ink + '" stroke-width="3"/></g>').join('') + '</svg>';
  if (kind === 'finance') return open + disc + '<path d="M95 496H520" stroke="' + ink + '" stroke-width="6"/>' +
    [[125, 343, 151], [272, 264, 230], [418, 164, 330]].map(([x, y, v], i) => '<rect class="bar" x="' + x + '" y="' + y + '" width="84" height="' + v + '" rx="13" fill="' + (i === 2 ? accent : second) + '"/>').join('') +
    '<path d="m108 337 150-77 113-74 132-101m-35 0h35v35" fill="none" stroke="' + accent + '" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (kind === 'horror') return open + '<circle cx="441" cy="153" r="81" fill="' + accent + '"/><circle cx="461" cy="145" r="71" fill="#160F15"/>' +
    '<ellipse cx="310" cy="231" rx="61" ry="88" fill="' + ink + '"/><path d="M250 237Q210 359 178 502Q310 543 444 502Q403 349 365 237Z" fill="' + ink + '"/>' +
    '<path d="M0 497Q132 455 311 497T620 497V620H0Z" fill="' + second + '" fill-opacity=".3"/></svg>';
  if (kind === 'technology') {
    const pts = [[310, 95], [121, 216], [182, 434], [311, 317], [495, 421], [500, 208]];
    return open + disc + '<path d="M310 95 121 216 182 434 311 317 495 421 500 208 310 95 311 317 121 216M311 317 500 208" stroke="' + second + '" stroke-width="7" fill="none"/>' +
      pts.map(([x, y], i) => '<circle class="node" cx="' + x + '" cy="' + y + '" r="' + (i === 3 ? 57 : 34) + '" stroke="' + ink + '" stroke-width="7" fill="' + (i === 3 ? accent : second) + '"/>').join('') + '</svg>';
  }
  if (kind === 'nature') return open + disc + '<circle cx="462" cy="160" r="74" fill="' + accent + '"/>' +
    '<path d="M0 470 169 222 289 372 421 243 620 480V620H0Z" fill="' + second + '"/>' +
    '<path d="M0 534 169 334 298 452 428 302 620 538V620H0Z" fill="' + accent + '"/></svg>';
  if (kind === 'learning') return open + disc + '<path d="M311 206Q187 151 89 219V460Q202 403 311 471Q416 410 531 460V219Q433 157 311 206Z" fill="' + accent + '" stroke="' + ink + '" stroke-width="10"/>' +
    '<path d="M311 206V471M132 275Q196 245 268 286M350 285Q412 246 486 275" fill="none" stroke="' + ink + '" stroke-width="10"/></svg>';
  return open + disc + '<path d="M96 418 273 169 397 304 517 159" fill="none" stroke="' + accent + '" stroke-width="27" stroke-linecap="round"/>' +
    [[96, 418], [273, 169], [397, 304], [517, 159]].map(([x, y], i) => '<circle class="node" cx="' + x + '" cy="' + y + '" r="' + (i % 2 ? 54 : 44) + '" fill="' + (i % 2 ? accent : second) + '"/>').join('') + '</svg>';
};

const formatGraphicValue = (graphic) => {
  const value = number(graphic.value);
  const [integer, decimal] = String(Number.isInteger(value) ? value : Number(value.toFixed(2))).split('.');
  const shown = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (decimal ? ',' + decimal : '');
  return graphic.unit === 'currency' ? '$' + shown : graphic.unit === 'percent' ? shown + '%' : shown;
};

const graphicMarkup = (graphic, sceneId, index) => {
  const id = `${sceneId}-graphic-${index}`;
  const max = Math.max(1, number(graphic.maxValue, Math.max(100, number(graphic.value))));
  const progress = clamp(number(graphic.value) / max, 0, 1) * 100;
  const label = h(graphic.label || 'Dato importante');
  const value = h(formatGraphicValue(graphic));
  if (graphic.kind === 'bar') return `<div id="${id}" class="hf-graphic hf-graphic-bar"><div class="hf-graphic-label">${label}</div><strong class="hf-graphic-value">${value}</strong><div class="hf-progress"><i style="width:${progress.toFixed(2)}%"></i></div></div>`;
  if (graphic.kind === 'donut') {
    const parts = (graphic.segments || []).filter((part) => number(part.value) > 0);
    const sum = parts.reduce((total, part) => total + number(part.value), 0);
    let offset = 0;
    const colors = ['var(--accent)', 'var(--second)', '#F2C66D', '#F5F5F5', '#7ED6C2'];
    const rings = sum > 0 ? parts.map((part, partIndex) => {
      const length = number(part.value) / sum * 302;
      const ring = `<circle cx="60" cy="60" r="48" class="donut-segment" style="stroke:${colors[partIndex % colors.length]};stroke-dasharray:${length.toFixed(2)} ${(302 - length).toFixed(2)};stroke-dashoffset:${(-offset).toFixed(2)}"/>`;
      offset += length;
      return ring;
    }).join('') : `<circle cx="60" cy="60" r="48" class="donut-value" style="stroke-dasharray:${(progress * 3.016).toFixed(2)} 302"/>`;
    const legend = sum > 0 ? `<div class="hf-donut-legend">${parts.map((part, partIndex) => `<span><i style="background:${colors[partIndex % colors.length]}"></i>${h(part.label)} · ${h(number(part.value))}</span>`).join('')}</div>` : '';
    return `<div id="${id}" class="hf-graphic hf-graphic-donut"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" class="donut-track"/>${rings}</svg><div><div class="hf-graphic-label">${label}</div><strong class="hf-graphic-value">${value}</strong>${legend}</div></div>`;
  }
  if (graphic.kind === 'icon') {
    const icons = {wallet: '$', home: '⌂', food: '✦', transport: '↗', shopping: '◇', savings: '＋', growth: '↑'};
    return `<div id="${id}" class="hf-graphic hf-graphic-icon"><span>${h(icons[graphic.icon] || '✦')}</span><div><div class="hf-graphic-label">${label}</div><strong class="hf-graphic-value">${value}</strong></div></div>`;
  }
  return `<div id="${id}" class="hf-graphic hf-graphic-counter"><div class="hf-graphic-label">${label}</div><strong class="hf-graphic-value">${value}</strong></div>`;
};


const captionMarkup = (caption, sceneId, index) => {
  const id = `${sceneId}-caption-${index}`;
  const position = caption.position === 'top' ? ' hf-caption-top' : '';
  return `<div id="${id}" class="hf-caption${position}"><span>${h(caption.text)}</span></div>`;
};

const cueMarkup = (cue, sceneId, index) => {
  const id = `${sceneId}-cue-${index}`;
  const label = cue.label ? `<span>${h(cue.label)}</span>` : '';
  const shape = cue.shape === 'ring' ? '<i class="cue-ring"></i>' :
    cue.shape === 'dot' ? '<i class="cue-dot"></i>' :
    cue.shape === 'square' ? '<i class="cue-square"></i>' :
    '<i class="cue-bars"><b></b><b></b><b></b><b></b></i>';
  return `<div id="${id}" class="hf-cue hf-cue-${h(cue.shape || 'ring')}">${shape}${label}</div>`;
};

const visualActionMarkup = (plan, sceneId) => {
  const action = plan?.actionType || 'reveal';
  const shapes = {
    establish:'<circle class="action-piece" cx="310" cy="310" r="170"/><path class="action-piece" d="M90 160h90M90 160v90M530 160h-90M530 160v90"/>',
    descend:'<path class="action-path" d="M310 95V525"/><circle class="action-marker" cx="310" cy="105" r="20"/>',
    construct:'<rect class="action-piece" x="145" y="320" width="55" height="190" rx="8"/><rect class="action-piece" x="282" y="240" width="55" height="270" rx="8"/><rect class="action-piece" x="420" y="285" width="55" height="225" rx="8"/>',
    install:'<path class="action-piece" d="M90 352H530L485 395H135Z"/><path class="action-path" d="M310 120V320"/>',
    inspect:'<circle class="action-piece" cx="310" cy="305" r="130"/><path class="action-piece" d="M310 150V460M250 280H370M250 350H370"/>',
    transfer:'<path class="action-path" d="M105 170C220 235 395 410 515 475"/><path class="action-path" d="M150 195V480M310 300V500M460 420V520"/><path class="action-piece" d="m488 451 35 29-45 8"/>',
    compare:'<path class="action-path" d="M310 100V520"/><path class="action-piece" d="M100 470h145M375 470h145M145 200V440M475 230V440"/>',
    rise:'<path class="action-water" d="M35 430Q120 405 205 430T375 430T545 430T710 430"/>',
    close:'<rect class="action-gate-left" x="118" y="160" width="105" height="315" rx="9"/><rect class="action-gate-right" x="397" y="160" width="105" height="315" rx="9"/>',

    resolve:'<circle class="action-piece" cx="310" cy="310" r="185"/><path class="action-piece" d="M105 155h95M105 155v95M515 155h-95M515 155v95"/>',
    follow:'<path class="action-path" d="M60 360C180 160 420 480 560 245"/><circle class="action-marker" cx="60" cy="360" r="18"/>',
    reveal:'<circle class="action-piece" cx="310" cy="310" r="150"/><path class="action-piece" d="M105 155h95M105 155v95M515 155h-95M515 155v95"/>',
  }[action] || '<circle class="action-piece" cx="310" cy="310" r="150"/>';
  return `<svg id="${sceneId}-action" class="hf-action-layer" viewBox="0 0 620 620" aria-hidden="true">${shapes}</svg>`;
};

const cameraMove = (scene, style) => {
  const strength = clamp(number(scene.motionStrength, 42), 0, 100) / 100;
  let preset = scene.visualActionPlan?.camera || scene.motion || 'auto';
  if (preset === 'auto') preset = style === 'horror' || style === 'cinematic' ? 'push' :
    style === 'watercolor' || style === 'minimal' ? 'drift' :
    style === 'energetic' || style === 'tech' ? 'pull' : 'pan-right';
  const distance = 34 * strength;
  const shotScale = scene.visualActionPlan?.shotScale === 'close' ? 1.08 :
    scene.visualActionPlan?.shotScale === 'wide' ? 0.94 : 1;
  const scale = shotScale * (1 + 0.10 * strength);
  const move = {fromScale: shotScale, toScale: scale, x: 0, y: 0};
  if (preset === 'static' || strength === 0) return {...move, toScale: 1};
  if (preset === 'pull') return {...move, fromScale: scale, toScale: shotScale};
  if (preset === 'pan-left') move.x = distance;
  if (preset === 'pan-right') move.x = -distance;
  if (preset === 'rise') move.y = distance;
  if (preset === 'drift') { move.x = distance * 0.35; move.y = -distance * 0.18; move.toScale = 1 + 0.035 * strength; }
  return move;
};

const customHtmlScene = (scene, sceneId, media, video) => {
  const custom = scene.customScene;
  if (!custom || typeof custom.html !== 'string' || !custom.html.trim()) return null;
  const fill = (value) => String(value || '')
    .replaceAll('__SCENE__', `#${sceneId}`)
    .replaceAll('__IMAGE__', h(media || ''))
    .replaceAll('__VIDEO__', h(video || ''));
  return {
    markup: `${custom.css ? `<style>${fill(custom.css)}</style>` : ''}${fill(custom.html)}`,
    script: custom.script ? fill(repairLegacyCaptionScript(custom.script)) : '',
  };
};

const renderScene = (scene, project, index, record, embeddedAssets, showText) => {
  const {start, duration, visualDuration, track} = record;
  const styleName = resolveSceneStyle(project, scene);
  const themeBase=identities[styleName] || identities.modern;
  // Built-in templates receive the selected palette; hand-authored SVG must follow the full style guide.
  const selectedStyle=scene.stylePreset||project.stylePreset;
  const theme={...themeBase,...(selectedStyle?getStylePreset(selectedStyle).colors:{}),...(project.brandProfile?.colors||{})};
  const subject = chooseConcept(scene, project);
  const actionPlan = scene.visualActionPlan || {actionType:'reveal', action:'', camera:'drift', shotScale:'medium'};
  const media = scene.imageAsset ? embeddedAssets[scene.imageAsset] : '';
  const video = scene.videoAsset ? embeddedAssets[scene.videoAsset] : '';
  const mediaDirection = directMediaScene(scene, project);
  const sceneId = `hf-scene-${index}`;
  const wordTrack = scene.captionMode === 'global' && showText ? wordCaptionTrack(project.wordTimings || [], record.wordStart ?? start, duration, sceneId) : {html:'',script:''};
  const words = visualHeadline(scene.title || '', project.format === 'vertical' ? 9 : 12).split(/\s+/).filter(Boolean);
  const title = words.map((word, i) => `<span class="word" style="color:${i === words.length - 1 ? theme.accent : theme.ink}">${h(word)}</span>`).join(' ');
  const subtitle = supportingLine(scene);
  const focus = `${clamp(number(scene.focusX, 50), 0, 100)}% ${clamp(number(scene.focusY, 50), 0, 100)}%`;
  const graphicMarkupList = (scene.motionGraphics || []).map((graphic, graphicIndex) => graphicMarkup(graphic, sceneId, graphicIndex)).join('');
  const cueMarkupList = (scene.cues || []).map((cue, cueIndex) => cueMarkup(cue, sceneId, cueIndex)).join('');
  const captionList = scene.captionMode === 'none' || scene.captionMode === 'global' ? [] : (scene.captions || []);
  const captionMarkupList = captionList.map((caption, captionIndex) => captionMarkup(caption, sceneId, captionIndex)).join('') + wordTrack.html;
  const audioCueMarkup = (scene.audioCues || []).map((cue, cueIndex) => `<audio id="${sceneId}-audio-${cueIndex}" data-start="${seconds(start + cue.at)}" data-duration="${seconds(cue.duration)}" data-track-index="230" data-volume="${number(cue.volume, .45)}" src="${h(embeddedAssets[cue.asset] || '')}"></audio>`).join('');
  const authoredOptions = {time:0, duration, ...getDimensions(project.format, project.resolution), showText, assets:embeddedAssets, theme};
  const authoredScene = scene.authored ? renderAuthored(scene.authored, authoredOptions) : '';
  const scriptJson = value => JSON.stringify(value).replaceAll('<', '\\u003c');
  const customScene = customHtmlScene(scene, sceneId, media, video) || (authoredScene ? {
    markup: `<div id="${sceneId}-authored" style="position:absolute;inset:0">${authoredScene}</div>`,
    script: `const state={t:0};const draw=()=>{document.getElementById('${sceneId}-authored').innerHTML=renderAuthored(${scriptJson(scene.authored)},{...${scriptJson(authoredOptions)},time:state.t});};draw();tl.to(state,{t:D,duration:D,ease:'none',onUpdate:draw},T0);`,
  } : null);
  const commonStyle = `--bg:${theme.background};--ink:${theme.ink};--accent:${theme.accent};--second:${theme.secondary};--font:${project.fontAsset ? "'MotionStudioLocal'," : ''}${theme.display}`;
  const transition = scene.transition || 'cut';
  const flash = transition === 'flash' ? '<div class="hf-flash"></div>' : '';
  const content = `${showText && !media && !video ? `<div class="kicker"><i></i>${h(subject.label)}</div><div class="headline">${title}</div>` : ''}` +
    `${showText && !media && !video && subtitle ? `<div class="subline">${h(subtitle)}</div>` : ''}` +
    `${!media && !video ? (authoredScene || `<div class="art" data-action-type="${h(actionPlan.actionType)}">${figure(subject.kind, subject.detail, theme.accent, theme.secondary, theme.ink, sceneId)}${subject.kind === 'venice' ? '' : visualActionMarkup(actionPlan, sceneId)}</div>`) : ''}` +
    `${showText && media ? `<div class="hf-lowerthird">${h(mediaDirection.headline)}</div>` : ''}` +
    `${showText && video ? `<div class="hf-lowerthird">${h(mediaDirection.headline)}</div>` : ''}` +
    graphicMarkupList + cueMarkupList + captionMarkupList + audioCueMarkup + flash;
  const mediaMarkup = video
    ? `<div id="${sceneId}-video-wrap" class="hf-video-wrap"><video id="${sceneId}-video" data-start="${seconds(start)}" data-duration="${seconds(visualDuration)}" data-track-index="${track}" data-volume="0" muted playsinline preload="auto" src="${h(video)}"></video></div>`
    : '';
  const imageMarkup = media
    ? `<div class="hf-media"><img class="hf-backdrop" src="${h(media)}" alt=""/><img class="hf-main" src="${h(media)}" alt="" style="object-fit:${mediaDirection.fit};object-position:${focus}"/></div>`
    : '';
  if (customScene) {
    // Custom HTML/Canvas draws its own text and timing; do not overlay the global caption track,
    // which otherwise duplicates captions already composited into procedural scenes.
    const customClip = `<section id="${sceneId}" class="clip hf-scene" data-caption-mode="${scene.captionMode || 'embedded'}" data-start="${seconds(start)}" data-duration="${seconds(visualDuration)}" data-track-index="${track}" style="${commonStyle}">${customScene.markup}${graphicMarkupList}${cueMarkupList}${audioCueMarkup}${wordTrack.html}<div class="hf-custom-transition"></div></section>`;
    return {html: customClip, id: sceneId, start, duration, visualDuration,
      media: false, video: false, graphics: scene.motionGraphics || [], cues: scene.cues || [], captions: [],
      graphicMarkupList, transition, styleName, camera: cameraMove(scene, styleName),
      focus, subtitle: false, customScript: customScene.script + '\n' + compileSceneDirection(scene).script + '\n' + wordTrack.script, custom: true};
  }
  const sceneVisualClass = authoredScene ? ' hf-authored-scene' : (subject.kind === 'venice' && !media && !video ? ' hf-venice' : '');
  const visualClip = video
    ? `<section id="${sceneId}" class="clip hf-scene hf-overlay${sceneVisualClass}" data-action-type="${h(actionPlan.actionType)}" data-action-plan="${h(actionPlan.action)}" data-start="${seconds(start)}" data-duration="${seconds(visualDuration)}" data-track-index="${track + 1}" style="${commonStyle}"><div class="scene-content">${content}</div></section>`
    : `<section id="${sceneId}" class="clip hf-scene${media ? ' hf-visual' : ''}${sceneVisualClass}" data-action-type="${h(actionPlan.actionType)}" data-action-plan="${h(actionPlan.action)}" data-start="${seconds(start)}" data-duration="${seconds(visualDuration)}" data-track-index="${track}" style="${commonStyle}">${imageMarkup}<div class="scene-content">${content}</div></section>`;
  return {html: mediaMarkup + visualClip, id: sceneId, start, duration, visualDuration,
    media: Boolean(media || video), video: Boolean(video), visualKind:subject.kind, visualDetail:subject.detail,
    graphics: scene.motionGraphics || [], cues: scene.cues || [], captions: captionList, wordScript: wordTrack.script,
    graphicMarkupList, transition, styleName, camera: cameraMove(scene, styleName),
    focus, subtitle: Boolean(subtitle)};
};

export const exportHyperframesProject = (project, only, gsapSource = '', embeddedAssets = {}) => {
  const scenes = only ? [only] : (project.scenes || []);
  const {width, height} = getDimensions(project.format, project.resolution);
  const portrait = height > width;
  const showText = project.showText ?? true;
  let elapsed = 0;
  const records = scenes.map((scene, index) => {
    const duration = clamp(number(scene.duration, 4), 0.5, 60);
    const start = elapsed;
    elapsed += duration;
    // Reserve a short overlap so the next scene can reveal over the previous one
    // without shortening the narration or the total composition duration.
    const isCustom = Boolean(scene.customScene?.html?.trim() || scene.authored);
    const visualDuration = duration + (!only && index < scenes.length - 1 && (!isCustom || scenes[index+1]?.transition==='fade') ? 0.42 : 0);
    const originalIndex = only ? project.scenes.indexOf(only) : index;
    const wordStart = only && originalIndex >= 0 ? project.scenes.slice(0, originalIndex).reduce((sum,s) => sum+s.duration,0) : start;
    return {start, wordStart, duration, visualDuration, track: index * 10};
  });
  const rendered = scenes.map((scene, index) => renderScene(scene, project, index, records[index], embeddedAssets, showText));
  const clips = rendered.map(item => item.html);
  const tweens = [];
  rendered.forEach((item, index) => {
    const at = (offset) => (item.start + offset).toFixed(3);
    const id = `#${item.id}`;
    const scene = scenes[index];
    const actionBeat = scene.visualActionPlan?.beats?.[1] || {at:0.18, duration:0.64};
    const actionStart = clamp(number(actionBeat.at, 0.18), 0, 0.9);
    const actionDuration = item.duration * clamp(number(actionBeat.duration, 0.64), 0.05, 1 - actionStart);
    const actionAt = at(item.duration * actionStart);
    const enterDuration = Math.min(0.58, Math.max(0.28, item.duration * 0.22));
    if (item.custom) {
      // Transition overlay never shifts scene time or transforms the caption track.
      if (item.transition === 'fade' && index>0) {
        // Previous custom scene stays visible for 0.42 s while this one fades in.
        tweens.push(`tl.fromTo('${id}',{opacity:0},{opacity:1,duration:${Math.min(.42,enterDuration)},ease:'power2.inOut'},${at(0)});`);
      } else if (item.transition !== 'cut') {
        const color = item.transition === 'flash' ? '#fff' : '#000';
        tweens.push(`tl.set('${id} .hf-custom-transition',{background:'${color}',opacity:1},${at(0)});tl.to('${id} .hf-custom-transition',{opacity:0,duration:${enterDuration},ease:'power2.out'},${at(0)});`);
      }
    } else if (item.transition === 'fade') {
      tweens.push(`tl.fromTo('${id}',{opacity:0},{opacity:1,duration:${enterDuration},ease:'power2.out'},${at(0)});`);
    } else if (item.transition === 'dip') {
      tweens.push(`tl.fromTo('${id}',{opacity:0},{opacity:1,duration:${enterDuration},ease:'sine.out'},${at(0)});`);
    } else if (item.transition === 'flash') {
      tweens.push(`tl.fromTo('${id} .hf-flash',{opacity:.9},{opacity:0,duration:.34,ease:'power2.out'},${at(0)});`);
    } else if (index > 0 && item.transition !== 'cut') {
      tweens.push(`tl.from('${id}',{clipPath:'inset(0 100% 0 0)',duration:${enterDuration},ease:'power3.out'},${at(0)});`);
    }
    if (item.custom) {
      if (item.customScript) {
        // Repeats and stagger may run past D. Drive a private scene clock only
        // through its assigned interval; never stretch it (which shifts captions).
        tweens.push(`try{const sceneTl${index}=gsap.timeline({paused:true});(function(tl,S,T0,D,gsap){${item.customScript}\n})(sceneTl${index},'${id}',0,${seconds(item.duration)},gsap);const sceneClock${index}={t:0};const drawScene${index}=()=>sceneTl${index}.time(sceneClock${index}.t,false);(window.__motionStudioSceneTimelines??=[]).push({id:'${item.id}',timeline:sceneTl${index},duration:${seconds(item.duration)}});tl.fromTo(sceneClock${index},{t:0},{t:${seconds(item.duration)},duration:${seconds(item.duration)},ease:'none',immediateRender:false,onUpdate:drawScene${index}},${item.start.toFixed(3)});}catch(error){window.__motionStudioErrors.push('Escena HTML ${index + 1}: '+error.message);console.error('Escena HTML ${index + 1}:',error);}`);
      }
    } else if (item.video) {
      const wrap = `#${item.id}-video-wrap`;
      tweens.push(`tl.fromTo('${wrap}',{scale:${item.camera.fromScale},x:0,y:0},{scale:${item.camera.toScale},x:${item.camera.x},y:${item.camera.y},duration:${Math.max(.5, item.duration)},ease:'none'},${at(0)});`);
    } else if (item.media) {
      tweens.push(`tl.fromTo('${id} .hf-main',{scale:${item.camera.fromScale},x:0,y:0},{scale:${item.camera.toScale},x:${item.camera.x},y:${item.camera.y},duration:${Math.max(.5, item.duration)},ease:'none'},${at(0)});`);
      tweens.push(`tl.from('${id} .hf-backdrop',{scale:1.12,opacity:0,duration:.8,ease:'power2.out'},${at(0)});`);
      if (showText) tweens.push(`tl.from('${id} .hf-lowerthird',{y:32,opacity:0,duration:.65,ease:'power3.out'},${at(.34)});`);
    } else {
      if (showText) {
        tweens.push(`tl.from('${id} .kicker',{y:-20,opacity:0,duration:.5,ease:'expo.out'},${at(.12)});`);
        tweens.push(`tl.from('${id} .kicker i',{scaleX:0,transformOrigin:'left center',duration:.48,ease:'back.out(1.5)'},${at(.18)});`);
        tweens.push(`tl.from('${id} .word',{y:58,opacity:0,duration:.56,stagger:.07,ease:'power4.out'},${at(.22)});`);
        if (item.subtitle) tweens.push(`tl.from('${id} .subline',{x:-28,opacity:0,duration:.63,ease:'power3.out'},${at(.61)});`);
      }
      tweens.push(`tl.from('${id} .art',{scale:.84,opacity:0,duration:.8,ease:'power2.out'},${at(.33)});`);
      const actionType = scene.visualActionPlan?.actionType || 'reveal';
      if (item.visualKind === 'venice') {
        tweens.push(`tl.from('${id} .venice-city',{y:42,opacity:0,duration:.8,ease:'power3.out'},${at(.38)});`);
        tweens.push(`tl.from('${id} .venice-water',{y:48,opacity:0,duration:.85,ease:'power2.out'},${at(.55)});`);
        if (['foundation','timber','load'].includes(item.visualDetail)) {
          tweens.push(`tl.from('${id} .venice-mechanical',{scale:.82,opacity:0,transformOrigin:'center center',duration:.7,ease:'power3.out'},${at(.64)});`);
          tweens.push(`tl.from('${id} .venice-platform',{y:-24,opacity:0,duration:.58,ease:'power3.out'},${at(.72)});`);
          tweens.push(`tl.from('${id} .venice-rig',{scale:.9,opacity:0,transformOrigin:'center bottom',duration:.72,ease:'power3.out'},${at(.76)});`);
          tweens.push(`tl.from('${id} .venice-central-pile',{y:140,opacity:0,duration:.82,ease:'power3.out'},${at(.9)});`);
          tweens.push(`tl.from('${id} .venice-clamp',{y:-90,opacity:0,duration:.68,ease:'back.out(1.1)'},${at(1.04)});`);
        }
        if (item.visualDetail === 'load') {
          tweens.push(`tl.from('${id} .venice-load-arrows path',{strokeDashoffset:130,opacity:.15,stagger:.12,duration:.9,ease:'power2.out'},${at(1.12)});`);
        }
        if (item.visualDetail === 'tide') {
          tweens.push(`tl.fromTo('${id} .venice-tide-water',{y:118},{y:0,duration:${Math.max(1.1,item.duration*.42)},ease:'sine.inOut'},${at(.62)});`);
        }
        if (item.visualDetail === 'mose') {
          tweens.push(`tl.fromTo('${id} .venice-barrier',{rotation:68,opacity:.35},{rotation:0,opacity:1,transformOrigin:'center bottom',stagger:.14,duration:1.05,ease:'power3.out'},${at(.86)});`);
        }
        if (item.visualDetail === 'foundation' || item.visualDetail === 'load') {
          tweens.push(`tl.from('${id} .venice-callouts path',{strokeDasharray:140,strokeDashoffset:140,opacity:0,stagger:.15,duration:.55,ease:'power2.out'},${at(1.22)});`);
        }
        const waterRepeats = Math.max(1, Math.floor(item.duration / 1.5) - 1);
        tweens.push(`tl.to('${id} .venice-water',{y:-5,duration:.75,repeat:${waterRepeats},yoyo:true,ease:'sine.inOut'},${at(.8)});`);
      } else if (actionType === 'close') {
        tweens.push(`tl.fromTo('${id} .action-gate-left',{x:-80,opacity:0},{x:0,opacity:.75,duration:${actionDuration},ease:'power2.out'},${actionAt});`);
        tweens.push(`tl.fromTo('${id} .action-gate-right',{x:80,opacity:0},{x:0,opacity:.75,duration:${actionDuration},ease:'power2.out'},${actionAt});`);
      } else if (actionType === 'rise') {
        tweens.push(`tl.fromTo('${id} .action-water',{y:120,opacity:0},{y:0,opacity:.82,duration:${actionDuration},ease:'none'},${actionAt});`);
      } else if (actionType === 'descend' || actionType === 'follow') {
        const property = actionType === 'descend' ? 'y' : 'x';
        const distance = actionType === 'descend' ? 300 : 500;
        tweens.push(`tl.fromTo('${id} .action-marker',{${property}:-${distance},opacity:0},{${property}:${distance},opacity:.9,duration:${actionDuration},ease:'none'},${actionAt});`);
        tweens.push(`tl.fromTo('${id} .action-path',{strokeDashoffset:700,opacity:.25},{strokeDashoffset:0,opacity:.8,duration:${actionDuration},ease:'none'},${actionAt});`);
      } else if (['transfer','compare'].includes(actionType)) {
        tweens.push(`tl.fromTo('${id} .action-path',{strokeDashoffset:700,opacity:.2},{strokeDashoffset:0,opacity:.82,duration:${actionDuration},ease:'power1.out'},${actionAt});`);
      } else if (['construct','install'].includes(actionType)) {
        tweens.push(`tl.from('${id} .action-piece',{y:90,opacity:0,transformOrigin:'center bottom',duration:${actionDuration},stagger:.12,ease:'back.out(1.2)'},${actionAt});`);
      } else if (actionType === 'inspect') {
        tweens.push(`tl.fromTo('${id} .action-piece',{scale:.75,opacity:.45,transformOrigin:'center center'},{scale:1.16,opacity:.85,duration:${actionDuration},ease:'sine.inOut',yoyo:true,repeat:1},${actionAt});`);
      } else {
        tweens.push(`tl.from('${id} .action-piece',{scale:.65,opacity:0,transformOrigin:'center center',duration:${actionDuration},stagger:.09,ease:'power2.out'},${actionAt});`);
      }
      if (['immune', 'technology', 'ideas'].includes(item.styleName)) {
        const selector = scene && item.styleName === 'immune' && chooseConcept(scene, project).detail !== 'wash' ? ' .microbe' : ' .node';
        tweens.push(`tl.from('${id}${selector}',{scale:.6,opacity:0,transformOrigin:'center center',duration:.54,stagger:.07,ease:'back.out(1.4)'},${at(.58)});`);
      }
      if (item.styleName === 'finance') tweens.push(`tl.from('${id} .bar',{scaleY:0,transformOrigin:'bottom center',duration:.66,stagger:.13,ease:'power3.out'},${at(.57)});`);
    }
    if (item.wordScript) tweens.push(`(function(tl,T0){${item.wordScript}})(tl,${item.start});`);
    item.graphics.forEach((graphic, graphicIndex) => {
      const graphicId = `#${item.id}-graphic-${graphicIndex}`;
      const graphicAt = clamp(number(graphic.at), 0, Math.max(0, item.duration - 0.1));
      const graphicDuration = clamp(number(graphic.duration, 2), 0.25, Math.max(0.25, item.duration - graphicAt));
      tweens.push(`tl.from('${graphicId}',{y:38,scale:.88,opacity:0,duration:.55,ease:'back.out(1.2)'},${at(graphicAt)});`);
      if (graphic.kind === 'bar') tweens.push(`tl.from('${graphicId} .hf-progress i',{scaleX:0,transformOrigin:'left center',duration:${Math.min(1.2, graphicDuration)},ease:'power2.out'},${at(graphicAt + .16)});`);
      if (graphic.kind === 'donut') tweens.push(`tl.from('${graphicId} .donut-value,${graphicId} .donut-segment',{strokeDasharray:'0 302',duration:${Math.min(1.2, graphicDuration)},ease:'power2.out'},${at(graphicAt + .16)});`);
      if (graphic.kind === 'counter') {
        const countValue = clamp(number(graphic.value), 0, 1e9);
        const countProxy = `hfCount${index}_${graphicIndex}`;
        const countLabel = graphic.unit === 'currency' ? '$' : '';
        const countSuffix = graphic.unit === 'percent' ? '%' : '';
        tweens.push(`const ${countProxy}={value:0};tl.to(${countProxy},{value:${countValue},duration:${Math.min(1.2, graphicDuration)},ease:'power2.out',onUpdate:()=>{const node=document.querySelector('${graphicId} .hf-graphic-value');if(node)node.textContent='${countLabel}'+Math.round(${countProxy}.value).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.')+'${countSuffix}';}},${at(graphicAt + .12)});`);
      }
      if (graphicDuration > 0.7) tweens.push(`tl.to('${graphicId}',{opacity:0,duration:.22,ease:'sine.in'},${at(graphicAt + graphicDuration - .22)});`);
    });
    if (!item.custom) item.captions.forEach((caption, captionIndex) => {
      const captionId = `#${item.id}-caption-${captionIndex}`;
      const captionAt = clamp(number(caption.at), 0, Math.max(0, item.duration - 0.05));
      const captionDuration = clamp(number(caption.duration, 0.8), 0.05, Math.max(0.05, item.duration - captionAt));
      tweens.push(`tl.from('${captionId}',{y:24,opacity:0,duration:.22,ease:'power3.out'},${at(captionAt)});`);
      if (captionDuration > 0.18) tweens.push(`tl.to('${captionId}',{opacity:0,duration:.16,ease:'sine.in'},${at(captionAt + captionDuration - .16)});`);
    });
    item.cues.forEach((cue, cueIndex) => {
      const cueId = `#${item.id}-cue-${cueIndex}`;
      const cueAt = clamp(number(cue.at), 0, Math.max(0, item.duration - 0.1));
      const cueDuration = clamp(number(cue.duration, 1), 0.2, Math.max(0.2, item.duration - cueAt));
      tweens.push(`tl.from('${cueId}',{scale:.68,opacity:0,duration:.38,ease:'back.out(1.5)'},${at(cueAt)});`);
      if (cueDuration > .4) tweens.push(`tl.to('${cueId}',{opacity:0,duration:.2,ease:'sine.in'},${at(cueAt + cueDuration - .2)});`);
    });
  });

  const totalDuration = elapsed;
  const audio = [];
  if (!only && project.narrationMode === 'dialogues') {
    let voiceStart = 0;
    (project.voiceClips || []).forEach((clip, index) => {
      const src = embeddedAssets[clip.asset];
      const duration = clamp(number(clip.duration, 0), 0.1, 900);
      if (src) audio.push(`<audio id="hf-voice-${index}" data-start="${seconds(voiceStart)}" data-duration="${seconds(duration)}" data-track-index="200" data-volume="1" src="${h(src)}"></audio>`);
      voiceStart += duration;
    });
  } else if (!only && project.audioAsset && embeddedAssets[project.audioAsset]) {
    audio.push(`<audio id="hf-narration" data-start="0" data-duration="${seconds(totalDuration)}" data-track-index="200" data-volume="1" src="${h(embeddedAssets[project.audioAsset])}"></audio>`);
  }
  if (!only && project.musicAsset && embeddedAssets[project.musicAsset]) {
    audio.push(`<audio id="hf-music" data-start="0" data-duration="${seconds(totalDuration)}" data-track-index="210" data-volume="${clamp(number(project.musicVolume, .18), 0, .5).toFixed(2)}" loop src="${h(embeddedAssets[project.musicAsset])}"></audio>`);
  }
  const fontFace = project.fontAsset && embeddedAssets[project.fontAsset]
    ? `<style>@font-face{font-family:'MotionStudioLocal';src:url('${h(embeddedAssets[project.fontAsset])}') format('${project.fontAsset.toLowerCase().endsWith('.woff2') ? 'woff2' : project.fontAsset.toLowerCase().endsWith('.otf') ? 'opentype' : 'truetype'}');font-display:swap}</style>`
    : '';
  const compositionId = 'motion-studio-7';
  const gsap = gsapSource
    ? `<script>${gsapSource.replace(/<\/script/gi, '<\\/script')}</script>`
    : '<script src="./gsap.min.js"></script>';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(project.name)} — Motion Studio 7 / HyperFrames</title>
${fontFace}
<style>${BUNDLED_FONT_FACES.map(([family, file, weight, style]) => `@font-face{font-family:'${family}';src:url('${h(embeddedAssets[file] || '/' + file)}') format('woff2');font-weight:${weight};font-style:${style};font-display:block}`).join('')}</style>
<style>
${WORD_CAPTION_CSS}
[data-caption-mode="global"] .dvj-caption,[data-caption-mode="global"] .spoken-caption{display:none!important}
.ms-word-caption{font-size:${34*width/720}px}
.hf-custom-transition{position:absolute;inset:0;pointer-events:none;background:#000;opacity:0;z-index:800}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#080a10;overflow:hidden}
#stage{position:relative;width:${width}px;height:${height}px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;background:#080a10}
.hf-scene{position:absolute;inset:0;overflow:hidden;background:var(--bg);color:var(--ink);isolation:isolate}
.hf-scene:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 45%,#0002 100%);z-index:4}
.hf-overlay{background:linear-gradient(180deg,#0002,transparent 34%,transparent 62%,#0009);pointer-events:none}
.hf-video-wrap{position:absolute;inset:-1%;overflow:hidden;transform-origin:center center;will-change:transform}
.hf-video-wrap video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}
.hf-media{position:absolute;inset:0;overflow:hidden;background:var(--bg)}
.hf-media:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#0002,transparent 35%,transparent 60%,#0007)}
.hf-backdrop{position:absolute;width:116%;height:116%;inset:-8%;object-fit:cover;filter:blur(35px) brightness(.68);transform:scale(1.12)}
.hf-main{position:absolute;width:100%;height:100%;object-position:center;transform-origin:center center;will-change:transform}
.hf-lowerthird{position:absolute;bottom:12%;left:7%;max-width:86%;padding:20px 27px;border-left:8px solid var(--accent);border-radius:19px;background:#101a2acf;color:white;font:900 ${portrait ? 49 : 38}px/1.09 Arial,Helvetica,sans-serif;z-index:3;text-transform:uppercase;box-shadow:0 12px 36px #0005}
.scene-content{width:100%;height:100%;display:flex;flex-direction:column;gap:26px;position:relative;padding:${portrait ? '93px 57px 75px' : '67px 75px 54px'};z-index:2}
.kicker{font-size:${portrait ? 20 : 18}px;font-weight:900;letter-spacing:.12em;display:flex;gap:13px;align-items:center}
.kicker i{width:47px;height:8px;background:var(--accent);border-radius:4px}.kicker b{margin-left:auto;font-variant-numeric:tabular-nums}
.headline{display:flex;flex-wrap:wrap;align-content:flex-start;gap:.06em .19em;max-width:${portrait ? '96%' : '57%'};font-family:var(--font);font-size:${portrait ? 63 : 62}px;font-weight:900;line-height:1.03;letter-spacing:-.045em;z-index:2;margin-top:${portrait ? '62px' : '72px'}}
.word{display:inline-block}.subline{font-size:${portrait ? 25 : 24}px;line-height:1.22;font-weight:500;max-width:74%;z-index:2}
.art{width:${portrait ? '92%' : '42%'};height:${portrait ? '42%' : '78%'};position:absolute;${portrait ? 'left:4%;bottom:13%' : 'right:3%;top:9%'};z-index:1;transform-origin:center center}.hf-action-layer{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:2}.hf-action-layer .action-piece{fill:#ffffff12;stroke:var(--accent);stroke-width:7;opacity:.64}.hf-action-layer .action-path,.hf-action-layer .action-water{fill:none;stroke:var(--second);stroke-width:8;stroke-linecap:round;stroke-dasharray:700;stroke-dashoffset:700;opacity:.8}.hf-action-layer .action-marker{fill:var(--accent);stroke:#fff;stroke-width:4}.hf-action-layer .action-gate-left,.hf-action-layer .action-gate-right{fill:var(--accent);fill-opacity:.42;stroke:var(--accent);stroke-width:7;opacity:.7}
.figure{width:100%;height:100%;overflow:visible}.footer{display:flex;align-items:center;gap:16px;margin-top:auto;font-weight:900;font-size:20px;letter-spacing:.08em;z-index:3}.rule{flex:1;height:4px;background:var(--accent)}
 .hf-venice{background:#080F19!important}.hf-venice:after{background:radial-gradient(ellipse at 50% 58%,transparent 35%,#02060D88 100%)}.hf-venice .scene-content{padding:${portrait ? '7% 7% 4%' : '6% 6% 3%'};gap:0}.hf-venice .kicker{position:relative;z-index:4;font-size:${portrait ? 18 : 16}px;letter-spacing:.16em;color:#E7D3A8}.hf-venice .kicker i{width:32px;height:5px}.hf-venice .headline{position:relative;z-index:4;margin-top:${portrait ? '5%' : '4%'};max-width:92%;font-size:${portrait ? 58 : 49}px;line-height:1.02;text-shadow:0 4px 24px #02060D}.hf-venice .subline{position:relative;z-index:4;margin-top:10px;max-width:88%;font-size:${portrait ? 23 : 19}px;text-shadow:0 2px 14px #02060D}.hf-venice .art{left:-4%;bottom:-2%;width:108%;height:86%;z-index:1}.hf-venice .venice-figure{filter:drop-shadow(0 26px 46px #0008)}.hf-venice .footer{display:none}.hf-venice .hf-action-layer{display:none}
.hf-graphic{position:absolute;z-index:5;left:7%;bottom:9%;min-width:${portrait ? '56%' : '34%'};max-width:80%;padding:19px 23px;border:1px solid #ffffff35;border-radius:18px;background:#07111de8;color:#fff;box-shadow:0 16px 42px #0004;backdrop-filter:blur(12px)}
.hf-graphic-label{font-size:${portrait ? 17 : 15}px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ffffffb5;margin-bottom:7px}.hf-graphic-value{font-size:${portrait ? 42 : 36}px;line-height:1.05;font-weight:900;font-variant-numeric:tabular-nums}
.hf-progress{height:12px;background:#ffffff26;border-radius:20px;overflow:hidden;margin-top:13px}.hf-progress i{display:block;height:100%;background:var(--accent);border-radius:20px;transform-origin:left center}
.hf-graphic-donut,.hf-graphic-icon{display:flex;align-items:center;gap:17px}.hf-graphic-donut svg{width:84px;height:84px;flex:none;transform:rotate(-90deg)}.donut-track,.donut-value,.donut-segment{fill:none;stroke-width:12}.donut-track{stroke:#ffffff25}.donut-value,.donut-segment{stroke-linecap:round}.hf-donut-legend{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;font-size:12px;color:#ffffffc7}.hf-donut-legend span{display:flex;align-items:center;gap:5px}.hf-donut-legend i{width:8px;height:8px;border-radius:50%}.hf-graphic-icon>span{width:66px;height:66px;border-radius:18px;display:grid;place-items:center;background:var(--accent);color:#07111d;font-size:38px;font-weight:900}
.hf-caption{position:absolute;z-index:7;left:7%;right:7%;bottom:12%;text-align:center;pointer-events:none}.hf-caption-top{top:11%;bottom:auto}.hf-caption span{display:inline-block;padding:10px 18px;border-radius:12px;background:#050912d9;color:#fff;font-size:${portrait ? 30 : 24}px;font-weight:900;letter-spacing:-.02em;text-shadow:0 2px 8px #000}.hf-cue{position:absolute;z-index:6;right:8%;bottom:22%;width:118px;height:118px;display:grid;place-items:center;color:var(--accent)}.hf-cue>span{position:absolute;top:calc(100% + 8px);white-space:nowrap;font-size:18px;font-weight:800;color:var(--ink);text-shadow:0 2px 8px #0005}.cue-ring{width:82px;height:82px;border:8px solid var(--accent);border-radius:50%;box-shadow:0 0 0 12px #ffffff18}.cue-dot{width:58px;height:58px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 16px #ffffff20}.cue-square{width:66px;height:66px;border:8px solid var(--second);border-radius:14px;transform:rotate(12deg)}.cue-bars{height:70px;display:flex;align-items:center;gap:8px}.cue-bars b{display:block;width:12px;border-radius:10px;background:var(--accent)}.cue-bars b:nth-child(1){height:32px}.cue-bars b:nth-child(2){height:60px}.cue-bars b:nth-child(3){height:44px}.cue-bars b:nth-child(4){height:26px}
.hf-flash{position:absolute;inset:0;background:#fff;opacity:.9;z-index:9;pointer-events:none}
</style></head><body>
<main id="stage" data-composition-id="${compositionId}" data-start="0" data-width="${width}" data-height="${height}">
${clips.join('\n')}
${audio.join('\n')}
</main>
${gsap}
<script>
window.__motionStudioErrors=[];
window.addEventListener('error',e=>window.__motionStudioErrors.push(e.message));
const renderAuthored=${renderAuthored.toString()};
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:true});
${tweens.join('\n')}
tl.set({}, {}, ${seconds(totalDuration)});
window.__timelines['${compositionId}']=tl;
</script>
</body></html>`;
};

export const exportHyperframesScene = (project, scene, gsapSource = '', embeddedAssets = {}) =>
  exportHyperframesProject(project, scene, gsapSource, embeddedAssets);
