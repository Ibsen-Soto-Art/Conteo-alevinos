# 0010. La app averigua sola hacia dónde corre el agua

- Estado: Aceptada
- Fecha: 2026-10-19
- Decide: Frezzer

## Contexto

La franja de conteo iba siempre al 75 % del canal, de arriba hacia abajo en la imagen. En algunos celulares la línea amarilla salía arriba y en otros abajo: depende de cómo se monta el celular (si su parte de arriba apunta a la entrada o a la salida del canal), de la zona del canal que encuentra la app y de ajustes guardados en `/laboratorio` en ese teléfono. Con el celular al revés, el agua sube en la imagen, la franja queda junto a la entrada y el conteo neto da casi 0.

## Decisión

- La app del campesino **averigua el sentido**: mientras no lo sabe, el motor cuenta a la vez con el agua bajando y subiendo (cada sentido con su rastreador y su franja cerca de su salida) e informa el que lleva más. Cuando las manchas que se mueven avanzaron entre todas 1,5 largos del canal hacia un lado, se queda con ese sentido. No se pierde ningún alevino mientras decide.
- Mientras averigua, la pantalla muestra **el menor de los dos conteos**: el número nunca se pasa (puede ir un poco atrasado y ponerse al día al decidir), y la franja es la del sentido de partida.
- Se vuelve a averiguar cada vez que se abre la cámara (pantalla nueva o se movió el celular). El **último sentido decidido se guarda en el teléfono** y es el punto de partida del siguiente conteo (con la franja cerca de su salida): para confirmarlo basta la mitad del avance (0,75 largos del canal); para corregirlo hace falta lo mismo de siempre (1,5).
- La app del campesino no usa el sentido, la posición ni el ancho de la franja guardados en `/laboratorio`; sí los ajustes de detección (umbral, área mínima, distancia).
- `/laboratorio` y `pnpm precision` lo hacen igual, salvo que se pida un sentido fijo.
- De paso: lo que el motor resta (un alevino ya contado que se devuelve) también se resta en la pantalla, sin bajar de 0.

## Alternativas descartadas

- Franja fija con una flecha en pantalla «el agua entra por aquí»: depende de que el campesino monte siempre igual el celular.
- Decidir con los primeros alevinos y contar solo después: se pierden esos alevinos.
- Guardar cada cruce con su dirección y recalcularlos al decidir: los dos conteos en paralelo ya lo hacen, y con la franja de cada sentido en su sitio (un recálculo usaría la franja provisional).
- Mostrar el que va ganando mientras averigua: con el celular al revés, un alevino contra la corriente se veía sumar y luego desaparecer.

## Consecuencias

- El canal debe ser más largo que ancho en la imagen: solo se prueban los dos sentidos a lo largo del canal.
- Un alevino que nada contra la corriente no cambia la decisión (cuenta el avance de todas las manchas).
