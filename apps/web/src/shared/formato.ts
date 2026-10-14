const numero = new Intl.NumberFormat("es-CO", { useGrouping: "always", maximumFractionDigits: 0 });

/** 1000 → «1.000». En español, sin «always» los números de 4 cifras no llevan punto. */
export function formatear(n: number): string {
  return numero.format(n);
}

/** «1 bolsa», «12 bolsas». */
export function bolsas(n: number): string {
  return `${formatear(n)} ${n === 1 ? "bolsa" : "bolsas"}`;
}

/** «hoy 3:40 p. m.», «ayer» o «12 de octubre». */
export function cuando(fecha: Date, ahora = new Date()): string {
  const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((dia(ahora) - dia(fecha)) / 86_400_000);
  const hora = fecha.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
  if (dias === 0) return `hoy ${hora}`;
  if (dias === 1) return `ayer ${hora}`;
  return fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long" });
}
