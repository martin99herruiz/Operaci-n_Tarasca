# Defensa 3 - Explicacion de cambios

Este documento resume los cambios realizados para cumplir y defender la **Defensa 3** de la practica. Segun el guion, en esta defensa se debe tener:

- El laberinto.
- El pick-up articulado y animado.
- La camara en primera persona y el movimiento por el laberinto.
- La recogida de pick-ups.

Ademas, se han incorporado algunas mejoras y ayudas de prueba para facilitar la demostracion.

## Laberinto

El laberinto se implementa en `Laberinto/Laberinto.js`.

La clase `Laberinto` carga el mapa desde el fichero `laberinto.txt`. En ese fichero:

- `X` representa una celda con muro.
- Un espacio representa una celda libre.

El texto se transforma en una matriz interna. Despues, se recorre esa matriz y se crea un cubo por cada celda marcada como muro.

Tambien se centra el laberinto en el origen de coordenadas. Esto facilita colocar al jugador, los pick-ups y la puerta usando coordenadas de celda.

### Colisiones con muros

Para evitar que el jugador atraviese paredes, se implementa el metodo `puedeMoverseA()`.

Este metodo no comprueba solo el centro del jugador. En su lugar, comprueba cuatro puntos alrededor de la posicion de la camara, usando un radio aproximado del jugador.

Si cualquiera de esos puntos cae dentro de una celda con muro, el movimiento se bloquea.

Esto permite simular que el jugador tiene volumen y no puede atravesar los muros del laberinto.

## Camara en primera persona

La camara principal esta implementada en `Laberinto/MyScene.js`.

Se usa `PointerLockControls`, que permite controlar la mirada del jugador con el raton. El primer click bloquea el puntero y activa la vista en primera persona.

El movimiento se hace con teclado:

- `W` o flecha arriba: avanzar.
- `S` o flecha abajo: retroceder.

La direccion de movimiento se calcula a partir de la direccion en la que mira la camara. Se elimina la componente vertical para que el jugador solo se desplace por el plano del suelo.

El movimiento se aplica por ejes separados:

- Primero eje X.
- Despues eje Z.

Esto permite que el jugador pueda deslizarse por una pared si uno de los dos ejes sigue siendo valido.

## Pick-ups

En el juego se colocan cuatro pick-ups:

- Abanico.
- Farolillo.
- Castañuelas.
- Rebujito.

Todos se crean en `MyScene.js` cuando termina de cargar el laberinto.

Los pick-ups se colocan usando posiciones de celda. Para ello, el laberinto convierte cada fila y columna a coordenadas mundo mediante `getMundoFromCelda()`.

Tambien se aplican dos ajustes:

- `pickupMazeScale`: reduce el tamaño de los modelos para que encajen en el laberinto.
- `pickupVisualCenterHeight`: coloca todos los pick-ups a una altura visual similar.

Cada pick-up se guarda en el array `this.pickups`, que luego se usa para la recogida con raycaster.

## Recogida de pick-ups

La recogida se hace con un `Raycaster` desde el centro de la pantalla.

Cuando el jugador hace click:

1. Se lanza un rayo desde la camara.
2. Se comprueba si toca algun objeto de la lista `this.pickups`.
3. Se busca el objeto padre que tenga `userData.recogible`.
4. Se comprueba que el jugador este a menos de `interactionDistance`.
5. Si se cumplen las condiciones, el pick-up se marca como recogido.

Al recoger un objeto:

```js
objeto.recogido = true;
objeto.visible = false;
```

Tambien se actualiza el contador del HUD.

Esto cumple el requisito de recoger pick-ups con el raton solo si el jugador esta suficientemente cerca.

## Pick-up articulado y animado

El pick-up articulado principal es el `Abanico`, implementado en `pick-ups/Abanico.js`.

El abanico esta construido de forma jerarquica:

- Un grupo general.
- Varios modulos.
- Cada modulo tiene una varilla y una seccion de tela.

Las varillas no se mueven de forma independiente. Todas dependen de un mismo angulo de apertura, por lo que sus grados de libertad son no independientes.

La animacion modifica continuamente `anguloActual` usando una funcion seno. Despues, se recalculan las rotaciones de los modulos.

Con esto el abanico se abre y se cierra de manera continua, cumpliendo el requisito del pick-up articulado y animado.

## Castañuelas

Las castañuelas tambien tienen animacion.

Se implementan con dos pivotes:

```js
this.pivoteA
this.pivoteB
```

Cada mitad de la castañuela cuelga de uno de esos pivotes.

Durante la animacion, una mitad rota en un sentido y la otra en el contrario:

```js
this.pivoteA.rotation.x = apertura;
this.pivoteB.rotation.x = -apertura;
```

Esto produce un movimiento de apertura y cierre, sin giro general del objeto.

Tambien se añadieron cordeles unidos a cada mitad para que acompañen el movimiento.

## Rebujito

El rebujito tiene varias animaciones adicionales.

### Liquido

El liquido del vaso sube y baja como si el vaso se vaciara y se rellenase.

Esto se hace escalando el cilindro del liquido en el eje Y. Despues se recoloca su posicion vertical para que la base permanezca en el fondo del vaso.

Asi, el nivel superior del liquido es el que sube y baja.

### Hielos

Los hielos acompañan al nivel del liquido. Si el liquido baja, los hielos tambien bajan.

Ademas, se han separado en posiciones distintas dentro del vaso para que no se atraviesen visualmente.

Se usan parametros aproximados de colision:

```js
this.radioInteriorVaso = 0.57;
this.radioColisionHielo = 0.19;
this.distanciaMinimaHielos = this.radioColisionHielo * 2;
```

Tambien se aplican dos restricciones:

- `mantenerHielosDentroDelVaso()`: evita que los hielos atraviesen la pared del vaso.
- `separarHielos()`: evita que los hielos se acerquen demasiado entre ellos.

## Puerta

Aunque la puerta pertenece mas al conjunto final del juego, ya esta implementada.

La puerta se compone de:

- Marco.
- Hueco oscuro.
- Hoja.
- Pomo.

La hoja y el pomo se colocan dentro de `doorPivot`, para que roten juntos al abrirse.

La puerta solo se abre si:

1. El jugador apunta al pomo.
2. Esta suficientemente cerca.
3. Ha recogido todos los pick-ups.

La apertura se anima con `TWEEN`, interpolando una variable entre 0 y 1 y convirtiendola en una rotacion de la hoja.

## Ayudas de prueba

Para facilitar la defensa se añadieron teclas de depuracion:

- `F`: coloca al jugador frente a la puerta.
- `P`: va llevando al jugador de pick-up en pick-up.

Esto permite demostrar rapidamente:

- Que los pick-ups se pueden recoger.
- Que el contador funciona.
- Que la puerta no se abre si faltan pick-ups.
- Que la puerta se abre cuando ya se han recogido todos.

Tambien se añadio zoom con la rueda del raton modificando el FOV de la camara. Es una mejora de comodidad, no un requisito obligatorio.

## Estructura del codigo

La organizacion final queda separada por responsabilidades:

- `Laberinto.js`: carga del mapa, creacion de muros y colisiones.
- `MyScene.js`: escena principal, camaras, movimiento, interaccion, puerta, HUD y pick-ups.
- `Abanico.js`: pick-up articulado y animado.
- `Castanuelas.js`: animacion de apertura/cierre con pivotes.
- `Rebujito.js`: vaso, liquido animado, hielo y restricciones visuales.

Esta separacion ayuda a explicar la practica en defensa: primero el escenario, despues el movimiento, luego la interaccion y finalmente los modelos animados.

