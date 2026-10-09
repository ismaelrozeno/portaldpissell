// Service worker mínimo: deixa o portal instalável como aplicativo. Não guarda páginas em cache de propósito
// (o portal muda com frequência e precisa sempre abrir a versão mais nova, com dados ao vivo).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
// Abrir o aplicativo (ou trocar de página) sempre confere com o servidor se a página mudou. Sem isso, o navegador
// reaproveitava a cópia guardada por até 10 minutos e o app abria com a versão anterior (recarregar resolvia).
// Os arquivos .js/.css já têm "?v=" e continuam indo direto para a rede, como antes.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode !== "navigate" || request.method !== "GET") return;
  event.respondWith(
    fetch(request.url, { cache: "no-cache", credentials: "same-origin", redirect: "manual" })
      // Sem internet: tenta do jeito normal (o navegador usa a cópia guardada, se tiver).
      .catch(() => fetch(request))
  );
});
