import { VERSION_PERFILES, calcularCalibracion, descartarBolsa, perfilDe, uuidV7, type Conteo, type Lote } from "@contador/domain";
import type { Repositorio } from "../shared/datos/repositorio";
import { bolsaAlCerrar, enBolsa, reducir, ultimaBolsaValida, type Accion, type EstadoSesion } from "./sesion";

/** Alevinos que se cuentan a mano en la prueba. */
export const PRUEBA_A_MANO = 100;

/** Estado de la sesión que se actualiza al instante (dos toques seguidos ven el estado real). */
export function crearAlmacen(inicial: EstadoSesion) {
  let estado = inicial;
  const oyentes = new Set<() => void>();
  return {
    leer: () => estado,
    despachar(a: Accion) {
      estado = reducir(estado, a);
      oyentes.forEach((o) => o());
    },
    suscribir(oyente: () => void) {
      oyentes.add(oyente);
      return () => void oyentes.delete(oyente);
    },
  };
}

export type Almacen = ReturnType<typeof crearAlmacen>;

export interface Dependencias {
  repo: Repositorio;
  ahora?: () => Date;
  nuevoId?: () => string;
}

/**
 * Lo que hacen los botones: cambian el estado y guardan en el teléfono.
 * Si guardar falla, la app lo muestra («No se pudo guardar») en vez de callarlo.
 */
export function crearAcciones(almacen: Almacen, { repo, ahora = () => new Date(), nuevoId = () => uuidV7() }: Dependencias) {
  const { leer, despachar } = almacen;
  const guardar = (p: Promise<void>) =>
    p.then(
      () => despachar({ tipo: "guardado", ok: true }),
      () => despachar({ tipo: "guardado", ok: false }),
    );

  return {
    /** Lee el historial guardado; antes cierra un conteo que haya quedado abierto. */
    cargar: () =>
      repo
        .cerrarConteosAbiertos()
        .then(() => repo.leerHistorial())
        .then((historial) => despachar({ tipo: "cargarHistorial", historial }))
        .catch(() => despachar({ tipo: "guardado", ok: false })),

    /** Prueba de 100 buena → nace el lote con su factor. Devuelve false si la prueba no sirve. */
    aceptarPrueba(): boolean {
      const e = leer();
      if (!e.especie || !e.talla || e.pruebaApp === null) return false;
      const pasadas = [{ contadosAMano: PRUEBA_A_MANO, contadosPorApp: e.pruebaApp }];
      const r = calcularCalibracion(pasadas);
      if (!r.ok) return false;
      const lote: Lote = {
        id: nuevoId(),
        especie: e.especie,
        talla: e.talla,
        creadoEn: ahora().toISOString(),
        calibracion: { pasadas, factor: r.factor },
        perfilId: perfilDe(e.especie, e.talla).id,
        versionPerfiles: VERSION_PERFILES,
      };
      despachar({ tipo: "aceptarPrueba", lote });
      void guardar(repo.guardarLote(lote));
      return true;
    },

    empezarConteo(): boolean {
      const e = leer();
      if (!e.lote) return false;
      const conteo: Conteo = { id: nuevoId(), loteId: e.lote.id, metaPorBolsa: e.meta, inicio: ahora().toISOString(), fin: null };
      despachar({ tipo: "empezarConteo", conteo });
      void guardar(repo.guardarConteo(conteo));
      // Pide al navegador que no borre los datos de la app cuando le falte espacio.
      void navigator.storage?.persist?.().catch(() => {});
      return true;
    },

    /** La bolsa se guarda al cerrarse: un corte de batería no borra lo ya contado. Una bolsa vacía no se cierra. */
    cerrarBolsa(): boolean {
      if (enBolsa(leer()) === 0) return false;
      const id = nuevoId();
      const cerradaEn = ahora().toISOString();
      const bolsa = bolsaAlCerrar(leer(), id, cerradaEn);
      if (!bolsa) return false;
      despachar({ tipo: "cerrarBolsa", id, cerradaEn });
      void guardar(repo.guardarBolsa(bolsa));
      return true;
    },

    /** La bolsa no se borra: queda descartada en el historial y su conteo vuelve al contador. */
    deshacerCierre() {
      const ultima = ultimaBolsaValida(leer());
      if (!ultima) return;
      despachar({ tipo: "deshacerCierre" });
      void guardar(repo.guardarBolsa(descartarBolsa(ultima)));
    },

    terminar(): boolean {
      const e = leer();
      if (!e.conteo) return false;
      const fin = ahora().toISOString();
      const conteo = { ...e.conteo, fin };
      despachar({ tipo: "terminar", fin });
      void guardar(repo.guardarConteo(conteo));
      return true;
    },
  };
}

export type Acciones = ReturnType<typeof crearAcciones>;
