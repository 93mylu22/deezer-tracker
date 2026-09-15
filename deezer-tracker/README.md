# deezer-tracker

Rastreador 100% gratis de posiciones de canciones en charts de Deezer.
Fase 1: un solo chart (Deezer Colombia Top 100) y dos canciones (BTS — NORMAL y BTS — SWIM).

Sin base de datos: todo vive en archivos JSON dentro del repo (`/data`).
Un workflow de GitHub Actions corre cada día, consulta la API pública de Deezer,
actualiza `data/historico.json` y lo commitea. Otro workflow reconstruye y publica
el sitio estático en GitHub Pages.

## Estructura

```
data/
  charts.json      -> charts que se rastrean
  tracked.json     -> canciones a buscar en cada chart
  historico.json   -> histórico diario de posiciones (se actualiza solo)
lib/
  deezer.ts        -> cliente de la API pública de Deezer
  diff.ts          -> cálculo de diferencia de posición hoy vs ayer
scripts/
  cron.ts          -> script que corre el día a día (local o en Actions)
app/
  page.tsx         -> pantalla principal (server component, lee los JSON)
  MessagePanel.tsx -> mensaje para WhatsApp + botón "Copiar" (client component)
.github/workflows/
  cron.yml         -> ejecuta scripts/cron.ts todos los días 9am Bogotá
  deploy.yml       -> hace build y publica en GitHub Pages en cada push a main
```

## 1. Correrlo en local

Requisitos: Node.js 20+.

```bash
npm install

# Traer datos reales de Deezer y actualizar data/historico.json
npm run cron

# Levantar la app en modo desarrollo
npm run dev
```

Abre `http://localhost:3000`. Si `historico.json` sigue en `{}`, la página lo dirá
("Aún no hay datos") — corre `npm run cron` primero.

Para simular un "segundo día" y ver las flechas de cambio, corre `npm run cron`
de nuevo otro día (o edita a mano `data/historico.json` agregando una fecha anterior).

## 2. Subir el proyecto a GitHub

```bash
cd deezer-tracker
git init
git add .
git commit -m "Fase 1: deezer-tracker"
gh repo create deezer-tracker --public --source=. --push
# o crea el repo manualmente en github.com y luego:
# git remote add origin https://github.com/TU_USUARIO/deezer-tracker.git
# git branch -M main
# git push -u origin main
```

## 3. Activar GitHub Pages

1. En el repo, ve a **Settings → Pages**.
2. En "Build and deployment" → **Source**, elige **GitHub Actions**.
3. Listo. El workflow `deploy.yml` se dispara automáticamente en cada push a `main`
   y publica el contenido de `out/`.

Si tu repo **no** se llama `TU_USUARIO.github.io` (es decir, es un project page tipo
`https://TU_USUARIO.github.io/deezer-tracker`), abre `next.config.js` y descomenta:

```js
basePath: "/deezer-tracker",
assetPrefix: "/deezer-tracker/",
```

(cambia `deezer-tracker` por el nombre real de tu repo) y vuelve a hacer push.

## 4. El cron automático

`cron.yml` corre todos los días a las 9:00am hora Bogotá (`0 14 * * *` UTC),
ejecuta `npm run cron`, y si `data/historico.json` cambió, lo commitea y hace push.
Ese push dispara automáticamente `deploy.yml`, así que el sitio siempre queda
actualizado sin que tengas que hacer nada.

También puedes dispararlo manualmente: **Actions → Deezer Tracker Cron → Run workflow**.

## 5. Cómo funciona el matching de canciones

`scripts/cron.ts` trae el top 100 de cada chart y, para cada canción en
`tracked.json`, busca una coincidencia donde tanto el artista como el título
(en minúsculas, sin tildes) estén *contenidos* en los del track de Deezer.
Esto tolera diferencias como "BTS" vs "BTS, Some Feat." o "Normal" vs "Normal (Radio Edit)".

Si una canción no aparece en el top 100, se guarda con `pos: null` y no se
incluye en el mensaje de WhatsApp.

## Qué ampliaría primero

1. **Más charts y canciones sin tocar código**: ya está preparado (son solo
   arrays en JSON), pero valdría la pena agregar una validación en el cron que
   avise si un `playlistId` ya no existe o cambió de nombre.
2. **Historial visual (gráfico de posición en el tiempo)**: hoy solo se compara
   contra el día anterior; un gráfico de líneas por canción a lo largo de las
   semanas sería el salto más valioso para "ver la tendencia" de un lanzamiento.
3. **Multi-plataforma**: mismo patrón (JSON + cron + API pública) aplicado a
   Spotify Charts / YouTube Music, para comparar el mismo track entre plataformas.
4. **Notificación push/Telegram** además del botón "Copiar", para no tener que
   entrar a la página cada mañana.
5. **Manejo de múltiples charts por país**: agrupar por país en la UI cuando
   `charts.json` crezca más allá de uno.
