# Elementos usados fuera del temario

Este documento resume las partes del codigo que pueden considerarse fuera, o al menos no explicadas de forma directa, en los apuntes `L5.pdf`, `L6.pdf`, `L8.pdf` y `L9.pdf`.

El objetivo no es decir que esten mal usadas, sino tener preparada una justificacion clara para la defensa.

## Que si esta relacionado con el temario

Antes de listar lo que se sale del temario, conviene tener claro que muchas cosas importantes si aparecen en las transparencias.

### Animacion

Relacionado con `L5.pdf`.

En el codigo usamos animacion mediante:

- Metodo `update()`.
- Tiempo transcurrido con `delta`.
- Funciones seno para movimientos ciclicos.
- `TWEEN` para animaciones interpoladas, como la apertura de la puerta.
- Curvas tipo `CatmullRomCurve3` en algunos modelos.

Esto encaja con la parte de animacion vista en teoria, donde se explican animaciones por actualizacion continua, interpolacion y trayectorias.

### Interaccion

Relacionado con `L6.pdf`.

En el codigo usamos:

- Eventos de teclado.
- Eventos de raton.
- Rueda del raton.
- `Raycaster` para seleccionar objetos.
- `userData` para marcar objetos recogibles.
- `Box3` para calcular cajas envolventes.

Esto entra dentro de la parte de interaccion, seleccion de objetos y gestion de eventos.

### Materiales y texturas

Relacionado con `L8.pdf`.

En los modelos usamos:

- `MeshStandardMaterial`.
- `MeshPhysicalMaterial`.
- Transparencia.
- Mapas de textura.
- Mapas de relieve.
- Repeticion de texturas con `RepeatWrapping`.

Esto esta relacionado con los materiales fisicos y el uso de texturas explicado en teoria.

### Camaras, luces y vistas

Relacionado con `L9.pdf`.

En el juego usamos:

- `PerspectiveCamera` para la vista principal.
- `OrthographicCamera` para el minimapa.
- Varias luces: ambiental, direccional y puntual.
- Sombras.
- `PointerLockControls` para la camara en primera persona.
- Varios viewports para renderizar la escena principal y el minimapa.

Esto esta bastante alineado con la parte de camaras, luces, sombras y controles de camara.

## Elementos no explicados directamente en el temario

### CSG con `three-bvh-csg`

Se usa principalmente en `pick-ups/Castanuelas.js`.

El codigo importa:

```js
import { ADDITION, Brush, Evaluator, SUBTRACTION } from '../libs/three-bvh-csg.js';
```

Esto sirve para hacer operaciones booleanas entre geometria:

- Sumar volumenes.
- Restar volumenes.
- Crear cortes.
- Generar formas mas complejas a partir de primitivas simples.

En las castañuelas se usa para conseguir una forma mas trabajada, con huecos y curvatura, en lugar de limitarse a una esfera o cilindro deformado.

Justificacion para la defensa:

> He usado CSG como una extension de modelado geometrico. El temario explica primitivas, transformaciones y jerarquias, y CSG me permite construir una pieza mas compleja combinando y restando volumenes. No cambia la logica principal de la practica, solo mejora el modelado del pick-up.

### `dat.GUI`

Se usa para crear controles de depuracion y ajuste en tiempo real.

En el codigo aparece como:

```js
import { GUI } from '../libs/dat.gui.module.js';
```

Sirve para modificar parametros sin tener que cambiar el codigo y recargar la pagina.

En nuestro caso se ha usado para controles como:

- Velocidad del jugador.
- Mostrar u ocultar el minimapa.

Justificacion para la defensa:

> `dat.GUI` no forma parte esencial de la practica. Lo he usado como herramienta auxiliar para probar valores rapidamente durante el desarrollo. La escena funcionaria igual sin GUI, pero facilita ajustar parametros y demostrar opciones.

### `OrbitControls`

Se usa en el visor independiente de pick-ups, no como control principal del juego.

El juego principal usa `PointerLockControls`, que si aparece en la teoria de camaras y controles.

`OrbitControls` permite orbitar alrededor de un modelo para verlo desde todos los angulos. Es util para probar los pick-ups de forma aislada.

Justificacion para la defensa:

> `OrbitControls` lo he usado solo como visor auxiliar para inspeccionar modelos. En el juego final el control importante es `PointerLockControls`, que es el apropiado para la camara en primera persona. `OrbitControls` no afecta a la mecanica principal.

