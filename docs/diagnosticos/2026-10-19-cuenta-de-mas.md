# Diagnóstico: la app cuenta de más (50 objetos → 64)

- Fecha: 2026-10-19
- Caso en campo: objetos de prueba, perfil «Cachama pequeño», pasados en grupo y despacio, en la Prueba de 100. A mano 50, la app 64 (+28 %).
- No hay video de ese caso: cada causa se probó con escenarios sintéticos y con el registro de eventos nuevo del motor (quién cambió el contador, cuánto y por qué). Para confirmar cuál pasó en campo, grabar el mismo caso y procesarlo en `/laboratorio` cuadro por cuadro (ver abajo).

## Causas, una por una

| # | Causa | ¿Ocurre? | Evidencia | Aporte medido |
| --- | --- | --- | --- | --- |
| 1 | Un objeto cuenta 2 por largo | **Sí** | Con marcas (16 px/cm) y perfil pequeño (1–3 cm ± 20 % = hasta 3,6 cm), un objeto de 3,3 a 3,6 cm valía 2: `pesoPorForma` (`forma.ts`) usaba «más de 1,5 largos típicos» y `clasificar` acepta hasta 3,6 cm como uno solo. | Tallas de 2 a 3,6 cm: **50 → 60 (+20 %)**; todos de 3,5 cm: **+100 %**. Es la causa que mejor explica +28 %. |
| 2 | El rastreador pierde el ID y el mismo cruza dos veces | **Sí** | Dos contados se pegan debajo de la franja, suben juntos (una sola mancha) y se separan arriba: la pista que se perdió al pegarse no restó al subir y al separarse nacieron dos nuevas: **2 → 3**. | +1 por cada vez que pasa; depende de cuánto se devuelvan. |
| 3 | Un objeto partido en pedazos que no se unen | **Sí, sin marcas** | Sin marcas el motor no sabe el largo típico y `unirPedazos` no unía nada: un objeto partido en 2 contaba 2. Con marcas ya se unían. | Objeto partido en 2: **10 → 20 (+100 %)**. |
| 4 | Falsos positivos (burbujas, basura, bordes, sombras) | No en lo probado | Burbujas, cruces y paredes oscuras del canal en el recorte (también en los primeros segundos sin fondo): 0 de más. Reflejos (claros) no se detectan; una mano se descarta por tamaño. | 0 |
| 5 | Un objeto quieto se vuelve fondo y al moverse cuenta de nuevo | No | Quieto 5 s antes de la franja o dentro de ella y luego baja: cuenta 1. | 0 |
| 6 | El sentido del agua cuenta doble mientras decide | No | La pantalla muestra el menor de los dos conteos (pruebas en `sentido.test.ts`). | 0 |
| 7 | El factor de la Prueba de 100 infla el número | No en este caso | En la Prueba de 100 el número es crudo, sin factor. En Contando el factor va de 0,90 a 1,10 (`calibracion.ts`): como mucho +10 %. | 0 (en la prueba) |
| 8 | Otra: dos pegados que se separan justo al salir de la franja | **Sí** | La mancha pegada se contaba con peso 2 (el de los cuadros anteriores) y el que se separó, nacido dentro de la franja, sumaba 1 más: **2 → 3**. Un «parpadeo» (se separan, se pegan un cuadro y se separan otra vez) producía lo mismo. | +1 por cada vez que pasa. |

## Qué se cambió

1. **Peso por largo** (`forma.ts`): para valer 2 por largo hace falta medir al menos 1,75 largos típicos y un 10 % más que el largo máximo de uno del perfil. Dos en fila (cola con cabeza, ~2 largos) siguen valiendo 2.
2. **Pedazos sin marcas** (`forma.ts`): se unen si juntos tienen la forma de un alevino del perfil visto desde arriba, van uno detrás del otro, el hueco es corto y no son dos objetos que ya tienen forma de alevino entero cada uno (en un grupo apretado de objetos rechonchos, unirlos contaba 27 de 50).
3. **Pegados y separados** (`rastreador.ts`, `motor.ts`):
   - si una pista desaparece justo donde la mancha de al lado crece de golpe, va «llevada» por esa mancha: se mueve y cruza la franja con ella (resta si suben, suma si bajan) y recupera su número al separarse; mientras lleva a otras, la mancha cuenta solo por ella;
   - si nace una pista donde una mancha se achicó de golpe, es un pedazo de ella: hereda su lado de la franja y su saldo, y el peso se reparte (si la mancha ya estaba contada, entre las dos suman lo mismo);
   - si la mancha que se achica llevaba pistas pegadas, el pedazo que sale es una de ellas, no una pista nueva.

Pruebas que reproducen cada caso (fallaban antes del arreglo): `packages/counting-engine/test/exceso.test.ts`.

## Lo que no cambió

«Solo sube = 0», los regresos que restan, el pangasius de lado (pesa 1), dos pegados lado a lado (2), tres separados (3), el pez partido en 3 con marcas (1) y el sentido automático: todas sus pruebas siguen igual.

## Pendiente (cuenta de menos, no de más)

En las mismas simulaciones aparecieron dos casos que cuentan **de menos**: sin marcas y con tallas disparejas (2 a 3,6 cm) 40 de 50, y grupos apretados de objetos anchos (32 × 10 px) entre 40 y 49 de 50. Se revisan aparte.

## Cómo confirmarlo en campo

1. Revise el montaje: las 4 marcas de 2 × 2 cm, luz pareja, celular fijo (`docs/hardware/canal.md`).
2. Cuente a mano 50 objetos dos veces. Mida 5 con regla: anote el más corto y el más largo.
3. Elija la talla que corresponde a ese largo (pequeño 1–3 cm, mediano 3–5, grande 5–8).
4. Grabe un video con la cámara normal (los primeros segundos con el canal vacío) mientras pasan, igual que en la prueba (en grupo, despacio).
5. Haga en la app la Prueba de 100 con esos 50 y anote lo que cuenta.
6. En el computador, abra `/laboratorio`, elija el mismo perfil, cargue el video y toque «Procesar cuadro por cuadro». Revise que diga «Canal: 4 marcas».
7. Al terminar compare el total con 50. Si sobra, mire el registro: cada fila con peso mayor que 1, «nació en la franja», «se separó de», «pegada a» o «recuperada» dice qué causa fue. Toque «Descargar CSV» y guárdelo con el video.
