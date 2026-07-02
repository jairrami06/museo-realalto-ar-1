Proyecto Comunitarias: Real Alto
=============================

Descripción
-----------
Aplicación WebAR estática para el Museo Arqueológico Real Alto. El proyecto usa A-Frame + AR.js, soporte PWA/offline y despliegue en Netlify.

Estructura principal
--------------------
- `index.html` - página principal
- `src/js/app.js` - lógica de UI, idioma, AR y service worker
- `i18n.json` - textos localizables
- `service-worker.js` - caché offline
- `manifest.json` - configuración PWA
- `public/` - activos (marcadores, modelos, imágenes)
- `netlify.toml` - configuración de publicación en Netlify

Despliegue actual
-----------------
El sitio se publica desde la raíz del repositorio en Netlify. En el dashboard de Netlify usa:

- Build command: vacío
- Publish directory: `.`

Prueba local
------------
Una forma rápida de servir los archivos estáticos en tu máquina:

```bash
python -m http.server 8000
```

También puedes usar Live Server en VS Code.

Siguientes pasos técnicos
-------------------------
- Subir modelos finales optimizados a Cloudflare R2.
- Reemplazar las rutas locales por las URLs públicas de R2.
- Completar el catálogo i18n si se agregan más idiomas.
- Ajustar la caché del service worker cuando cambien los assets.
