// Imagem de digital para a folha de liberação. O leitor (API da Fingertech) não devolve a imagem da
// leitura, só o modelo (template); por isso o desenho é gerado a partir do identificador (hash) do
// modelo: cada colaborador sempre tem o mesmo desenho, na tela, no PDF e na imagem.
(function () {
  "use strict";

  function seeded(seed) {
    let h = 2166136261;
    for (const ch of String(seed || "digital")) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => {
      h += 0x6d2b79f5;
      let t = Math.imul(h ^ (h >>> 15), 1 | h);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Linhas (cristas) em uma caixa de largura 1 e altura 1.2: lista de trechos [[x, y], ...].
  function strokes(seed) {
    const rand = seeded(seed);
    const harmonics = Array.from({ length: 4 }, (_, i) => ({ k: i + 2, amp: 0.025 + rand() * 0.035, phase: rand() * 6.283 }));
    const gaps = Array.from({ length: 3 }, () => ({ k: 2 + Math.floor(rand() * 4), phase: rand() * 6.283 }));
    const tilt = (rand() - 0.5) * 0.35;
    const core = { x: (rand() - 0.5) * 0.12, y: (rand() - 0.5) * 0.12 };
    const rings = 12;
    const result = [];
    for (let i = 1; i <= rings; i += 1) {
      const r = i / rings;
      let run = [];
      const steps = 140;
      for (let s = 0; s <= steps; s += 1) {
        const a = (s / steps) * 6.2832;
        const wobble = harmonics.reduce((sum, h) => sum + h.amp * Math.sin(h.k * a + h.phase + i * 0.11), 0);
        const rho = r * (1 + wobble * r);
        const cut = gaps.reduce((sum, g) => sum + Math.sin(g.k * a + g.phase + i * 0.9), 0);
        // Mais aberta embaixo (ponta do dedo) e com interrupções leves nas cristas externas.
        const open = Math.sin(a) > 0.55 && r > 0.8;
        if (cut > 2.1 - r * 0.5 || open) {
          if (run.length > 3) result.push(run);
          run = [];
          continue;
        }
        const x = Math.cos(a) * rho * 0.5 + (1 - r) * core.x + Math.sin(a) * rho * tilt * 0.1;
        const y = Math.sin(a) * rho * 0.6 + (1 - r) * core.y;
        run.push([0.5 + x, 0.6 + y]);
      }
      if (run.length > 3) result.push(run);
    }
    return result;
  }

  function svg(seed, height, color = "#111") {
    const paths = strokes(seed).map((run) => `<polyline points="${run.map(([x, y]) => `${(x * 100).toFixed(1)},${(y * 100).toFixed(1)}`).join(" ")}"/>`).join("");
    return `<svg class="fingerprint-art" viewBox="0 0 100 120" height="${height}" width="${(height / 1.2).toFixed(1)}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }

  window.portalFingerprint = Object.freeze({ strokes, svg });
})();
