import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {type StudioProject, type StudioScene, type StyleName} from './studio-schema';
import {chooseConcept, identities, supportingLine, visualHeadline, type VisualConcept} from './semantic-director.mjs';
import {createVisualActionPlan, visualActionProgress, visualCameraOffset, type VisualActionPlan} from './visual-action-planner.mjs';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const emerge = (frame:number, start:number, duration:number) => interpolate(frame,
  [start, start + duration], [0, 1], {...clamp, easing:Easing.out(Easing.cubic)});

type Theme = (typeof identities)[string];
const speck = (cx:number, cy:number, radius:number, fill:string, key:number) =>
  <circle key={key} cx={cx} cy={cy} r={radius} fill={fill}/>;

// Objetos vectoriales animados de verdad, no un icono decorativo repetido.
const SemanticFigure:React.FC<{concept:VisualConcept; color:Theme; frame:number}> = ({concept,color,frame}) => {
  const wobble = Math.sin(frame / 11) * 5;
  const float = Math.sin(frame / 18) * 9;
  const grow = emerge(frame, 10, 18);
  const primary = color.accent;
  const secondary = color.secondary;
  const ink = color.ink;
  const dark = color.background;
  const common = {strokeLinecap:'round' as const, strokeLinejoin:'round' as const};
  if (concept.kind === 'venice') {
    const foundation = concept.detail === 'foundation';
    const timber = concept.detail === 'timber';
    const load = concept.detail === 'load';
    const tide = concept.detail === 'tide';
    const mose = concept.detail === 'mose';
    const wave = Math.sin(frame / 13) * 6;
    const glow = .56 + .18 * Math.sin(frame / 17);
    const skyline = <g stroke="#07121F" strokeWidth="7" strokeLinejoin="round" filter="url(#v-shadow)">
      <path d="M52 340V215L142 166L231 215V341Z" fill="url(#v-wall-warm)"/>
      <path d="M35 218L142 151L248 218Z" fill="url(#v-roof)"/>
      <path d="M252 340V195L349 137L444 195V342Z" fill="url(#v-wall-cool)"/>
      <path d="M234 198L349 123L462 198Z" fill="url(#v-roof)"/>
      <path d="M454 341V239L524 197L593 239V343Z" fill="url(#v-wall-warm)"/>
      <path d="M438 242L524 185L610 242Z" fill="url(#v-roof)"/>
      <path d="M321 140V70H374V157M309 72L348 32L388 72Z" fill="url(#v-roof)"/>
      {[90,141,192,293,348,402,493,544,578].map((x, i) => <g key={x}>
        <path d={`M${x-12} ${i<3?245:i<6?223:265}v40`} fill="none" stroke="#0B1723" strokeWidth="9"/>
        <path d={`M${x-12} ${i<3?245:i<6?223:265}a12 12 0 0 1 24 0`} fill="none" stroke="#F7D48C" strokeWidth="5"/>
        <rect x={x-5} y={i<3?250:i<6?228:270} width="10" height="31" rx="4" fill="#F4BA62" opacity={glow}/>
      </g>)}
    </g>;
    return <svg width="100%" height="100%" viewBox="0 0 620 620" preserveAspectRatio="none" aria-label="Esquema cinematográfico de Venecia y su sistema de cimentación">
      <defs>
        <linearGradient id="v-bg" x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="#10283D"/><stop offset=".58" stopColor="#101B2A"/><stop offset="1" stopColor="#07121E"/></linearGradient>
        <linearGradient id="v-water" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#38B8D0" stopOpacity=".88"/><stop offset="1" stopColor="#123B59"/></linearGradient>
        <linearGradient id="v-wall-warm" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#F0C681"/><stop offset=".48" stopColor="#B86A52"/><stop offset="1" stopColor="#603E43"/></linearGradient>
        <linearGradient id="v-wall-cool" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#DAE1DB"/><stop offset=".52" stopColor="#8396A5"/><stop offset="1" stopColor="#405064"/></linearGradient>
        <linearGradient id="v-roof" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#F2CA81"/><stop offset=".46" stopColor="#B47C4D"/><stop offset="1" stopColor="#583F42"/></linearGradient>
        <linearGradient id="v-pile" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#3B2527"/><stop offset=".34" stopColor="#D59754"/><stop offset=".56" stopColor="#8C583C"/><stop offset="1" stopColor="#30232A"/></linearGradient>
        <linearGradient id="v-soil" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#444B55"/><stop offset=".45" stopColor="#292F3B"/><stop offset="1" stopColor="#171F2C"/></linearGradient>
        <radialGradient id="v-light"><stop stopColor="#F4BF68" stopOpacity=".4"/><stop offset="1" stopColor="#F4BF68" stopOpacity="0"/></radialGradient>
        <pattern id="v-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#B8D6EA" strokeOpacity=".055" strokeWidth="1"/></pattern>
        <filter id="v-shadow" x="-.2" y="-.2" width="1.5" height="1.6"><feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#000" floodOpacity=".45"/></filter>
        <filter id="v-glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="620" height="620" rx="25" fill="url(#v-bg)"/>
      <rect width="620" height="620" rx="25" fill="url(#v-grid)"/>
      <ellipse cx="476" cy="132" rx="165" ry="155" fill="url(#v-light)"/>
      <circle cx="491" cy="112" r="37" fill="#F6D79A" opacity=".9"/>
      <path d="M0 574H620" stroke="#9ED9E5" strokeOpacity=".23" strokeWidth="2"/>
      {foundation ? <>
        {skyline}
        <path d="M0 344Q130 331 260 344T520 344T700 344V405H0Z" fill="url(#v-water)" opacity=".84"/>
        <path d="M0 399L620 399V620H0Z" fill="url(#v-soil)"/>
        <path d="M0 464Q150 440 310 464T620 464" fill="none" stroke="#8793A0" strokeWidth="3" strokeDasharray="4 11" opacity=".6"/>
        <path d="M0 532Q165 515 320 532T620 532" fill="none" stroke="#D9A75D" strokeWidth="4" opacity=".72"/>
        <path d="M38 340L582 340L548 369L72 369Z" fill="#D9D4C6" stroke="#101A26" strokeWidth="7" filter="url(#v-shadow)"/>
        <path d="M72 369L548 369L528 394L92 394Z" fill="#8E9BA4" stroke="#101A26" strokeWidth="6"/>
        {[112,184,256,328,400,472,520].map((x, i) => <g key={x} filter="url(#v-shadow)">
          <path d={`M${x-17} 391L${x-14} 530L${x} 559L${x+15} 530L${x+18} 391Z`} fill="url(#v-pile)" stroke="#E6BB7C" strokeWidth="2"/>
          <path d={`M${x-10} 405V517M${x+6} 402V523`} stroke="#F4D093" strokeOpacity=".58" strokeWidth="3"/>
          {i%2===0&&<path d={`M${x-11} 449H${x+10}M${x-10} 480H${x+11}`} stroke="#38272B" strokeWidth="4"/>}
        </g>)}
        <path d="M309 294V332" stroke="#F5C768" strokeWidth="7" markerEnd="url(#v-arrow)" filter="url(#v-glow)"/>
        

        

      </> : timber ? <>
         <path d="M0 268Q150 250 310 268T620 266V620H0Z" fill="url(#v-water)"/>
         <path d="M0 306H620V620H0Z" fill="url(#v-soil)"/>
         <path d={`M0 ${268+wave}Q150 ${250+wave} 310 ${268+wave}T620 ${266+wave}`} fill="none" stroke="#9CF1F0" strokeWidth="7"/>
         <path d="M0 442Q150 424 310 442T620 440M0 542Q150 524 310 542T620 540" fill="none" stroke="#D8A35F" strokeOpacity=".6" strokeWidth="4"/>
         <path d="M238 206L238 503Q238 527 310 548Q382 527 382 503V206Z" fill="url(#v-pile)" stroke="#F1C989" strokeWidth="5" filter="url(#v-shadow)"/>
         <ellipse cx="310" cy="207" rx="72" ry="29" fill="#D69A5A" stroke="#F4D39A" strokeWidth="5"/>
         {[18,34,50].map((r) => <ellipse key={r} cx="310" cy="207" rx={r*1.65} ry={r*.48} fill="none" stroke="#6F4333" strokeWidth="3" opacity=".9"/>)}
         <path d="M261 256V480M359 249V478" stroke="#F3D29A" strokeOpacity=".65" strokeWidth="5"/>
         <path d="M251 322H369M249 394H371" stroke="#37282D" strokeWidth="6"/>
         {[[116,172,17],[465,158,21],[492,247,12],[150,254,11]].map(([x,y,r],i)=><g key={i} opacity=".85"><circle cx={x} cy={y+Math.sin(frame/10+i)*4} r={r} fill="none" stroke="#BCECEF" strokeWidth="3"/></g>)}
         
         
         
         
         
       </> : load ? <>
         {skyline}
         <path d="M0 344Q130 331 260 344T520 344T700 344V406H0Z" fill="url(#v-water)" opacity=".82"/>
         <path d="M0 405H620V620H0Z" fill="url(#v-soil)"/>
         <path d="M0 464Q150 440 310 464T620 464" fill="none" stroke="#8A98A5" strokeWidth="4" strokeDasharray="8 8"/>
         <path d="M0 535Q150 520 310 535T620 535" fill="none" stroke="#D9A75D" strokeWidth="5"/>
         <path d="M34 340 586 340 544 375 76 375Z" fill="#DFD7C8" stroke="#101A26" strokeWidth="7"/>
         <path d="M76 375H544L520 399H100Z" fill="#768794" stroke="#101A26" strokeWidth="6"/>
         {[160,310,460].map((x,i)=><g key={x}>
           <path d={`M${x} 272V325`} stroke="#FFD070" strokeWidth="7" markerEnd="url(#v-arrow)" filter="url(#v-glow)"/>
           <path d={`M${x} 399V510`} stroke={i===1?'#FFD070':'#9ADAE2'} strokeWidth="8" strokeDasharray="12 8" markerEnd="url(#v-arrow)"/>
           <circle cx={x} cy="270" r="12" fill="#FFD070"/>
         </g>)}
         <path d="M160 510Q310 553 460 510" fill="none" stroke="#F2C66E" strokeWidth="5"/>
         
         
         
         
       </> : mose ? <>
        {skyline}
        <path d="M0 341Q150 324 310 343T620 338V620H0Z" fill="url(#v-water)"/>
        <path d={`M0 ${381+wave}Q155 ${354+wave} 310 ${381+wave}T620 ${381+wave}`} stroke="#9AEFFF" strokeWidth="6" fill="none" opacity=".86"/>
        {[98,218,338,458].map((x, i) => <g key={x} transform={`translate(${x} 0)`}>
          <path d="M0 470V395" stroke="#C6D7DE" strokeWidth="10"/>
          <path d="M-18 398L-11 373L13 368L31 391L22 414L-7 418Z" fill={i%2?'#E5B65F':'#59D6DE'} stroke="#0B1723" strokeWidth="6"/>
          <path d="M12 390Q35 418 42 458" stroke="#F5CE7F" strokeWidth="5" fill="none"/>
        </g>)}
        
        
      </> : tide ? <>
        {skyline}
        <path d="M0 341Q150 325 310 343T620 337V620H0Z" fill="url(#v-water)"/>
        <path d={`M0 ${374+wave}Q155 ${350+wave} 310 ${374+wave}T620 ${374+wave}`} stroke="#A6F4FF" strokeWidth="8" fill="none" filter="url(#v-glow)"/>
        <path d="M558 224V453" stroke="#E8D0A0" strokeWidth="6"/>
        {[0,1,2,3,4,5].map((i) => <g key={i}><path d={`M${542-(i%2)*10} ${250+i*32}H575`} stroke="#E8D0A0" strokeWidth="3"/></g>)}
        <path d="M534 371L566 371L550 396Z" fill="#FFCB72" filter="url(#v-glow)"/>
        
        
      </> : <>
        {skyline}
        <path d="M0 340Q150 326 310 341T620 337V620H0Z" fill="url(#v-water)"/>
        {[0,1,2,3,4,5,6,7].map((i) => <path key={i} d={`M${20+i*82} ${405+(i%3)*35+wave}q38 -14 76 0`} fill="none" stroke={i%2?'#93F1EA':'#F4CC83'} strokeOpacity=".75" strokeWidth="4"/>)}
        <path d="M132 405Q305 365 492 408L445 438H184Z" fill="#171C29" stroke="#F3D09A" strokeWidth="5" filter="url(#v-shadow)"/>
        <path d="M238 392L315 342L383 391Z" fill="#E8B96E" stroke="#101824" strokeWidth="5"/>
        <path d="M309 342V408" stroke="#F8E6C5" strokeWidth="5"/>
        
        
      </>}
      <defs><marker id="v-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#F5C768"/></marker></defs>
    </svg>;
  }
  if(concept.kind === 'immune') {
    const skin = concept.detail === 'skin';
    const hand = concept.detail === 'wash';
    return <svg width="100%" height="100%" viewBox="0 0 620 620" aria-label="Diagrama animado de las defensas del cuerpo">
      <circle cx="312" cy="304" r="257" fill={color.soft} opacity="0.76"/>
      <circle cx="312" cy="304" r="221" fill="none" stroke={secondary} strokeWidth="2" strokeDasharray="7 15" opacity="0.48"/>
      {skin ? <>
        <path d="M62 359 Q309 335 556 359 V542 H62Z" fill={secondary} opacity="0.20"/>
        {[0,1,2].map(row=><g key={row} transform={`translate(0 ${row*57})`}>
          {Array.from({length:5},(_,index)=><rect key={index} x={64+index*99+(row%2?-31:0)} y="363" width="94" height="53" rx="14" fill={row===0?primary:secondary} opacity={0.86-row*.13} stroke={dark} strokeWidth="3"/>)}
        </g>)}
        <path d="M68 350 Q305 322 552 350" fill="none" stroke={ink} strokeWidth="9" strokeLinecap="round"/>
      </> : hand ? <>
        <path d="M234 459 C192 421 197 388 214 376 C230 361 255 378 269 393 L269 261 Q268 229 290 225 Q315 223 319 255 V341 L325 243 Q326 217 348 220 Q370 222 370 245 V349 L385 278 Q392 254 414 260 Q437 270 424 306 L405 443 Q393 501 332 521 Q277 525 234 459Z" fill={primary} stroke={ink} strokeWidth="10" strokeLinejoin="round"/>
        {[[177,214,20],[415,154,27],[464,224,16],[208,299,11],[356,133,15]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y+float} r={r} stroke={secondary} strokeWidth="6" fill="none" opacity="0.8"/>)}
      </> : <>
        <path d="M311 142 L462 204 L446 361 Q415 459 311 511 Q200 461 176 362 L164 204Z" fill={secondary} opacity="0.23" stroke={secondary} strokeWidth="9"/>
        <path d="M312 176 L423 221 L412 354 Q384 430 311 476 Q233 434 213 353 L202 222Z" fill={secondary} stroke={ink} strokeWidth="8"/>
        <path d="m259 325 37 39 76-95" stroke={dark} strokeWidth="23" fill="none" {...common}/>
        <circle cx="308" cy="320" r="194" fill="none" stroke={secondary} strokeWidth="4" opacity="0.3"/>
      </>}
      {Array.from({length:5},(_,i)=>{
        const x=[134,456,460,168,383][i], y=[161,166,403,439,95][i];
        const s=i%2?0.78:1;
        return <g key={i} transform={`translate(${x+wobble*(i%2?-1:1)} ${y+float*(i%2?1:-1)}) scale(${s*grow})`}>
          <circle r="33" fill={i%2?primary:'#F79F70'} stroke={ink} strokeWidth="4"/>
          {Array.from({length:8},(_,j)=>{
            const a=j*Math.PI/4;return <path key={j} d={`M${37*Math.cos(a)} ${37*Math.sin(a)} l${12*Math.cos(a)} ${12*Math.sin(a)}`} stroke={ink} strokeWidth="6" strokeLinecap="round"/>;})}
          <circle cx="-10" cy="-5" r="3.5" fill={ink}/><circle cx="10" cy="-5" r="3.5" fill={ink}/>
          <path d="M-8 11 Q0 18 8 11" stroke={ink} strokeWidth="3" fill="none"/>
        </g>;
      })}
      {[[110,305,6],[513,291,8],[361,554,6]].map(([x,y,r],i)=>speck(x,y,r,secondary,i))}
    </svg>;
  }
  if (concept.kind === 'finance') {
    return <svg width="100%" height="100%" viewBox="0 0 620 620" aria-label="Infografía de finanzas con barras y monedas">
      <rect x="51" y="80" width="518" height="470" rx="30" fill={color.soft}/>
      <path d="M104 470 H530" stroke={ink} strokeWidth="5" opacity="0.6"/>
      {[{x:125,y:332,h:136},{x:265,y:249,h:219},{x:405,y:151,h:317}].map((bar,i)=><g key={bar.x}>
        <rect x={bar.x} y={bar.y+(1-grow)*bar.h} width="91" height={bar.h*grow} rx="14" fill={i===2?primary:secondary} opacity={0.73+i*.12}/>
        <rect x={bar.x+14} y={bar.y+18+(1-grow)*bar.h} width="60" height="8" rx="4" fill={dark} opacity="0.32"/>
      </g>)}
      <path d="m109 315 150-69 124-88 115-72" fill="none" stroke={primary} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${510*grow} 510`}/>
      <path d="m479 89 33-12-12 33" fill="none" stroke={primary} strokeWidth="11" {...common}/>
      <g transform={`translate(390 ${501+float*.4})`}><ellipse cx="85" cy="50" rx="88" ry="24" fill={secondary} opacity="0.2"/>{[0,1,2].map(i=><g key={i} transform={`translate(0 ${-i*17})`}><ellipse cx="85" cy="28" rx="67" ry="25" fill={primary} stroke={ink} strokeWidth="3"/><path d="M19 28 V43 C20 60 153 60 152 43 V28" fill={primary} stroke={ink} strokeWidth="3"/><ellipse cx="85" cy="28" rx="67" ry="25" fill="none" stroke={ink} strokeWidth="3"/></g>)}</g>
    </svg>;
  }
  if (concept.kind === 'horror') {
    return <svg width="100%" height="100%" viewBox="0 0 620 620" aria-label="Paisaje de terror con figura junto al agua">
      <circle cx="408" cy="161" r="81" fill={color.accent} opacity="0.86"/>
      <circle cx="435" cy="146" r="75" fill={dark}/>
      {[1,2,3,4].map((i)=><path key={i} d={`M0 ${443+i*39+float*.3} Q120 ${433+i*41} 250 ${443+i*39} T620 ${443+i*39}`} stroke={secondary} strokeWidth={i+2} opacity="0.4" fill="none"/>)}
      <path d="M0 445 Q170 412 295 447 T620 431 V620 H0Z" fill={secondary} opacity="0.16"/>
      <g transform={`translate(${float*.25} 0)`}>
        <ellipse cx="300" cy="265" rx="56" ry="80" fill={ink}/>
        <path d="M238 262 Q228 351 195 488 Q301 525 416 485 Q377 367 355 261Z" fill={ink}/>
        <path d="M246 226 Q219 297 236 384 M343 219 Q389 321 366 396" fill="none" stroke={ink} strokeWidth="40" strokeLinecap="round"/>
        <path d="M251 252 Q301 359 347 252" fill="none" stroke={dark} strokeWidth="22" opacity="0.7"/>
        <path d="M233 474 Q305 510 382 467" stroke={primary} strokeWidth="5" fill="none" opacity="0.8"/>
      </g>
      <path d="M0 542 Q320 500 620 542" stroke={ink} strokeWidth="4" fill="none" opacity="0.25"/>
    </svg>;
  }
  if (concept.kind === 'technology') {
    const points = [[310,93],[119,217],[493,218],[185,422],[405,444],[310,299]];
    const edges=[[0,1],[0,2],[1,3],[2,4],[3,5],[4,5],[5,0],[1,5],[2,5]];
    return <svg width="100%" height="100%" viewBox="0 0 620 620" aria-label="Red de tecnología animada">
      <rect x="48" y="44" width="524" height="526" rx="36" fill={color.soft}/>
      {edges.map(([a,b],i)=><line key={i} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} stroke={secondary} opacity="0.6" strokeWidth="5" strokeDasharray={`${grow*600} 600`}/>)}
      {points.map(([x,y],i)=><g key={i} transform={`translate(${x} ${y+Math.sin(frame/18+i)*5})`}>
        <circle r={i===5?61:32} fill={i===5?primary:dark} stroke={i===5?ink:secondary} strokeWidth="6"/>
        <circle r={i===5?22:9} fill={i===5?ink:secondary}/>
      </g>)}
      <path d="M88 88h75M88 103h44M448 520h84M479 536h53" stroke={primary} opacity="0.9" strokeWidth="5" {...common}/>
    </svg>;
  }
  if (concept.kind === 'nature') {
    return <svg width="100%" height="100%" viewBox="0 0 620 620" aria-label="Planeta y naturaleza en capas">
      <circle cx="435" cy="160" r="81" fill={primary}/>
      <circle cx="315" cy="327" r="243" fill={color.soft}/>
      <path d="m20 448 148-240 133 170 99-139 200 210v132H20Z" fill={secondary} opacity="0.62"/>
      <path d="m20 533 166-187 110 110 112-173 193 250v88H20Z" fill={primary} opacity="0.84"/>
      {Array.from({length:4},(_,i)=><g key={i} transform={`translate(${105+i*122} ${520+float*.2})`}><path d="m0 0 0-116" stroke={ink} strokeWidth="11"/><path d="M-41 -51 0 -145 41 -51Z" fill={ink}/><path d="M-30 -98 0 -174 30 -98Z" fill={ink}/></g>)}
      <path d="M0 577 Q310 545 620 577 V620 H0Z" fill={dark}/>
    </svg>;
  }
  if (concept.kind === 'learning') {
    return <svg width="100%" height="100%" viewBox="0 0 620 620" aria-label="Libro abierto y aprendizaje">
      <circle cx="311" cy="320" r="257" fill={color.soft}/>
      <path d="M311 203 Q185 147 88 217 V455 Q207 400 311 466 Q416 401 532 455 V217 Q432 146 311 203Z" fill={primary} stroke={ink} strokeWidth="9" {...common}/>
      <path d="M311 205 V463 M129 258 Q210 229 273 269 M129 313 Q210 287 273 325 M351 268 Q425 222 485 260 M351 327 Q420 284 486 317" stroke={ink} strokeWidth="9" fill="none" {...common}/>
      <g transform={`translate(311 ${101+float})`}><path d="M0 -34 9 -9 34 0 9 9 0 34-9 9-34 0-9-9Z" fill={secondary}/></g>
    </svg>;
  }
  return <svg width="100%" height="100%" viewBox="0 0 620 620" aria-label="Ideas conectadas en movimiento">
    <rect x="49" y="78" width="524" height="455" rx="39" fill={color.soft}/>
    <g transform={`translate(${float*.2} ${float*.3})`}>
      <path d="M95 419 276 177 383 310 507 169" fill="none" stroke={primary} strokeWidth="29" {...common}/>
      <circle cx="95" cy="419" r="43" fill={secondary}/><circle cx="276" cy="177" r="51" fill={primary}/>
      <circle cx="383" cy="310" r="35" fill={secondary}/><circle cx="507" cy="169" r="48" fill={primary}/>
    </g>
    <rect x="104" y="484" width="279" height="12" rx="6" fill={ink} opacity="0.65"/>
  </svg>;
};

const ActionMotionLayer:React.FC<{plan:VisualActionPlan; progress:number; color:Theme}> = ({plan,progress,color}) => {
  const p = Math.max(0, Math.min(1, progress));
  const ink = color.accent;
  const common = {fill:'none' as const, stroke:ink, strokeWidth:8, strokeLinecap:'round' as const, strokeLinejoin:'round' as const, opacity:.68};
  return <svg aria-hidden="true" viewBox="0 0 620 620" preserveAspectRatio="none"
    style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
    {plan.actionType === 'construct' && <g fill={ink} opacity=".42">
      {[0,1,2,3].map((i)=><rect key={i} x={115+i*112} y={475-(70+110*p)*(0.68+i*.1)} width="34" height={(70+110*p)*(0.68+i*.1)} rx="9"/>)}
    </g>}
    {plan.actionType === 'install' && <g {...common}>
      <path d={`M120 ${170+180*(1-p)} L500 ${170+180*(1-p)}`} strokeWidth="26" opacity=".36"/>
      <path d="M120 375H500" strokeDasharray="12 18" opacity=".75"/>
    </g>}
    {plan.actionType === 'inspect' && <g {...common}>
      <circle cx="310" cy="310" r={35+105*p} opacity={.72*(1-p)}/>
      <circle cx="310" cy="310" r="19" fill={ink} stroke="none" opacity=".55"/>
    </g>}
    {plan.actionType === 'transfer' && <g {...common}>
      <path d={`M120 180 C230 ${180+40*Math.sin(p*Math.PI)} 390 ${440-30*Math.sin(p*Math.PI)} 500 475`} strokeDasharray="22 16" strokeDashoffset={`${(1-p)*230}`}/>
      <path d={`M${485-16*p} ${459+16*p} l24 16 -24 16`} />
    </g>}
    {plan.actionType === 'compare' && <g {...common}>
      <path d={`M310 100V${100+420*p}`} strokeDasharray="14 12"/>
      <path d="M110 480h135M375 480h135" opacity=".5"/>
    </g>}
    {plan.actionType === 'rise' && <g {...common}>
      <path d={`M55 ${480-190*p} Q150 ${460-190*p} 245 ${480-190*p} T435 ${480-190*p} T620 ${480-190*p}`} strokeWidth="12" opacity=".75"/>
      <path d={`M80 ${518-190*p} Q180 ${500-190*p} 280 ${518-190*p} T480 ${518-190*p}`} strokeWidth="4" opacity=".5"/>
    </g>}
    {plan.actionType === 'close' && <g {...common}>
      <rect x={100+110*p} y="150" width="90" height="330" rx="12" fill={ink} opacity=".28" stroke="none"/>
      <rect x={430-110*p} y="150" width="90" height="330" rx="12" fill={ink} opacity=".28" stroke="none"/>
      <path d="M310 145V490" strokeDasharray="10 18" opacity=".45"/>
    </g>}
    {plan.actionType === 'follow' && <g {...common}>
      <path d="M60 350 C180 150 420 470 560 250" strokeDasharray="10 16" opacity=".58"/>
      <circle cx={60+500*p} cy={350-85*Math.sin(2*Math.PI*p)} r="17" fill={ink} stroke="none"/>
    </g>}
    {plan.actionType === 'descend' && <g {...common}>
      <path d="M310 90V520" strokeDasharray="14 16" opacity=".5"/>
      <circle cx="310" cy={90+430*p} r="20" fill={ink} stroke="none"/>
    </g>}
    {['establish','resolve','reveal'].includes(plan.actionType) && <g {...common}>
      <circle cx="310" cy="310" r={90+125*p} opacity={.55*(1-p*.45)}/>
      <path d={`M${125-30*p} 170h95M125 170v95M${495+30*p} 170h-95M495 170v95M125 450h95M125 450v-95M495 450h-95M495 450v-95`}/>
    </g>}
  </svg>;
};

export const AdaptiveScene:React.FC<{scene:StudioScene; project:StudioProject;
  style:StyleName; sceneNumber:number; showText:boolean}> = ({scene,project,style,sceneNumber,showText}) => {
  const frame = useCurrentFrame();
  const {width,height} = useVideoConfig();
  const portrait = height > width;
  const concept = chooseConcept(scene,project);
  const plan = scene.visualActionPlan ?? createVisualActionPlan(scene, project, sceneNumber - 1);
  const color:Theme = identities[style] ?? identities.modern;
  const title = visualHeadline(scene.title,portrait?9:12);
  const subtitle = supportingLine(scene);
  const words = title.split(/\s+/).filter(Boolean);
  const pad = portrait?width*0.078:width*0.062;
  const unit = portrait?width:height;
  const headSize = Math.round(Math.max(portrait?49:42,Math.min(portrait?77:70,
    (portrait?76:65)-(Math.max(0,words.length-5)*4))));
  const inArt = emerge(frame,5,24);
  const end = Math.max(1, Math.round(scene.duration * useVideoConfig().fps));
  const progress = Math.max(0, Math.min(1, frame / Math.max(1, end - 1)));
  const actionProgress = visualActionProgress(plan, progress);
  const camera = visualCameraOffset(plan, progress, scene.motionStrength ?? 40);
  const shotScale = plan.shotScale === 'close' ? 1.1 : plan.shotScale === 'wide' ? .9 : 1;
  const artScale = (.88 + .12 * inArt) * shotScale * (1 - camera.z);
  const artX = -camera.x * width * .85;
  const artY = -camera.y * height * .85;
  const count = String(sceneNumber).padStart(2,'0');
  const pale = color.soft;
  return <AbsoluteFill style={{background:color.background,color:color.ink,
    overflow:'hidden',fontFamily:'Arial, Helvetica, sans-serif'}}>
    <AbsoluteFill style={{background:`radial-gradient(circle at ${sceneNumber%2?80:20}% 63%, ${pale}DD, transparent 62%)`}}/>
    {showText && <div style={{position:'absolute',right:-width*0.19,top:portrait?height*.12:height*.09,
      fontSize:Math.round(unit*.7),fontWeight:900,letterSpacing:'-0.1em',lineHeight:1,
      color:color.secondary,opacity:.095,fontFamily:color.display}}>{count}</div>}
    {showText && <div style={{position:'absolute',left:pad,right:pad,top:portrait?height*.076:height*.087,
      display:'flex',alignItems:'center',gap:15,fontSize:portrait?20:18,fontWeight:800,
      letterSpacing:'0.13em',opacity:emerge(frame,1,10)}}>
      <div style={{width:45,height:8,background:color.accent,borderRadius:8}}/>
      <span>{concept.label}</span><span style={{marginLeft:'auto',fontVariantNumeric:'tabular-nums'}}>{count}</span>
    </div>}
    {showText && <div style={{position:'absolute',left:pad,right:pad,top:portrait?height*.172:height*.27,zIndex:2}}>
      <div style={{fontFamily:color.display,fontWeight:900,fontSize:headSize,
        lineHeight:1.025,letterSpacing:'-0.045em',display:'flex',flexWrap:'wrap',
        alignItems:'baseline',gap:'0.04em 0.19em',maxWidth:portrait?width*.87:width*.57}}>
        {words.map((word,index)=>{
          const enter = emerge(frame,4+index*3,11);
          return <span key={`${word}-${index}`} style={{display:'inline-block',
            color:index===words.length-1?color.accent:color.ink,
            opacity:enter,transform:`translateY(${(1-enter)*39}px)`,
          }}>{word}</span>;
        })}
      </div>
      {subtitle && <div style={{maxWidth:portrait?'90%':'63%',fontSize:portrait?25:23,
        fontWeight:500,lineHeight:1.24,marginTop:23,opacity:emerge(frame,26,14)}}>{subtitle}</div>}
    </div>}
    <div data-visual-action={plan.actionType} style={{position:'absolute',left:portrait?(concept.kind==='venice'?0:width*.05):width*.55,
      top:portrait?(showText?height*.425:concept.kind==='venice'?height*.19:height*.20):height*.065,
      width:portrait?(showText?width*.9:concept.kind==='venice'?width:width*.9):width*.43,
      height:portrait?(showText?height*.45:concept.kind==='venice'?height*.77:height*.60):height*.82,opacity:inArt,
      transform:`translate3d(${artX}px,${artY+(1-inArt)*55}px,0) scale(${artScale})`}}>
      <SemanticFigure concept={concept} color={color} frame={frame}/>
      <ActionMotionLayer plan={plan} progress={actionProgress} color={color}/>
    </div>
    {showText && <div style={{position:'absolute',left:pad,right:pad,bottom:portrait?height*.077:height*.075,
      display:'flex',alignItems:'center',gap:18,opacity:.85}}>
      <span style={{fontSize:portrait?18:16,fontWeight:800,letterSpacing:'0.11em'}}>{project.name.slice(0,25).toUpperCase()}</span>
      <div style={{flex:1,height:5,background:color.soft,borderRadius:8,overflow:'hidden'}}>
        <div style={{width:`${Math.min(100,100*frame/Math.max(1,end-1))}%`,height:'100%',background:color.accent}}/>
      </div>
      <span style={{fontSize:portrait?18:16,fontWeight:800}}>{Math.max(1,Math.ceil(scene.duration))}s</span>
    </div>}
  </AbsoluteFill>;
};
