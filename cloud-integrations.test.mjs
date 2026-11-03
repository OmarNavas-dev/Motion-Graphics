import assert from 'node:assert/strict';
import test from 'node:test';
import {allowedImageUrl, searchFreeMedia, downloadFreeMedia, transcribeWithGroq} from './cloud-integrations.mjs';

const json = (value) => new Response(JSON.stringify(value),
  {status: 200, headers: {'content-type': 'application/json'}});

test('solo descarga desde proveedores de imágenes aprobados', () => {
  assert.equal(allowedImageUrl('https://upload.wikimedia.org/wikipedia/commons/a.jpg'), true);
  assert.equal(allowedImageUrl('http://127.0.0.1/private'), false);
  assert.equal(allowedImageUrl('https://127.0.0.1/private'), false);
  assert.equal(allowedImageUrl('https://upload.wikimedia.org.evil.test/a.png'), false);
  assert.equal(allowedImageUrl('file:///etc/passwd'), false);
});

test('Openverse filtra licencias no comerciales y hosts inseguros', async () => {
  const results = await searchFreeMedia('openverse', 'río nocturno', {
    fetcher: async (url) => {
      assert.match(url, /license_type=commercial/);
      return json({results: [
        {url: 'https://upload.wikimedia.org/a.jpg', thumbnail: 'https://upload.wikimedia.org/t.jpg',
          title: 'Río', creator: 'Ana', license: 'by', foreign_landing_url: 'https://commons.wikimedia.org/file'},
        {url: 'https://upload.wikimedia.org/b.jpg', thumbnail: 'https://upload.wikimedia.org/b.jpg',
          license: 'by-nc'},
        {url: 'https://127.0.0.1/internal.jpg', thumbnail: 'https://127.0.0.1/internal.jpg',
          license: 'by'},
      ]});
    },
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].creator, 'Ana');
});

test('Pixabay requiere clave gratuita; la respuesta nunca expone esa clave', async () => {
  await assert.rejects(searchFreeMedia('pixabay', 'paisaje'), /PIXABAY_API_KEY/);
  const result = await searchFreeMedia('pixabay', 'paisaje', {
    pixabayKey: 'CLAVE_SUPER_PRIVADA',
    fetcher: async (url) => {
      assert.match(url, /CLAVE_SUPER_PRIVADA/);
      return json({hits: [{largeImageURL: 'https://cdn.pixabay.com/photo/a.jpg',
        previewURL: 'https://cdn.pixabay.com/photo/t.jpg', user: 'Artista', tags: 'montaña'}]});
    },
  });
  assert.equal(result.length, 1);
  assert.ok(!JSON.stringify(result).includes('CLAVE_SUPER_PRIVADA'));
});

test('descarga de imagen valida y tamaño limitado', async () => {
  const item = {imageUrl: 'https://upload.wikimedia.org/demo.png'};
  const bytes = Buffer.from('89504e470d0a1a0a', 'hex');
  const result = await downloadFreeMedia(item, {fetcher: async () =>
    new Response(bytes, {headers: {'content-type': 'image/png'}})});
  assert.equal(result.ext, '.png');
  assert.ok(result.bytes.equals(bytes));
  await assert.rejects(downloadFreeMedia(item, {maxBytes: 4, fetcher: async () =>
    new Response(bytes, {headers: {'content-type': 'image/png', 'content-length': '8'}})}), /límite/);
});

test('Groq es opcional y devuelve segmentos sin exponer la clave', async () => {
  await assert.rejects(transcribeWithGroq(Buffer.from('audio'), 'demo.mp3', ''), /GROQ_API_KEY/);
  const result = await transcribeWithGroq(Buffer.from('audio'), 'demo.mp3', 'MI_CLAVE', {
    fetcher: async (url, opts) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/audio/transcriptions');
      assert.equal(opts.headers.Authorization, 'Bearer MI_CLAVE');
      assert.equal(opts.body.get('model'), 'whisper-large-v3-turbo');
      return json({text: 'Mi historia', segments: [{start: 2.5, text: 'Mi historia'}]});
    },
  });
  assert.equal(result.segments[0].at, 2.5);
  assert.ok(!JSON.stringify(result).includes('MI_CLAVE'));
});
