# Portal IES Virgen de Villadiego — PWA

Aplicación web instalable (PWA) para el portal de aplicaciones del IES Virgen de Villadiego. Desplegar en `https://iesvilladiego.github.io/`.

## Estructura de archivos

```
download/
├── index.html                  # Página principal (con etiquetas PWA)
├── manifest.webmanifest         # Manifest PWA
├── sw.js                       # Service Worker (caché offline)
├── browserconfig.xml           # Tiles Microsoft Windows
├── .nojekyll                   # Desactiva Jekyll en GitHub Pages
├── README-PWA.md               # Este archivo
├── portal-ies.html             # Versión anterior (puedes borrarlo)
└── img/                        # ← TODAS las imágenes aquí
    ├── escudo.png              # Escudo para la pantalla principal
    ├── favicon.ico             # Favicon multi-resolución (16/32/48)
    ├── favicon-16x16.png
    ├── favicon-32x32.png
    ├── favicon-48x48.png
    ├── icon-96x96.png
    ├── icon-144x144.png
    ├── apple-touch-icon.png    # 180×180 iOS
    ├── icon-192x192.png         # PWA estándar
    ├── icon-256x256.png
    ├── icon-384x384.png
    ├── icon-512x512.png         # PWA estándar
    └── icon-512x512-maskable.png # Android maskable
```

## Publicación en GitHub Pages

1. **Sube todos los archivos** (incluida la carpeta `img/`) a la raíz del repositorio `iesvilladiego.github.io` (el repo GitHub Pages debe llamarse exactamente así).

2. **Verifica que GitHub Pages está activado**:
   - Repo → Settings → Pages → Source: `Deploy from a branch` → `main` / `/root`

3. **Espera ~1 minuto** a que GitHub propague los cambios.

4. **Abre `https://iesvilladiego.github.io/`** en el navegador. Deberías ver:
   - El portal con el escudo + botones de perfil
   - En la consola: `[PWA] Service Worker registrado con scope: https://iesvilladiego.github.io/`

5. **Verifica la instalación de la PWA**:
   - En Chrome desktop: debería aparecer un icono de instalación (⊕) en la barra de direcciones.
   - En Chrome/Edge Android: menú ⋮ → "Instalar aplicación" / "Añadir a pantalla de inicio".
   - En iOS Safari: botón Compartir → "Añadir a pantalla de inicio".

6. **Verifica el offline**:
   - Una vez instalada, desconecta internet y recarga. Debería seguir abriendo la app (sin datos de Firebase, pero con la shell cacheada).

## Si quieres usar tu propio escudo

Sustituye el archivo en `/home/z/my-project/upload/escudo.png` y ejecuta:
```bash
python3 /home/z/my-project/scripts/generate_pwa_icons_from_escudo.py
```

El script:
1. Lee el escudo de `/home/z/my-project/upload/escudo.png`
2. Genera la versión para HTML en `img/escudo.png` (redimensionada si es muy grande)
3. Genera todos los PNG cuadrados en `img/` (con escudo centrado + anillo dorado + fondo navy)
4. Genera la versión maskable en `img/icon-512x512-maskable.png` (área segura para Android)
5. Genera `img/favicon.ico` multi-resolución

## Configuración Firebase

La app lee/escribe en Firebase Realtime Database, región `europe-west1`:
- URL: `https://iesvdv-96a18-default-rtdb.europe-west1.firebasedatabase.app/`
- Paths usados: `portal-ies/apps`, `portal-ies/admins`, `portal-ies/groupPasswords`, `portal-ies/admin` (legacy)

### Reglas de seguridad recomendadas

Para desarrollo (acceso público sin autenticación):
```json
{
  "rules": {
    "portal-ies": {
      ".read": true,
      ".write": true
    }
  }
}
```

Para producción, se recomienda restringir a usuarios autenticados (cambiar a `auth != null`), pero como la app gestiona sus propias contraseñas en `portal-ies/admins` (no usa Firebase Auth), la regla abierta es la opción práctica.

## Versiones

- **Versión actual**: v2 (con imágenes en `img/`)
- **Cambios de versión**: Si haces cambios en `sw.js` o en los recursos cacheados, incrementa `CACHE_VERSION = 'portal-ies-v2'` a `v3`, `v4`, etc. para que los usuarios reciban la nueva versión automáticamente al recargar.

## Depuración

- **Service Worker**: Chrome DevTools → Application → Service Workers
- **Caché**: Application → Cache Storage → `portal-ies-v2`
- **Manifest**: Application → Manifest
- **Lighthouse**: Run Lighthouse audit → debería dar ✓ en PWA

## Notas técnicas

- La PWA funciona **sólo en HTTPS**. GitHub Pages ya lo proporciona.
- El Service Worker **no intercepta** las llamadas a Firebase Realtime Database (datos en tiempo real, no se cachean).
- La caché usa estrategia **network-first** para HTML (siempre la versión más reciente online) y **cache-first** para recursos estáticos (CSS inline, JS inline, iconos en `img/`, Firebase SDK).
- Si el usuario está offline y abre la app, ve la shell cacheada pero no puede cargar datos de Firebase. Al recuperar conexión, los datos se cargan automáticamente.
- Todas las imágenes están en `img/` para mantener el directorio raíz limpio y facilitar la organización.
