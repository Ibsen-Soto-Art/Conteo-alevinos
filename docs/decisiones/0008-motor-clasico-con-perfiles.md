# 0008. Motor clásico con perfiles de especie, fondo aprendido y franja de conteo neto

- Estado: Aceptada
- Fecha: 2026-10-19
- Decide: Frezzer

## Contexto

En la primera prueba con alevinos reales en finca el motor clásico (umbral, manchas, rastreador y una línea) falló de cinco maneras: no conocía la forma de cada especie y contaba cosas que no eran alevinos (burbujas, basura, rayones); contaba dos veces a un alevino que se devolvía sobre la línea; perdía alevinos cuando el canal estaba muy inclinado; y un pangasius puesto de lado valía 3, porque el peso salía del área y la pista guardaba el peso máximo, o porque su sombra se partía en pedazos.

El detector entrenado (`ml/`, ADR 0002) todavía no tiene datos. Hace falta que el motor clásico sea confiable ya, y que mida bien para grabar esos datos.

## Decisión

Se mejora el motor clásico, sin entrenamiento, con:

1. **Perfiles por especie y tamaño** (`packages/domain/src/perfiles.ts`, versionados): cachama, pangasius, «Bocachico (Prochilodus)» y un perfil genérico para «Otra especie». Cada perfil trae rango de largo (cm), relación largo/ancho desde arriba y de lado, solidez mínima, cierre morfológico y velocidad esperada. Ver `docs/especies/perfiles.md`.
2. **Escala con 4 marcas** de 2 × 2 cm en las esquinas del canal: si se encuentran, la app sabe cuántos píxeles mide un centímetro y recorta la zona del canal. Si no, usa el perfil amplio y aprende del lote; la zona es el cuadro entero (antes era la zona iluminada más grande, que con luz de día salía en cualquier parte y cortaba la franja).
3. **La Prueba de 100 aprende el lote:** mediana y dispersión de largo, ancho, área y relación largo/ancho; el perfil se ajusta a ese lote para contar las bolsas.
4. **Fondo aprendido:** (cambiado en la [ADR 0009](0009-contar-sin-esperar-el-fondo.md): se cuenta desde el primer cuadro y el fondo se aprende mientras tanto) 3 segundos con el canal vacío (espera si ve movimiento) y luego actualización lenta en las zonas quietas. Se cuenta lo que es más oscuro que el fondo, no lo más oscuro que un umbral fijo.
5. **Filtro de forma:** cierre morfológico para unir pedazos; medidas por momentos (largo y ancho), solidez y anillos; se descarta lo que no cabe en el perfil, lo muy redondo (burbujas), lo poco sólido o irregular, y lo quieto. Cada descarte lleva su razón, visible en `/laboratorio`.
6. **Peso por forma, no por área:** una mancha vale 1 si su largo es el de un alevino, aunque su área sea grande (de lado). Vale 2 o más solo si el largo o el ancho superan claramente a un alevino o si se ven dos cuerpos. El peso de una pista es la **mediana** de sus cuadros, no el máximo. Los pedazos alineados que juntos miden un alevino se unen.
7. **Franja de conteo con conteo neto:** dos bordes; una pista suma al pasar de arriba a abajo y resta al pasar de abajo a arriba (sin bajar nunca de lo que ella misma sumó); lo de adentro no cuenta. Una pista solo cuenta si se vio en al menos 3 cuadros seguidos moviéndose con el flujo. Las pistas perdidas por un momento se recuperan con su historia.
8. **Velocidad:** cámara a la mayor cantidad de cuadros por segundo posible (60 si se puede), ancho de franja para que un alevino a la velocidad máxima se vea en al menos 3 cuadros dentro de ella, y aviso «Muy rápido: baje la inclinación» con un indicador verde, ámbar o rojo en Contando.

## Alternativas descartadas

- **Esperar al detector entrenado:** sin videos de finca no hay con qué entrenar, y sin un motor confiable no se pueden grabar ni medir.
- **Seguir con el peso por área:** es justo lo que hizo valer 3 a un pangasius de lado.
- **Línea simple sin resta:** cuenta doble a los que se devuelven.
- **Identificar la especie por la silueta:** con luz por debajo no se ven color, manchas ni barbillas; la especie la elige el campesino.

## Consecuencias

- Más filtros también pueden **dejar de contar** alevinos reales; por eso `pnpm precision` reporta por especie los contados de más y de menos, y videos negativos (vacío, burbujas, basura).
- Un pez de lado y dos pegados lado a lado tienen el mismo largo y casi el mismo ancho, sobre todo en cachama; se separan por la forma (un cuerpo liso contra dos lomos). Hay que medirlo con videos reales; el detector entrenado es la solución de fondo.
- Los valores de los perfiles son estimados y se ajustan con datos de finca; cada lote guarda la versión de perfiles con la que se contó.
