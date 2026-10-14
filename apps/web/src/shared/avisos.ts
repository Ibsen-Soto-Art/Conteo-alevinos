/** Vibración y sonido para avisar sin tener que mirar la pantalla. Todo falla en silencio. */

let audio: AudioContext | null = null;

/** Los navegadores solo dejan sonar después de un toque: se llama desde un botón. */
export function prepararSonido() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    audio = null;
  }
}

function pitar(inicio: number, duracion: number, frecuencia: number) {
  if (!audio) return;
  const osc = audio.createOscillator();
  const vol = audio.createGain();
  osc.type = "square";
  osc.frequency.value = frecuencia;
  vol.gain.setValueAtTime(0.25, inicio);
  vol.gain.exponentialRampToValueAtTime(0.001, inicio + duracion);
  osc.connect(vol).connect(audio.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion);
}

export function vibrar(patron: number | number[]) {
  try {
    navigator.vibrate?.(patron);
  } catch {
    // iPhone no vibra desde una página web.
  }
}

/** Llegó a la meta de la bolsa: tres pitos y tres vibraciones. */
export function avisarMeta() {
  vibrar([300, 120, 300, 120, 300]);
  prepararSonido();
  if (!audio) return;
  const t = audio.currentTime;
  for (let i = 0; i < 3; i++) pitar(t + i * 0.25, 0.18, 1046);
}
