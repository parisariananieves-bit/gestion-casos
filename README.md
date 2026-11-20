# Gestión de Casos — Grupo París

Un solo repo, dos partes que se despliegan en lugares distintos (por cómo
funcionan Vercel y Google Apps Script — no es que estén separados por
elección, es que no hay forma de que Vercel "vea" código de Apps Script ni
al revés):

## /frontend → Vercel

Es el sitio estático. En Vercel, configurá el **Root Directory** del
proyecto en `frontend` (Settings → General → Root Directory) para que
despliegue esta carpeta. Incluye:
- `index.html` — app interna (login).
- `reclamo.html` — formulario público de reclamos (sin login).
- `seguimiento.html` — link seguro para que el cliente agregue más info.
- `api/config.js` — función serverless que expone `VITE_API_URL`.
- `manifest.json`, `sw.js`, `icons/`, `assets/logos/` — PWA y marca.

Variable de entorno a configurar en Vercel: `VITE_API_URL` = la URL
`/exec` de tu despliegue de Apps Script.

## /backend → Google Apps Script

Apps Script no se despliega con git push — vive en el editor de Google
(script.google.com) o se sincroniza con `clasp` (CLI de Google) si querés
manejarlo por consola. Para actualizarlo manualmente: abrí tu proyecto de
Apps Script vinculado a la planilla, y pegá/reemplazá cada archivo `.gs`
por el de esta carpeta (mismo nombre). Después: Implementar → Nueva
implementación.

Si en algún momento querés manejar el backend por consola igual que el
frontend, se puede agregar `clasp` al repo (archivo `.clasp.json` +
`appsscript.json`) y correr `clasp push` — avisame y lo dejamos armado.

## Después de desplegar los dos

1. En Apps Script → Configuracion (la hoja), completá `EMAILS_EQUIPO_CALIDAD`
   con los mails que reciben el aviso de reclamo nuevo.
2. Copiá el link de `reclamo.html` (hay un botón "Formulario de reclamos"
   en el menú de la app) y pegalo donde lo necesites (WhatsApp, firma de
   mail, etc.).

## Si el backend YA está conectado por clasp (como Planning)

Si ya usás `clasp` para otro proyecto (por ejemplo Planning), podés manejar
este backend exactamente igual, desde el mismo repo:

1. `npm install -g @google/clasp` (si no lo tenés ya) y `clasp login` (una
   sola vez, con la cuenta de Google del script).
2. Buscá el **Script ID** de este proyecto: en el editor de Apps Script →
   ⚙️ Configuración del proyecto → "ID del Script".
3. Renombrá `backend/.clasp.json.ejemplo` a `backend/.clasp.json` y pegá
   ese ID en `scriptId`.
4. Desde `backend/`: `clasp push` sube los `.gs` sin tocar nada a mano en
   el editor de Google. `clasp pull` trae lo que haya en Google por si
   alguien editó ahí directamente.
5. A partir de ahí, un solo flujo: `git push` → Vercel levanta `/frontend`
   solo, y `clasp push` (manual o desde un GitHub Action) actualiza
   `/backend`. Avisame si querés que te arme ese GitHub Action para que
   se dispare solo con cada `git push`.
