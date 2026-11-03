// Motor semántico puro: la misma decisión visual sirve a Remotion y HyperFrames.
// No depende de una API, del reloj ni de aleatoriedad.
export const identities = {
  modern: {background:'#F5F0E6', ink:'#181C23', accent:'#E84B33', secondary:'#3159C9', soft:'#E6DED1', display:'Arial Black, Impact, sans-serif'},
  playful: {background:'#FFF4D9', ink:'#213A49', accent:'#D94834', secondary:'#24AB9B', soft:'#FFE4A7', display:'Arial Black, Impact, sans-serif'},
  watercolor: {background:'#F9EFDE', ink:'#3A4439', accent:'#D3734B', secondary:'#5D9C85', soft:'#E8D5B8', display:'Georgia, serif'},
  documentary: {background:'#EEE9DF', ink:'#20272B', accent:'#BF3F2F', secondary:'#566B80', soft:'#DCD7CB', display:'Georgia, serif'},
  cinematic: {background:'#101820', ink:'#F9F4E8', accent:'#E3BA6A', secondary:'#83A6BA', soft:'#283742', display:'Georgia, serif'},
  horror: {background:'#120F13', ink:'#F9EDEA', accent:'#DC3941', secondary:'#B9B3A8', soft:'#291C23', display:'Georgia, serif'},
  tech: {background:'#071B25', ink:'#F3F6F1', accent:'#57DECE', secondary:'#9A99F2', soft:'#163743', display:'Arial Black, Impact, sans-serif'},
  minimal: {background:'#F6F3EB', ink:'#232320', accent:'#CC432E', secondary:'#96917D', soft:'#E7E2D9', display:'Georgia, serif'},
  energetic: {background:'#21151D', ink:'#FFF8EC', accent:'#FFCC54', secondary:'#EF5D61', soft:'#412630', display:'Arial Black, Impact, sans-serif'},
};

export const chooseConcept = (scene, project = {}) => {
  const raw = `${scene.visualQuery || ''} ${scene.scriptExcerpt || ''} ${scene.title || ''} ${scene.subtitle || ''}`.toLowerCase();
  const global = `${project.name || ''} ${project.script || ''}`.toLowerCase();
  const topic = raw || global;
  const matches = (regex) => regex.test(topic);
  const isVeniceProject = /venecia|venezia|venice/.test(String(project.name || '').toLowerCase());
  if (matches(/bacter|microb|g[eé]rmen|virus|inmun|defensa|piel|skin|white blood|leucoc|lavar las manos|cuerpo human|nasal mucus|antibod|anticuerpo/)) {
    return {kind:'immune', detail: matches(/piel|skin|barrera|barrier/) ? 'skin' : matches(/lavar|lavado|jab[oó]n|wash|soap/) ? 'wash' : matches(/gl[oó]bulo|leucoc|white blood|defens|soldad|superh[eé]ro/) ? 'defense' : 'cells', label:'CIENCIA EN MOVIMIENTO'};
  }
  if (matches(/finanz|dinero|presupuesto|ahorr|deuda|ingreso|gasto|inversi[oó]n|money|budget|savings|bank|price|d[oó]lar|ventas/)) {
    return {kind:'finance', detail: matches(/ahorr|savings/) ? 'save' : matches(/deuda|debt/) ? 'debt' : 'budget', label:'EL DINERO EXPLICADO'};
  }
  if (isVeniceProject || matches(/venecia|venezia|venice|laguna veneciana|acqua alta|palafit|pilotes de madera|cimientos de venecia|barrera mose|mose venice/)) {
    return {kind:'venice', detail: matches(/equilibrio|depende de|protecci[oó]n constante/) ? 'city' :
      matches(/cargas?|capas|subsuelo|distribu/) ? 'load' :
      matches(/cimiento|plataforma|peso|soporte|suelo firme|barro|fango/) ? 'foundation' :
      matches(/pilote|madera/) && matches(/clavad|hinc|madera/) ? 'timber' :
      matches(/mose|barrera|compuerta/) ? 'mose' :
      matches(/marea|acqua alta|inund|sube el mar/) ? 'tide' :
      matches(/equilibrio|protecci[oó]n constante/) ? 'city' :
      matches(/ox[ií]geno|descompone|sumergid/) || (matches(/madera/) && !matches(/hinc|\bclavad[oa]s?\b|\bclav(?:aron|an|ar|ó|o)\b|instal/)) ? 'timber' :
      matches(/laguna|agua|islas/) ? 'lagoon' : 'city', label:'VENECIA POR DENTRO'};
  }
  if (matches(/llorona|fantasma|espectro|horror|terror|miedo|noche|\br[ií]o\b|sombra|haunted|ghost|p[aá]nico/)) {
    return {kind:'horror', detail: matches(/\br[ií]o\b|water|agua/) ? 'river' : 'shadow', label:'RELATO / CAPÍTULO'};
  }
  if (matches(/programaci[oó]n|software|robot|inteligencia artificial|tecnolog|algoritm|c[oó]digo|red digital|computer|data|network/)) {
    return {kind:'technology', detail:'network', label:'TECNOLOGÍA VISUAL'};
  }
  if (matches(/bosque|tierra|planeta|naturaleza|[aá]rbol|medio ambiente|monta[nñ]a|waterfall|forest|earth|clima/)) {
    return {kind:'nature', detail:'planet', label:'EXPLORA EL MUNDO'};
  }
  if (matches(/historia|libro|escuela|aprender|educaci[oó]n|ense[nñ]|study|learn/)) {
    return {kind:'learning', detail:'book', label:'IDEAS PARA APRENDER'};
  }
  if (/horror/.test(scene.style || project.style || '')) return {kind:'horror', detail:'shadow',label:'RELATO / CAPÍTULO'};
  if (/tech/.test(scene.style || project.style || '')) return {kind:'technology',detail:'network',label:'TECNOLOGÍA VISUAL'};
  return {kind:'ideas', detail:'connections', label:'IDEAS EN MOVIMIENTO'};
};

// Un titular es una idea visual, no una transcripción completa.
export const visualHeadline = (text, limit = 9) => {
  const clean = String(text || '').replace(/\(\d{1,2}:\d{2}\)/g, '').replace(/\s+/g, ' ').trim();
  const first = clean.split(/(?<=[.!?;:])\s+/)[0] || clean;
  const words = first.split(/\s+/).filter(Boolean);
  const result = words.slice(0, limit).join(' ').replace(/[,:;.!?]+$/, '');
  return result || 'UNA IDEA QUE COBRA VIDA';
};

export const supportingLine = (scene) => {
  const sub = String(scene.subtitle || '').trim();
  const title = String(scene.title || '').trim();
  if (!sub || sub.toLowerCase() === title.toLowerCase() || title.toLowerCase().includes(sub.toLowerCase())) return '';
  return visualHeadline(sub, 12);
};
