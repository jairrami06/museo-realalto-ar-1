# WebAR Museo Arqueológico Real Alto — Contexto técnico del proyecto

---

## 1. Descripción general

Aplicación WebAR para el **Museo Arqueológico Real Alto** (Santa Elena, Ecuador). Permite a los visitantes visualizar modelos 3D de piezas arqueológicas superpuestos sobre el entorno físico del sitio usando el celular, sin instalar ninguna app nativa.

---

## 2. Stack tecnológico definido

| Capa | Tecnología | Razón |
|---|---|---|
| AR / 3D | A-Frame + AR.js (modo GPS) | WebAR sin app nativa, funciona en móvil |
| Hosting | Netlify | Deploy automático desde Git, free tier, HTTPS gratis |
| Assets 3D (GLBs) | Cloudflare R2 | Egress $0, 10 GB gratis permanentes, CDN global |
| i18n (textos) | JSON único estático | Sin requests en runtime, cacheable en CDN |
| Offline | PWA + Service Worker | Precarga en WiFi museo, funciona sin señal en sitio |
| Deploy CLI | Wrangler (R2) + Netlify CLI | Solo dev, sin panel de admin necesario |

---

## 3. Internacionalización (i18n)

### Decisión

**Un único archivo `i18n.json`** con los 3 idiomas (español, inglés, un tercero por definir), cargado una sola vez al arrancar la app. Servido desde el mismo CDN que el resto del site (Netlify).

### Razones

- Contenido fijo — no cambia frecuentemente
- Tamaño total estimado: 5–20 KB (2–6 KB con gzip) — despreciable
- Sin base de datos: añadiría latencia, complejidad y punto de falla sin beneficio
- Sin librerías i18n (i18next, etc.): +20–40 KB innecesarios para textos estáticos simples
- En runtime: solo se actualizan atributos puntuales en entidades A-Frame, sin re-render de escena

### Estructura del JSON

```json
{
  "es": {
    "ui": {
      "titulo": "Museo Real Alto",
      "boton_ar": "Ver en AR"
    },
    "models": {
      "vasija_01": {
        "nombre": "Vasija ceremonial",
        "descripcion": "Periodo Valdivia, 3500 a.C.",
        "periodo": "3500 a.C."
      }
    }
  },
  "en": {
    "ui": {
      "titulo": "Real Alto Museum",
      "boton_ar": "View in AR"
    },
    "models": {
      "vasija_01": {
        "nombre": "Ceremonial vessel",
        "descripcion": "Valdivia period, 3500 BC",
        "periodo": "3500 BC"
      }
    }
  }
}
```

### Persistencia de idioma

Guardar preferencia en `localStorage` para que no se reinicie al recargar la página (importante en GPS-based AR donde hay recargas frecuentes por imprecisión de señal).

```js
// Guardar preferencia
localStorage.setItem('lang', 'es');

// Leer al cargar
const lang = localStorage.getItem('lang') || 'es';
```

---

## 4. Almacenamiento de modelos GLB

### Decisión

**Cloudflare R2** para producción. En desarrollo local, los GLBs pueden vivir en `/assets/models/` del proyecto. Antes del lanzamiento se migran a R2 — solo cambia la URL en el código.

### Por qué no otras opciones

| Opción | Problema |
|---|---|
| GLBs en repo + Netlify | Git no es para binarios; repo se infla; 100 GB BW/mes puede agotarse |
| AWS S3 + CloudFront | Egress ~$0.09/GB — impredecible con descargas de modelos |
| Google Cloud Storage | Egress ~$0.08/GB — mismo problema |
| Base de datos (Strapi/etc.) | DBs no son para binarios; sin CDN nativo; latencia alta |

### Flujo de URLs

```
Desarrollo:   ./assets/models/vasija_01.glb
Producción:   https://<cuenta>.r2.dev/vasija_01.glb
```

### Compresión obligatoria antes de subir

| Técnica | Herramienta | Reducción |
|---|---|---|
| Draco (geometría) | `gltf-pipeline` CLI | 70–90% |
| KTX2 + Basis (texturas) | `toktx` | 70–80% |
| Ambas combinadas | `gltf-pipeline` | Hasta 95% |

```bash
# Instalar
npm install -g gltf-pipeline

# Comprimir con Draco
gltf-pipeline -i vasija_01.glb -o vasija_01.draco.glb --draco.compressionLevel 7
```

