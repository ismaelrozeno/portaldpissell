// Service worker mínimo: deixa o portal instalável como aplicativo. Não guarda páginas em cache de propósito
// (o portal muda com frequência e precisa sempre abrir a versão mais nova, com dados ao vivo).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* tudo vai direto para a rede */ });
