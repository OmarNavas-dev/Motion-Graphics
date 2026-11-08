// Optional free-tier connectors. API keys never leave the local Node server.
// No provider is contacted until the user explicitly requests an action.
const imageHosts = new Set([
  'upload.wikimedia.org', 'live.staticflickr.com',
  'images.unsplash.com', 'images.pexels.com', 'cdn.pixabay.com',
]);

const safeHttpsUrl = (source) => {
  try {
    const url = new URL(source);
    return url.protocol === 'https:' && !url.username && !url.password && url.port === '';
  } catch { return false; }
};

export const allowedImageUrl = (source) => {
  try {
    const url = new URL(source);
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.port === '' && imageHosts.has(url.hostname.toLowerCase());
  } catch { return false; }
};

const safeText = (value, max = 200) => String(value ?? '').trim().slice(0, max);

export async function searchFreeMedia(provider, query, {
  pixabayKey = '', fetcher = fetch,
} = {}) {
  const q = safeText(query, 100);
  if (q.length < 2) throw new Error('Escribe al menos dos letras para buscar.');
  if (!['openverse', 'pixabay'].includes(provider)) throw new Error('Proveedor de búsqueda no admitido.');
  if (provider === 'pixabay' && !pixabayKey) {
    throw new Error('Pixabay no está configurado. Agrega PIXABAY_API_KEY a tu archivo .env.');
  }
  const url = provider === 'openverse'
    ? new URL('https://api.openverse.org/v1/images/')
    : new URL('https://pixabay.com/api/');
  url.searchParams.set('q', q);
  if (provider === 'openverse') {
    url.searchParams.set('license_type', 'commercial');
    url.searchParams.set('page_size', '15');
  } else {
    url.searchParams.set('key', pixabayKey);
    url.searchParams.set('per_page', '15');
    url.searchParams.set('safesearch', 'true');
  }
  let response;
  try { response = await fetcher(url.toString(), {signal: AbortSignal.timeout(12000)}); }
  catch { throw new Error('El proveedor de imágenes no responde. Comprueba Internet.'); }
  if (!response.ok) throw new Error(`El proveedor de imágenes respondió con HTTP ${response.status}.`);
  const payload = await response.json();
  const list = provider === 'openverse' ? payload.results : payload.hits;
  if (!Array.isArray(list)) throw new Error('Respuesta de imágenes inesperada.');
  const candidates = list.map((entry) => provider === 'openverse' ? {
    imageUrl: entry.url,
    thumbnail: entry.thumbnail || entry.url,
    creator: safeText(entry.creator || 'Autor no indicado', 100),
    sourceUrl: safeHttpsUrl(entry.foreign_landing_url) ? safeText(entry.foreign_landing_url, 600) : '',
    license: safeText(entry.license || 'Ver licencia', 80),
    title: safeText(entry.title || q, 120),
  } : {
    imageUrl: entry.webformatURL || entry.largeImageURL,
    thumbnail: entry.previewURL || entry.webformatURL,
    creator: safeText(entry.user || 'Pixabay', 100),
    sourceUrl: safeHttpsUrl(entry.pageURL) ? safeText(entry.pageURL, 600) : '',
    license: 'Pixabay Content License',
    title: safeText(entry.tags || q, 120),
  });
  return candidates.filter((item) => {
    if (!allowedImageUrl(item.imageUrl)) return false;
    if (!safeHttpsUrl(item.thumbnail)) item.thumbnail = item.imageUrl;
    const license = item.license.toLowerCase();
    return provider === 'pixabay' || (!license.includes('nc') && !license.includes('nd'));
  }).slice(0, 12);
}

export async function downloadFreeMedia(item, {fetcher = fetch, maxBytes = 12 * 1024 * 1024} = {}) {
  if (!item || !allowedImageUrl(item.imageUrl)) throw new Error('Fuente de imagen no permitida.');
  const response = await fetcher(item.imageUrl, {redirect: 'manual', signal: AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error(`No se pudo descargar el recurso (HTTP ${response.status}).`);
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const ext = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp'}[contentType];
  if (!ext) throw new Error('El recurso debe ser PNG, JPG o WebP.');
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new Error('La imagen supera el límite de 12 MB.');
  if (!response.body) throw new Error('Descarga de imagen incompleta.');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.byteLength;
    if (bytes > maxBytes) {
      await response.body.cancel().catch(() => {});
      throw new Error('La imagen supera el límite de 12 MB.');
    }
    chunks.push(Buffer.from(chunk));
  }
  return {bytes: Buffer.concat(chunks), ext};
}

export async function transcribeWithGroq(bytes, filename, apiKey, {fetcher = fetch} = {}) {
  if (!apiKey) throw new Error('Groq no está configurado. Agrega GROQ_API_KEY a tu archivo .env.');
  if (!bytes?.length || bytes.length > 25 * 1024 * 1024) {
    throw new Error('Para Groq necesitas un audio de hasta 25 MB.');
  }
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!['mp3', 'wav', 'm4a'].includes(ext)) throw new Error('Formato de audio no permitido.');
  const form = new FormData();
  form.set('file', new Blob([bytes]), `narracion.${ext}`);
  form.set('model', 'whisper-large-v3-turbo');
  form.set('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('timestamp_granularities[]', 'segment');
  let response;
  try {
    response = await fetcher('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: {Authorization: `Bearer ${apiKey}`}, body: form,
      signal: AbortSignal.timeout(90000),
    });
  } catch { throw new Error('No se pudo conectar con Groq. Comprueba Internet.'); }
  if (!response.ok) throw new Error(`Groq respondió con HTTP ${response.status}. Revisa tu clave o límite gratuito.`);
  const result = await response.json();
  const segments = Array.isArray(result.segments) ? result.segments
    .filter((s) => Number.isFinite(s.start) && typeof s.text === 'string')
    .slice(0, 1000).map((s) => ({at: Math.max(0, s.start), text: safeText(s.text, 500)})) : [];
  const words = Array.isArray(result.words) ? result.words.filter(w =>
    typeof w.word === 'string' && Number.isFinite(w.start) && Number.isFinite(w.end) && w.start >= 0 && w.end > w.start)
    .slice(0, 15000).map(w => ({text:safeText(w.word,160),start:w.start,end:w.end})) : [];
  return {text: safeText(result.text, 45000), segments, words, alignment: words.length ? 'model-estimated' : 'segments-only'};
}