---

## 5. Estrategia offline (PWA + Service Worker)

### Contexto

El sitio arqueológico **no tiene señal móvil**. El museo tiene WiFi en la entrada. La estrategia es:

1. Visitante llega al museo y conecta al WiFi
2. Abre el sitio — el Service Worker descarga y cachea TODO
3. Sale al sitio arqueológico (sin señal)
4. El sitio y los modelos cargan desde caché local del celular
5. AR.js con GPS funciona sin internet (el GPS del celular es independiente de la red)

### Service Worker completo

```js
// service-worker.js
const CACHE = 'museo-real-alto-v1';

const ASSETS = [
  '/',
  '/index.html',
  '/i18n.json',
  '/models/vasija_01.draco.glb',
  '/models/figura_02.draco.glb',
  // agregar todos los modelos
];

// Instalar: cachear todo
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activar: limpiar cachés viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
```

### Indicador de precarga para el visitante

```js
// Mostrar progreso real al visitante mientras descarga
const MODELOS = ['vasija_01.draco.glb', 'figura_02.draco.glb'];
let descargados = 0;

async function precargarTodo() {
  const cache = await caches.open('museo-real-alto-v1');
  for (const modelo of MODELOS) {
    await cache.add(`/models/${modelo}`);
    descargados++;
    const pct = Math.round(descargados / MODELOS.length * 100);
    document.getElementById('barra').style.width = pct + '%';
    document.getElementById('pct').textContent = pct + '%';
  }
  document.getElementById('estado').textContent =
    '¡Listo! Ya puedes ir al sitio arqueológico.';
}
```

### Detección de estado de red

```js
window.addEventListener('online',  () => mostrarEstado('Con señal'));
window.addEventListener('offline', () => mostrarEstado('Modo offline — todo funciona'));
```

### Lazy loading por proximidad GPS

Para no descargar todos los modelos de golpe, cargar cada GLB solo cuando el visitante se acerca al punto correspondiente:

```js
function cargarModeloSiCerca(posUsuario, puntoAR, modeloUrl, umbralMetros = 20) {
  const distancia = calcularDistancia(posUsuario, puntoAR);
  if (distancia < umbralMetros) {
    document.querySelector('#modelo-target')
      .setAttribute('gltf-model', modeloUrl);
  }
}
```

---

## 6. Implementación con Netlify + Cloudflare R2

### Prerrequisitos

