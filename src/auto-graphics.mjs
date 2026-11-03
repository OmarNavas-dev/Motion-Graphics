// Deterministic, offline visual suggestions. No generative API or audio upload.
// Each proposal is editable and remains pending approval in the storyboard.
const wordNumbers = new Map([
  ['quinientos', 500], ['trescientos', 300], ['doscientos', 200],
  ['novecientos', 900], ['ochocientos', 800], ['setecientos', 700],
  ['seiscientos', 600], ['cuatrocientos', 400], ['cien', 100], ['ciento', 100],
  ['cincuenta', 50], ['cuarenta', 40], ['treinta', 30], ['veinte', 20],
  ['diez', 10], ['mil', 1000],
]);
const wordPattern = new RegExp(`\\b(${[...wordNumbers.keys()].join('|')})\\b`, 'gi');
const amountPattern = /(?:[$€]\s*)?\b\d[\d.,]*(?:\s*(?:%|por ciento|d[oó]lares|euros|pesos))?/gi;
const dataTopics = /presupuesto|finanz|dinero|d[oó]lar|euro|peso|ahorro|deuda|gasto|ingreso|venta|beneficio|ganancia|inversi[oó]n|necesidades|precios|clientes|usuarios|estad[ií]stic|encuesta|resultados|crecimiento|porcentaje|por ciento|\d\s*%/i;
const narrativeStyles = new Set(['horror', 'watercolor', 'cinematic']);

const normalize = (value) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const readNumber = (raw) => {
  const value = raw.replace(/[^\d.,]/g, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(value)) return Number(value.replace(/[.,]/g, ''));
  if (/^\d+[.,]\d{1,2}$/.test(value)) return Number(value.replace(',', '.'));
  return Number(value.replace(/[.,]/g, ''));
};

const findNumbers = (text, financeContext) => {
  const items = [];
  const source = normalize(text.replace(/\(\d{1,2}:\d{2}\)/g, ''));
  const add = (at, raw, value) => {
    if (!Number.isFinite(value) || value <= 0 || value > 1e9) return;
    const before = source.slice(Math.max(0, at - 3), at);
    const after = source.slice(at + raw.length, at + raw.length + 18);
    const percent = /%|por ciento/.test(raw + after);
    const currency = /[$€]|dolares|euros|pesos/.test(before + raw + after) || (financeContext && value >= 100);
    items.push({at, value, unit: percent ? 'percent' : currency ? 'currency' : 'number'});
  };
  for (const m of source.matchAll(amountPattern)) add(m.index ?? 0, m[0], readNumber(m[0]));
  for (const m of source.matchAll(wordPattern)) add(m.index ?? 0, m[0], wordNumbers.get(m[0]) ?? 0);
  return items.sort((a, b) => a.at - b.at).filter((item, index, all) =>
    index === 0 || item.at !== all[index - 1].at);
};

const titleFor = (text) => {
  if (/necesidad|vivienda|comida|transporte/i.test(text)) return 'NECESIDADES';
  if (/gustos|ocio|salidas|compras|entretenimiento/i.test(text)) return 'GUSTOS';
  if (/ahorro|deuda/i.test(text)) return 'AHORRO Y DEUDAS';
  if (/ventas|ingresos/i.test(text)) return 'INGRESOS';
  if (/clientes|usuarios/i.test(text)) return 'AUDIENCIA';
  return 'DATOS IMPORTANTES';
};

const iconsFor = (text) => {
  const types = [];
  if (/vivienda|casa|alquiler|hipoteca/i.test(text)) types.push(['home', 'Vivienda']);
  if (/comida|alimentos|alimentaci[oó]n/i.test(text)) types.push(['food', 'Comida']);
  if (/transporte|veh[ií]culo|autob[uú]s|carro/i.test(text)) types.push(['transport', 'Transporte']);
  if (/gustos|ocio|salidas|compras|entretenimiento/i.test(text)) types.push(['shopping', 'Gustos']);
  if (/ahorro|deuda/i.test(text)) types.push(['savings', 'Ahorro']);
  if (/crecimiento|ventas|ganancia/i.test(text)) types.push(['growth', 'Crecimiento']);
  return types.slice(0, 3);
};

