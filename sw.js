const CACHE = 'fotobut-v2';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/main.css', './css/templates.css',
  './js/app.js', './js/camera.js', './js/canvas.js',
  './js/templates.js', './js/effects.js', './js/overlays.js',
  './js/timer.js', './js/export.js', './js/store.js',
  './js/text-editor.js', './js/gif.js', './js/sound.js', './js/photodb.js', './js/gallery.js',
  './js/template-editor.js',
  './templates/polaroid.json', './templates/film-strip.json',
  './templates/vintage.json', './templates/comic.json',
  './templates/photo-strip.json', './templates/neon.json',
  './templates/christmas.json', './templates/halloween.json',
  './templates/wedding.json', './templates/birthday.json',
  './assets/borders/polaroid-frame.svg', './assets/borders/film-strip-frame.svg',
  './assets/borders/vintage-frame.svg', './assets/borders/comic-frame.svg',
  './assets/borders/photostrip-frame.svg', './assets/borders/neon-frame.svg',
  './assets/borders/christmas-frame.svg', './assets/borders/halloween-frame.svg',
  './assets/borders/wedding-frame.svg', './assets/borders/birthday-frame.svg',
  './assets/stickers/emoji-smile.svg', './assets/stickers/emoji-laugh.svg',
  './assets/stickers/heart.svg', './assets/stickers/star.svg',
  './assets/stickers/sparkle.svg', './assets/stickers/rainbow.svg',
  './assets/stickers/sunglasses.svg', './assets/stickers/fire.svg',
  './assets/stickers/unicorn.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});