- Cuenta en [netlify.com](https://netlify.com) (free)
- Cuenta en [cloudflare.com](https://cloudflare.com) (free)
- Node.js instalado
- Wrangler CLI: `npm install -g wrangler`
- Netlify CLI: `npm install -g netlify-cli`

---

### 6.1 Configurar Cloudflare R2

```bash
# 1. Autenticarse en Cloudflare
wrangler login

# 2. Crear el bucket R2
wrangler r2 bucket create museo-real-alto-assets

# 3. Subir un modelo GLB
wrangler r2 object put museo-real-alto-assets/vasija_01.draco.glb \
  --file ./assets/models/vasija_01.draco.glb \
  --content-type model/gltf-binary

# 4. Subir todos los modelos de una vez (bash loop)
for f in ./assets/models/*.glb; do
  nombre=$(basename "$f")
  wrangler r2 object put museo-real-alto-assets/"$nombre" \
    --file "$f" \
    --content-type model/gltf-binary
done
```

#### Habilitar acceso público al bucket

En el dashboard de Cloudflare → R2 → `museo-real-alto-assets` → Settings → **Public Access** → Enable.

Esto genera una URL pública tipo:
```
https://pub-<hash>.r2.dev/vasija_01.draco.glb
```

#### Configurar CORS en R2 (necesario para que A-Frame pueda cargar los GLBs)

Crear archivo `cors.json`:

```json
[
  {
    "AllowedOrigins": ["https://tu-sitio.netlify.app", "http://localhost:3000"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

```bash
wrangler r2 bucket cors put museo-real-alto-assets --file cors.json
```

---

### 6.2 Referenciar GLBs desde A-Frame

```html
<!-- En desarrollo: ruta local -->
<a-entity gltf-model="./assets/models/vasija_01.draco.glb"></a-entity>

<!-- En producción: URL de R2 -->
<a-entity gltf-model="https://pub-<hash>.r2.dev/vasija_01.draco.glb"></a-entity>
```

Usar una variable de entorno para no cambiar el código entre dev y producción (ver sección 6.3).

---

### 6.3 Configurar Netlify

#### Estructura del proyecto

```
museo-real-alto/
├── index.html
├── i18n.json
├── service-worker.js
├── manifest.json          ← para PWA
├── assets/
│   ├── models/            ← GLBs locales para desarrollo
│   └── img/
├── js/
│   └── app.js
└── netlify.toml           ← configuración de Netlify
```

#### netlify.toml

```toml
[build]
  publish = "."

# Headers para PWA y CORS
[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"

[[headers]]
  for = "/service-worker.js"
  [headers.values]
    Cache-Control = "no-cache"   # SW debe actualizarse siempre

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "no-cache"

# Redirigir todo a index.html (SPA behavior)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Variables de entorno en Netlify

En el dashboard de Netlify → Site → Environment Variables:

```
R2_PUBLIC_URL = https://pub-<hash>.r2.dev
```

Usar en el código:

```js
// En build time con Netlify (si usas un bundler)
const R2_URL = process.env.R2_PUBLIC_URL;

// O hardcodeado en producción (más simple para HTML puro)
const R2_URL = 'https://pub-<hash>.r2.dev';
const modeloUrl = `${R2_URL}/vasija_01.draco.glb`;
```

---

### 6.4 Deploy en Netlify

#### Opción A — Deploy automático desde GitHub (recomendado)

```bash
# 1. Subir el proyecto a GitHub
git init
git add .
git commit -m "init: proyecto WebAR Museo Real Alto"
git remote add origin https://github.com/tu-usuario/museo-real-alto.git
git push -u origin main

# 2. En Netlify dashboard:
#    New site → Import from Git → Seleccionar el repo
#    Build command: (vacío, es HTML puro)
#    Publish directory: .
#    → Deploy site
```

Cada `git push` a `main` dispara un deploy automático en Netlify.

#### Opción B — Deploy manual desde CLI

```bash
# Primera vez
netlify login
netlify init

# Deploys siguientes
netlify deploy --prod
```

---

### 6.5 Flujo completo de actualización

```
1. Modificar código localmente
2. Probar en localhost (GLBs desde ./assets/models/)
3. Si hay modelos nuevos/actualizados:
   wrangler r2 object put museo-real-alto-assets/<nombre>.glb --file <ruta>
4. git add . && git commit -m "descripcion" && git push
5. Netlify despliega automáticamente en ~30 segundos
6. Actualizar versión del CACHE en service-worker.js para invalidar caché de usuarios
```

---

### 6.6 Checklist antes del lanzamiento

- [ ] Todos los GLBs comprimidos con Draco
- [ ] GLBs subidos a R2 con CORS configurado
- [ ] URLs de R2 referenciadas en el código (no rutas locales)
- [ ] Service Worker registrado en `index.html`
- [ ] `manifest.json` configurado para PWA (nombre, íconos, theme color)
- [ ] `netlify.toml` con headers de caché correctos
- [ ] Prueba de modo offline en Chrome DevTools → Network → Offline
- [ ] Prueba en dispositivo Android con GPS en el sitio arqueológico real

---

## 7. Costos estimados

| Servicio | Plan | Costo |
|---|---|---|
| Netlify | Free | $0/mes |
| Cloudflare R2 | Free (hasta 10 GB) | $0/mes |
| Dominio custom (opcional) | Ej. Namecheap | ~$10/año |
| **Total** | | **$0/mes** |

Si el proyecto crece y supera 10 GB de assets en R2: $0.015/GB adicional. Con 10–30 modelos comprimidos con Draco, es prácticamente imposible superar ese límite.

---

## 8. Resumen de decisiones técnicas

| Decisión | Elegido | Descartado |
|---|---|---|
| AR engine | A-Frame + AR.js | Unity WebGL, 8thWall (costo) |
| Hosting | Netlify | Google Cloud, Vercel, Firebase |
| Assets 3D | Cloudflare R2 | AWS S3, GCS, Git LFS, DB |
| i18n | JSON único estático | i18next, base de datos, inline HTML |
| Offline | PWA + Service Worker | Sin offline, app nativa |
| Deploy | Git push → auto-deploy | CI/CD complejo, manual FTP |
| Costo mensual | $0 | — |