const ruleSummary = (text) => /(?:regla|resumen|distribuci[oó]n)/i.test(text) &&
  (/50\s*[/,-]\s*30\s*[/,-]\s*20/.test(text) ||
    /cincuenta[\s,]+treinta[\s,]+veinte/i.test(text));

export function suggestMotionGraphics({text = '', script = '', duration = 6,
  style = 'modern', showText = true} = {}) {
  const context = `${script} ${text}`;
  if (!showText || !dataTopics.test(context)) return [];
  if (narrativeStyles.has(style) && !/(?:%|por ciento|porcentaje|presupuesto|finanz)/i.test(context)) return [];
  const seconds = Math.max(0.5, Math.min(60, Number(duration) || 6));
  const time = (at) => Math.round(Math.min(seconds - 0.2, Math.max(0, at)) * 100) / 100;
  const animation = (at) => Math.round(Math.max(0.2, Math.min(1.4, seconds - time(at))) * 100) / 100;
  const out = [];
  const add = (kind, label, value, unit, at, extra = {}) => out.push({
    id: `auto-${out.length + 1}`, kind, label, value, unit,
    at: time(at), duration: animation(at), ...extra,
  });

  if (ruleSummary(text)) {
    add('donut', 'REGLA 50 / 30 / 20', 100, 'percent', 0.45, {
      segments: [
        {label: 'Necesidades', value: 50},
        {label: 'Gustos', value: 30},
        {label: 'Ahorro', value: 20},
      ],
    });
    return out;
  }

  const finance = /presupuesto|finanz|dinero|d[oó]lar|euro|peso|ahorro|deuda|gasto|necesidad|gustos/i.test(context);
  const maximum = Math.max(100, ...findNumbers(script, finance)
    .filter((item) => item.unit === 'currency').map((item) => item.value));
  const values = findNumbers(text, finance).slice(0, 3);
  for (const [index, item] of values.entries()) {
    const label = titleFor(text);
    const bar = item.unit === 'percent' || (item.unit === 'currency' &&
      item.value < maximum && label !== 'DATOS IMPORTANTES');
    add(bar ? 'bar' : 'counter', bar ? label : item.unit === 'currency' ? 'TOTAL' : label,
      item.value, item.unit, 0.45 + index * 0.5, {
        maxValue: item.unit === 'percent' ? 100 : maximum,
      });
  }
  if (!values.length) return [];
  for (const [index, [icon, label]] of iconsFor(text).entries()) {
    if (out.length >= 8) break;
    add('icon', label, 0, 'number', 1.65 + index * 0.25, {icon});
  }
  return out;
}

// Preserve all timestamped paragraphs, even when the estimated voice length
// is shorter than the last mark; scale the marks to the real MP3 if available.
export function timedStoryboardBlocks(script, targetSeconds, audioMeasured = false) {
  const matches = [...script.matchAll(/\((\d{1,2}):(\d{2})\)/g)];
  if (matches.length < 2) return null;
  const points = matches.map((match) => ({
    at: Number(match[1]) * 60 + Number(match[2]),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
  if (points.some((point, index) => point.at < 0 || (index && point.at <= points[index - 1].at))) return null;
  const typicalGap = points.length >= 2 ?
    Math.max(2, Math.min(12, (points.at(-1).at - points[0].at) / (points.length - 1))) : 6;
  const minimumEnd = points.at(-1).at + typicalGap;
  const total = audioMeasured ? targetSeconds : Math.max(targetSeconds, minimumEnd);
  const factor = audioMeasured && minimumEnd > targetSeconds ? targetSeconds / minimumEnd : 1;
  const scaled = points.map((point) => ({...point, time: point.at * factor}));
  const parts = scaled.map((point, index) => ({
    text: script.slice(point.end, scaled[index + 1]?.start ?? script.length).trim(),
    duration: ((scaled[index + 1]?.time ?? total) - point.time),
  })).filter((part) => part.text && part.duration >= 0.5);
  return parts.length ? parts : null;
}
