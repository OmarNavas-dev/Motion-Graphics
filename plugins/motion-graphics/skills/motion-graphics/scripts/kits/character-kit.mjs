// A bounded adult, three-quarter illustration family, not a universal character solver.
const safe = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCharacterCast(definitions){
  if(!Array.isArray(definitions)||!definitions.length)throw Error('Define the cast before drawing scenes.');
  const designs=new Map(),actors=[];
  for(const definition of definitions){
    const {name,initialState,...design}=definition;
    if(!/^[A-Za-z][\w-]*$/.test(design.id||'')||designs.has(design.id))throw Error('Invalid or duplicate character ID.');
    const config=Object.freeze(structuredClone(design));
    renderAdult(config);
    designs.set(config.id,config);
    actors.push({id:config.id,name:name||config.id,appearance:JSON.stringify(config),parts:['head','neck','torso','leftUpperArm','leftForearm','leftHand','rightUpperArm','rightForearm','rightHand','legs'],initialState:initialState||'standing at rest'});
  }
  return {
    actors,
    place(scene,id,pose,placement){
      const config=designs.get(id);if(!config)throw Error('Character not registered: '+id);
      return addAdult(scene,config,pose,placement);
    },
  };
}

// Cropped hand holding a sheet. Put back + prop + front under the same motion
// parent; the forearm deliberately enters from outside the right of the frame.
export function renderSheetGrip({x=0,y=0,skin='#d6a17e',shadow='#a16d51',layer='all'}={}){
 if(![x,y].every(Number.isFinite)||![skin,shadow].every(c=>/^#[0-9a-f]{6}$/i.test(c)))throw Error('Invalid hand grip.');
 const back=`<path d="M4-24L420-390L474-335L24 16Z" fill="${skin}"/><path d="M14-20L433-367" fill="none" stroke="#f4c3a0" stroke-width="7" opacity=".35"/><path d="M-20-25Q-4-39 17-30Q37-24 39-5L28 23Q12 34-8 15L-24-3Z" fill="${skin}"/>`;
 const front=`<path d="M-23 3Q-16-4-8 2L-3 13Q-2 22-9 23Q-15 22-18 14Z M-10-1Q-3-7 4 0L9 14Q10 24 2 25Q-4 23-6 15Z M4-1Q11-5 16 1L20 13Q22 23 15 23Q9 21 7 14Z M18 2Q24-2 29 5L31 13Q32 21 26 20L23 16Z" fill="${skin}" stroke="${shadow}" stroke-width="1.2"/><path d="M32-6Q20-13 15-8Q11-3 18 3L34 13Q44 11 41 2Z" fill="${skin}" stroke="${shadow}" stroke-width="1.2"/><path d="M-13 10L-6 9M0 11L7 10M13 11L18 10" stroke="#f2c5a5" stroke-width="2" stroke-linecap="round"/>`;
 return `<g transform="translate(${x} ${y})" data-sheet-grip="${layer}">${layer==='front'?front:layer==='back'?back:back+front}</g>`;
}

// Index points down to (-20,74), with the remaining fingers curled into the palm.
export function renderPressHand({skin='#d6a17e',shadow='#a16d51'}={}){
 if(![skin,shadow].every(c=>/^#[0-9a-f]{6}$/i.test(c)))throw Error('Invalid hand palette.');
 return `<g data-press-hand="index"><path d="M5-66L295-380L335-340L42-26Z" fill="${skin}"/><path d="M14-60L304-365" fill="none" stroke="#f4c3a0" stroke-width="6" opacity=".4"/><path d="M-25-42Q-7-64 17-55Q43-48 45-20L39 9Q32 25 18 25L-6 14L-10 63Q-13 79-25 75Q-33 73-32 61L-32-8Q-43-2-48-13Q-54-23-42-35Z" fill="${skin}" stroke="${shadow}" stroke-width="1.5"/><path d="M-5-13Q-11 4 1 12Q13 19 17 6L16-12M11-17Q6-1 19 7Q29 11 31-1L30-20M27-24Q23-9 34-5Q45-2 44-19M-39-29Q-29-33-19-20" fill="none" stroke="${shadow}" stroke-width="2.5" stroke-linecap="round"/><path d="M-27 57Q-21 53-15 57L-16 68Q-21 73-27 68Z" fill="#f4c8b2"/><path d="M-27 40L-15 40" stroke="${shadow}" stroke-width="1.4"/></g>`;
}
export function solveArm(shoulder, wrist, upper=74, lower=70, bend=1) {
  if(![...shoulder,...wrist,upper,lower,bend].every(Number.isFinite)||upper<=0||lower<=0||Math.abs(bend)!==1)throw Error('Invalid arm dimensions.');
  const dx=wrist[0]-shoulder[0],dy=wrist[1]-shoulder[1],d=Math.hypot(dx,dy);
  if(d>upper+lower-0.01||d<Math.abs(upper-lower)+0.01)throw Error('Unreachable wrist: change the pose or body placement.');
  const along=(upper*upper-lower*lower+d*d)/(2*d),across=Math.sqrt(Math.max(0,upper*upper-along*along))*bend;
  return {shoulder,elbow:[shoulder[0]+along*dx/d-across*dy/d,shoulder[1]+along*dy/d+across*dx/d],wrist};
}

export function characterPoseAt(poses,time){
  let a=poses[0],b=a;
  for(let i=1;i<poses.length;i++){b=poses[i];if(time<=b.at)break;a=b;}
  const u=a===b?0:Math.max(0,Math.min(1,(time-a.at)/(b.at-a.at))),e=u*u*(3-2*u);
  const p={...(u===1?b:a)};
  for(const k of ['left','right'])p[k]=a[k].map((v,i)=>v+(b[k][i]-v)*e);
  for(const k of ['headTilt','leftAngle','rightAngle'])p[k]=(a[k]||0)+((b[k]||0)-(a[k]||0))*e;
  return p;
}

// Self-contained: also embedded in the scene script so the exported JSON has no imports.
export function renderAdult(config={}, pose={}) {
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const color=(v,f)=>typeof v==='string'&&/^#[0-9a-f]{3,8}$/i.test(v)?v:f;
  const skin=color(config.skin,'#c28a68'),light=color(config.skinLight,'#e5b38b'),hair=color(config.hair,'#3e302b'),shirt=color(config.shirt,'#526f7c'),pants=color(config.pants,'#39434b');
  const face=config.face==='long'?'long':'round', faceWidth=face==='long'?28:33;
  const id=/^[A-Za-z][\w-]*$/.test(config.id||'')?config.id:'adult';
  const path=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
  const solve=(s,w,bend)=>{
    const dx=w[0]-s[0],dy=w[1]-s[1],d=Math.hypot(dx,dy),u=74,l=70;
    if(!Number.isFinite(d)||d>u+l-.01||d<Math.abs(u-l)+.01)throw Error('Unreachable wrist for '+id);
    const a=(u*u-l*l+d*d)/(2*d),h=Math.sqrt(Math.max(0,u*u-a*a))*bend;
    return [s[0]+a*dx/d-h*dy/d,s[1]+a*dy/d+h*dx/d];
  };
  const hand=(w,side,grip)=>{
    const angle=Number(pose[side+'Angle']??(side==='left'?10:-10));
    if(!Number.isFinite(angle))throw Error('Invalid hand angle.');
    return `<g data-character-hand="${side}" transform="translate(${w.join(' ')}) rotate(${angle})">`+
      path('M-8-7Q-12 3-7 17Q-3 26 7 23L14 17L12-3Z',light)+
      (grip?path('M-7 5Q-19-1-18 5L-10 16M1 3L14 4M0 9L14 10M0 15L12 16','none','stroke="'+skin+'" stroke-width="4" stroke-linecap="round"'):
        path('M-6 13L-9 31M0 16L0 35M6 16L8 33M11 12L15 27M-7 4L-20 14','none','stroke="'+light+'" stroke-width="6" stroke-linecap="round"'))+
      (grip&&pose[side+'Held']?`<g data-character-held="${side}" transform="translate(4 9)">${pose[side+'Held']}</g>`:'')+'</g>';
  };
  const arm=(side,far)=>{
    const left=side==='left',s=[left?-56:56,-136],w=pose[side]||(left?[-87,-12]:[87,-12]);
    const e=solve(s,w,left?1:-1),stroke=`stroke="${shirt}" stroke-linecap="round" stroke-linejoin="round"`;
    return `<g data-character-arm="${side}"${far?' opacity=".88"':''}>`+
      path(`M${s}L${e}L${w}`,'none',stroke+' stroke-width="32"')+
      path(`M${s[0]-5} ${s[1]+2}L${e[0]-5} ${e[1]}`,'none','stroke="#ffffff" stroke-opacity=".12" stroke-width="4"')+
      `<circle data-character-elbow="${side}" cx="${e[0]}" cy="${e[1]}" r="9" fill="${shirt}"/>`+
      hand(w,side,!!pose[side+'Grip'])+'</g>';
  };
  const headTilt=Number(pose.headTilt||0);
  if(!Number.isFinite(headTilt))throw Error('Invalid head tilt.');
  const legs=path('M-48 14L-43 130L-48 241L-10 241L2 130L12 42L22 131L26 241L64 241L57 122L47 13Z',pants)+
    path('M-49 229L-11 229L-8 249L-63 249Q-68 238-49 229M26 229L63 229L79 244Q79 251 65 251H25Z','#283036')+
    path('M8 41L1 129M-23 77L-24 194M43 75L45 190','none','stroke="#ffffff" stroke-opacity=".08" stroke-width="3"');
  const body=path('M-10-174H13L17-141L-18-139Z',skin)+
    path('M-51-151Q-28-160-17-153L0-141L18-154Q41-160 57-146L64-80L49 27Q0 40-50 26L-65-80Z',shirt)+
    path('M-18-151L-2-137L-16-116L-29-148M18-151L-2-137L13-117L31-147','#d5d9ce')+
    path('M-3-134L-3 24M-43 12Q0 22 48 12','none','stroke="#162f39" stroke-opacity=".4" stroke-width="2"')+
    path('M18-87H44V-61H18Z','none','stroke="#e7e6d7" stroke-opacity=".3" stroke-width="2"')+
    [-101,-70,-38,-6].map(y=>`<circle cx="2" cy="${y}" r="2" fill="#e4d9c5"/>`).join('');
  const head=`<g transform="rotate(${headTilt} 0 -174)">`+
    `<ellipse cx="0" cy="-211" rx="${faceWidth}" ry="43" fill="${skin}"/>`+
    path(`M-19-243Q8-257 ${faceWidth-2}-231L${faceWidth-1}-205L${faceWidth+6}-196L${faceWidth-2}-191Q22-173 5-174Q-17-175-20-198Z`,light)+
    `<ellipse cx="-25" cy="-207" rx="9" ry="13" fill="${light}"/>`+
    path('M-27-213Q-19-215-22-203','none',`stroke="${skin}" stroke-width="2"`)+
    path(config.hairStyle==='receding'?'M-29-212Q-40-240-18-251L-8-242Q-26-238-22-214ZM14-250Q34-248 32-226L24-232Z':'M-30-209Q-43-240-21-255Q4-273 28-252L36-231Q10-237-2-246Q-10-223-25-225L-26-206Z',hair)+
    path('M4-219Q12-224 19-218','none',`stroke="${hair}" stroke-width="3" stroke-linecap="round"`)+
    '<ellipse cx="13" cy="-212" rx="4" ry="3" fill="#faf3df"/><circle cx="15" cy="-212" r="2.3" fill="#292e31"/>'+
    path('M22-211L26-199L19-197M11-187Q19-183 25-189','none',`stroke="${skin}" stroke-width="2" stroke-linecap="round"`)+
    (config.glasses?'<path d="M2-217H23V-206H2ZM-21-214L2-212" fill="none" stroke="#39454a" stroke-width="2.5"/>':'')+'</g>';
  return `<g data-character-id="${esc(id)}">${legs}${arm('left',true)}${body}${head}${arm('right',false)}</g>`;
}

export function addAdult(scene, config, pose, {x=360,y=800,scale=1,facing=1,layer='fg'}={}) {
  if(!/^[A-Za-z][\w-]*$/.test(config.id||''))throw Error('A stable character ID is required.');
  if(![x,y,scale,facing].every(Number.isFinite)||scale<=0||Math.abs(facing)!==1)throw Error('Invalid character placement.');
  scene._characterIds??=new Set();
  if(scene._characterIds.has(config.id))throw Error('Duplicate character instance: '+config.id);
  scene._characterIds.add(config.id);
  scene.use('characters');
  scene.add(layer,`<g transform="translate(${x} ${y}) scale(${scale*facing} ${scale})"><g class="${safe(config.id)}-body">${renderAdult(config,pose)}</g></g>`);
  return {config,pose,x,y,scale,facing};
}

export function animateAdult(scene, actor, poses) {
  if(!Array.isArray(poses)||poses.length<2)throw Error('At least two poses are required.');
  if(poses[0].at!==0)throw Error('The first pose must start at zero.');
  let previous=-1;
  for(const p of poses){if(!Number.isFinite(p.at)||p.at<0||p.at<=previous||p.at>scene.duration)throw Error('Invalid pose clock.');if(!['left','right'].every(k=>Array.isArray(p[k])&&p[k].length===2&&p[k].every(Number.isFinite)))throw Error('Specify both wrist positions in each pose.');renderAdult(actor.config,p);previous=p.at;}
  scene.touch(previous);
  const source=`{const draw=${renderAdult.toString()},sample=${characterPoseAt.toString()},config=${JSON.stringify(actor.config)},poses=${JSON.stringify(poses)},clock={t:0};const target=document.querySelector(S+${JSON.stringify(' .'+actor.config.id+'-body')});if(!target)throw Error('Missing character body');const update=()=>{target.innerHTML=draw(config,sample(poses,clock.t));};update();tl.fromTo(clock,{t:0},{t:D,duration:D,ease:'none',onUpdate:update,immediateRender:false},T0);}`;
  scene.js(source);
}