### `CanvasTexture`

Se usa para generar texturas desde un canvas HTML en tiempo de ejecucion.

El temario explica texturas, mapas y materiales, pero no necesariamente la generacion procedural de texturas con canvas.

La idea es crear una imagen por codigo y convertirla en textura:

```js
const textura = new THREE.CanvasTexture(canvas);
```

Esto evita depender siempre de una imagen externa y permite crear patrones personalizados.

Justificacion para la defensa:

> Es una aplicacion del concepto de textura visto en teoria. En lugar de cargar la textura desde un fichero de imagen, la genero con un canvas y la aplico al material. El uso final sigue siendo el mismo: un mapa de textura sobre una geometria.

### `FileLoader` para cargar el laberinto

Se usa en `Laberinto/Laberinto.js` para leer `laberinto.txt`.

La ventaja es que el mapa del laberinto queda separado del codigo. Asi se puede cambiar el diseño del laberinto editando el fichero de texto, sin tocar la logica de Three.js.

Justificacion para la defensa:

> He usado `FileLoader` para separar datos y codigo. El laberinto se define en un fichero de texto y el programa lo interpreta. Esto hace que el proyecto sea mas mantenible y permite modificar el mapa facilmente.

### Teclas de depuracion `F` y `P`

Se han anadido teclas auxiliares para facilitar las pruebas:

- `F`: coloca al jugador frente a la puerta.
- `P`: lleva al jugador de un pick-up al siguiente.

No son requisitos de la practica, sino ayudas para comprobar rapidamente el funcionamiento.

Justificacion para la defensa:

> Estas teclas son herramientas de prueba. Las anadi para poder demostrar de forma rapida que los pick-ups se recogen, que el contador se actualiza y que la puerta solo se abre cuando toca. No son parte obligatoria de la mecanica final.

### Restricciones aproximadas de los hielos

En `pick-ups/Rebujito.js` los hielos se tratan como bloques con una colision visual aproximada.

No se usa un motor fisico completo. En su lugar se aplican restricciones manuales:

- Separar hielos si estan demasiado cerca.
- Mantenerlos dentro del radio interior del vaso.
- Moverlos junto al nivel del liquido.

Justificacion para la defensa:

> No he usado un motor fisico externo. He implementado restricciones geometricas sencillas porque para la practica bastaba con evitar que los hielos se atravesaran visualmente. Es una aproximacion controlada y suficiente para el modelo.

## Elementos que pueden parecer externos, pero estan justificados por teoria

### Zoom con la rueda del raton

El zoom se hace modificando el FOV de la camara.

Aunque el zoom concreto no sea un requisito obligatorio, se apoya en dos cosas del temario:

- Evento `wheel`, dentro de interaccion con raton.
- Parametros de camara en perspectiva.

Justificacion:

> El zoom es una mejora de comodidad. Tecnica y conceptualmente se basa en eventos de raton y en modificar la proyeccion de la camara, contenidos relacionados con la teoria.

### `PointerLockControls`

Aunque es una clase especifica de Three.js, aparece dentro del bloque de controles de camara visto en teoria.

Justificacion:

> Es el control adecuado para una experiencia en primera persona, porque bloquea el cursor y permite mover la vista como en un juego.

### `Raycaster`

Se usa para recoger pick-ups y abrir la puerta al apuntar al pomo.

Esto esta directamente relacionado con la seleccion de objetos por raton vista en teoria.

Justificacion:

> El raycaster permite saber que objeto esta mirando el jugador. Lo uso para que la interaccion no sea automatica, sino dependiente de apuntar y estar cerca.

## Resumen rapido para la defensa

Si preguntan que se ha usado fuera del temario, la respuesta corta seria:

- CSG con `three-bvh-csg`, para modelar mejor las castañuelas.
- `dat.GUI`, como herramienta auxiliar de depuracion.
- `OrbitControls`, solo en el visor de pick-ups.
- `CanvasTexture`, para generar texturas por codigo.
- `FileLoader`, para cargar el laberinto desde un fichero de texto.
- Teclas `F` y `P`, solo como ayudas de prueba.
- Restricciones manuales en los hielos, como aproximacion sin motor fisico.

La justificacion general es que estas partes no sustituyen los contenidos de la asignatura, sino que los complementan para mejorar el modelado, facilitar pruebas o separar mejor los datos del codigo.
