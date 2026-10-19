# Perfiles de especie para el motor de conteo

Resumen de lo útil del documento [Caracterizacion_ictiologica_alevinos_tres_especies.docx](Caracterizacion_ictiologica_alevinos_tres_especies.docx) para **contar con la cámara**, y los valores con los que arranca cada perfil. Los perfiles viven en el código en `packages/domain/src/perfiles.ts` (versionados); este documento explica de dónde salen.

## Qué ve la cámara

El celular mira el canal desde arriba y la luz LED viene de abajo. La cámara solo ve la **silueta oscura** del alevino:

- **Sí se ve:** el largo, el ancho visto desde arriba, el contorno (aletas grandes, cola), y si el pez se pone de lado (la silueta se hace mucho más ancha).
- **No se ve:** el color, las manchas redondeadas de la cachama, las bandas del pangasius, las barbillas, la boca y los labios. Todo lo que el documento usa para **identificar** la especie no sirve para la cámara.

Por eso la app **no adivina la especie**: el campesino la elige. El perfil sirve para saber **qué forma y qué tamaño tiene un alevino de verdad** y descartar lo demás (burbujas, hojas, basura, sombras), y para saber cuándo una mancha son dos alevinos y cuándo es uno de lado.

## Lo que dice el documento (y sirve)

| | Pangasius | Cachama | Bocachico |
| --- | --- | --- | --- |
| Especie del documento | *Pangasianodon hypophthalmus* | *Piaractus brachypomus* (cachama blanca) | *Prochilodus nigricans* |
| Forma general | Alargada, tipo bagre; **cabeza ancha y aplanada** respecto al tronco | Pasa de alargada a **alta y comprimida** con la edad | **Fusiforme y alargada**, perfil dorsal convexo |
| Vista desde arriba (dorsal) | Cuerpo **estrecho y alargado**, más ancho en la cabeza | **Angosta** (el cuerpo es comprimido de lado); ancho detrás de la cabeza | **Eje alargado**, simétrica |
| Tallas medidas en los estudios | 3,0 mm al eclosionar · 12,9 mm día 13 · 23,4 mm día 25 | 2,92 a 48,61 mm de longitud estándar (larvas a juveniles) | Larvas 3,28–26,73 mm · juveniles 28,99–42,90 mm |
| Algo que afecta la silueta | Aletas gris oscuro y **bandas oscuras** que, con la luz por debajo, pueden partir la sombra en pedazos | Con la edad el cuerpo es **muy alto**: de lado se ve casi la mitad de ancho que de largo | Pigmentación tenue en larvas |

Advertencias del propio documento que aplican aquí:

- Las tallas son **de los estudios y sus condiciones**, no una tabla universal. No se deben trasladar entre criaderos, temperaturas o sistemas.
- No hay una sola apariencia de «alevino»: la talla, la edad, el alimento y la luz cambian la forma.
- Son larvas y juveniles de laboratorio: muchos alevinos que se venden son más grandes que esas tallas.

## Bocachico: un solo perfil «Bocachico (Prochilodus)»

En Colombia se venden como bocachico varias especies del género *Prochilodus* (por ejemplo *P. magdalenae*, *P. nigricans*, *P. mariae*, *P. reticulatus*). En estado alevino se parecen mucho y la silueta no permite separarlas. Por eso:

- En la app el campesino elige solo **«Bocachico»**, y hay **un perfil** «Bocachico (Prochilodus)» con rangos un poco más amplios que los de *P. nigricans*, para cubrirlas a todas.
- En los videos de entrenamiento y de precisión hay una columna opcional **`especie_exacta`** (por ejemplo `Prochilodus magdalenae`) para ver más adelante si alguna se comporta distinto.

## Tamaños

El documento no define «pequeño», «mediano» y «grande». Se usan estos largos totales (aprobados para empezar; la Prueba de 100 los ajusta a cada lote):

