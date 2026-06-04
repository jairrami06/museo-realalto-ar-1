Proyecto Comunitarias: Real Alto
=============================

Descripción
-----------
Pequeña aplicación web estática (HTML/CSS/JS) preparada para desplegarse con GitHub Pages.

Estructura principal
--------------------
- `index.html` - página principal
- `public/` - activos (marcadores, modelos, etc.)
- `src/` - código fuente (JS/CSS)

Despliegue a GitHub Pages
-------------------------
El despliegue se realiza mediante GitHub Actions. El workflow responsable es `.github/workflows/deploy.yml` y, por defecto, publica la versión generada desde la rama `main`.

Entorno protegido (`github-pages`)
---------------------------------
Si el entorno de despliegue `github-pages` tiene protección por ramas o revisores requeridos, un push desde otra rama (por ejemplo `custom`) puede ser rechazado. Para permitir que `custom` despliegue, hay dos opciones:

1) Permitir la rama en el entorno (recomendado si quieres que `custom` pueda publicar):
   - En GitHub: `Settings` → `Environments` → `github-pages` → `Deployment branches and tags` → seleccionar `custom` o quitar la restricción.
   - Si existen `Required reviewers`, un despliegue necesitará aprobación desde la pestaña `Actions`.

2) Mantener la restricción y solo desplegar desde `main`:
   - Edita `.github/workflows/deploy.yml` y asegúrate de que en el trigger solo esté `main`.

Cambiar el workflow para incluir `custom`
----------------------------------------
Si prefieres que la acción de CI vuelva a aceptar pushes desde `custom`, edita el bloque `on.push.branches` en `.github/workflows/deploy.yml` para añadir `custom`:

```yaml
on:
  push:
    branches:
      - main
      - custom
```

Luego guarda y haz push; ten en cuenta que, si el entorno `github-pages` sigue protegido para `custom`, el despliegue será rechazado hasta ajustar la configuración de entorno.

Probar localmente
------------------
Una forma rápida de servir los archivos estáticos en tu máquina:

`python -m http.server 8000`

o usando la extensión Live Server en VS Code.
