// api/config.js
// Función serverless de Vercel — mismo patrón que ya usa Planning de Entregas.
// Lee la variable de entorno VITE_API_URL (Project Settings > Environment
// Variables en Vercel) y se la devuelve al frontend como JSON. Necesario
// porque este proyecto es HTML estático sin build de Vite/Webpack, así que
// el navegador nunca podría leer process.env directamente.

export default function handler(req, res) {
  const apiUrl = process.env.VITE_API_URL;

  if (!apiUrl) {
    res.status(500).json({ error: 'VITE_API_URL no está configurada en Vercel' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ apiUrl });
}