| Tamaño | Largo total |
| --- | --- |
| Pequeño | 1 a 3 cm |
| Mediano | 3 a 5 cm |
| Grande | 5 a 8 cm |

El perfil acepta un 20 % más a cada lado (pequeño de 0,8 a 3,6 cm, etc.), porque un lote nunca es parejo.

## Lo que el perfil necesita y el documento no trae (estimado)

El documento no da el **ancho visto desde arriba**, la **relación largo/ancho**, el **área** ni la **solidez**. Estos valores los estimé a partir de la forma que describe y de la forma conocida de cada especie. **Son el punto de partida, no medidas**: se corrigen con los videos de la finca y la Prueba de 100.

| | Pangasius | Cachama | Bocachico (Prochilodus) | Otra especie |
| --- | --- | --- | --- | --- |
| Largo / ancho visto desde arriba | 4,5 a 8 | 4 a 9 | 4 a 7,5 | 2,5 a 10 |
| Largo / ancho visto de lado (el «alto» del pez) | 3,5 a 5,5 | 1,8 a 3,0 | 2,6 a 4,2 | 1,6 a 6 |
| Solidez mínima | 0,55 | 0,65 | 0,65 | 0,55 |
| Cierre morfológico (fracción del ancho típico) | 0,35 | 0,25 | 0,25 | 0,30 |

Por qué así:

- **Pangasius:** la cabeza ancha y aplanada hace que desde arriba no sea tan delgado como la cachama; las aletas casi transparentes y las bandas oscuras recortan la silueta, así que su solidez es más baja y necesita un **cierre** más fuerte para unir cabeza, cuerpo y cola.
- **Cachama:** comprimida de lado, desde arriba es **angosta** (relación alta); pero de lado es **muy alta** (relación baja, 1,8 a 3). Es la especie en la que un pez de lado más se parece a dos pegados.
- **Bocachico:** fusiforme, intermedio; rangos ampliados para cubrir el género.
- **Otra especie:** perfil genérico, muy amplio.

Otros valores de todos los perfiles:

- **Área:** sale del largo y el ancho (área ≈ 0,65 × largo × ancho, la fracción que llena una silueta de pez dentro de su rectángulo). El mínimo usa el pez más delgado visto desde arriba; el máximo, el más grande visto de lado.
- **Solidez** = área de la mancha ÷ área de su envolvente convexa. Una silueta de pez da 0,7 a 0,9; hojas, heces y basura, menos.
- **Burbuja:** casi redonda (largo/ancho menor que 1,6) o un **anillo con el centro claro**. Ningún alevino tiene esa forma, ni de lado.
- **Velocidad esperada** en el canal: típica 15 cm/s y máxima 25 (pequeño), 35 (mediano) o 45 cm/s (grande). Sirve para el ancho de la franja de conteo y para avisar «Muy rápido».

## Cómo se ajusta en la finca

1. Si el canal tiene las **4 marcas** de cinta negra de 2 × 2 cm en las esquinas ([docs/hardware/canal.md](../hardware/canal.md)), la app calcula cuántos píxeles mide un centímetro y usa los largos en cm del perfil.
2. Sin marcas, arranca con el perfil amplio (solo forma, sin tamaño en cm).
3. La **Prueba de 100** mide en el lote real la mediana y la dispersión del largo, el ancho, el área y la relación largo/ancho, y ajusta el perfil **para ese lote**. Ese perfil ajustado se usa al contar las bolsas.
4. Los videos de precisión (`pnpm precision`) dicen si los rangos sirven: cuántos se contaron de más y de menos por especie.

## Fuentes

Las del documento original (sección 9): Morioka et al. 2010 (*P. hypophthalmus*); estudio de ontogenia temprana de *P. brachypomus* (PubMed 2022); da Silva et al. 2022 (*P. nigricans*); FishBase; Animal Diversity Web; Mendoza Roldán et al. 2012.
