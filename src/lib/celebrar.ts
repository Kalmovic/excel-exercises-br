/** Confete. Respeita "reduzir movimento" do sistema operacional. */
async function confete() {
  return (await import("canvas-confetti")).default;
}

const CORES = ["#ffd23f", "#16181d", "#0f766e", "#fff6cc", "#ffffff"];

/** Estouro curto saindo de um elemento (ex.: o botão Verificar). */
export async function celebrarAcerto(origem?: HTMLElement | null) {
  const c = await confete();
  const r = origem?.getBoundingClientRect();
  const x = r ? (r.left + r.width / 2) / window.innerWidth : 0.5;
  const y = r ? (r.top + r.height / 2) / window.innerHeight : 0.6;
  c({
    particleCount: 70,
    spread: 70,
    startVelocity: 32,
    origin: { x, y },
    colors: CORES,
    scalar: 0.9,
    disableForReducedMotion: true,
  });
}

/** Chuva de confete dos dois lados, para o troféu. */
export async function celebrarTrofeu() {
  const c = await confete();
  const fim = Date.now() + 1600;
  const quadro = () => {
    c({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: CORES, disableForReducedMotion: true });
    c({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: CORES, disableForReducedMotion: true });
    if (Date.now() < fim) requestAnimationFrame(quadro);
  };
  quadro();
}
