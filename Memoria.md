# Memoria del proyecto - Operacion Tarasca

## Datos del proyecto

- Asignatura: Sistemas Graficos.
- Curso: 2025/2026.
- Proyecto: Juego basado en laberinto desarrollado con Three.js.
- Titulo del juego: Operacion Tarasca.
- Entrega final: convocatoria ordinaria.

## 1. Introduccion

El proyecto consiste en un juego en primera persona basado en un laberinto. El jugador debe recorrer el escenario, encontrar y recoger varios pick-ups, y finalmente abrir una puerta de salida.

La puerta solo puede abrirse cuando se han recogido todos los pick-ups y el jugador esta lo suficientemente cerca del pomo. La interaccion se realiza mediante raton y teclado, cumpliendo los requisitos principales del guion de practicas.

El desarrollo se ha realizado en JavaScript usando Three.js. El proyecto incluye una aplicacion principal para el juego y un visor independiente para comprobar los pick-ups por separado.

## 2. Documento de la defensa 1

En esta seccion debe incorporarse el documento entregado en la Defensa 1, incluyendo las correcciones indicadas por el profesor si las hubiera.

Pendiente de completar con:

- Descripcion inicial del juego.
- Tematica elegida.
- Pick-ups propuestos.
- Correcciones recibidas del profesor.

## 3. Estructura del proyecto

La estructura principal del proyecto esta organizada por responsabilidades:

- `Laberinto/`: contiene el juego principal.
- `Laberinto/index.html`: pagina de entrada del juego.
- `Laberinto/MyScene.js`: escena principal, camaras, movimiento, interaccion, puerta, luces, HUD y pick-ups.
- `Laberinto/Laberinto.js`: carga del mapa, generacion de muros y colisiones.
- `Laberinto/laberinto.txt`: definicion textual del laberinto.
- `pick-ups/`: contiene los modelos de los pick-ups y su visor independiente.
- `pick-ups/index.html`: pagina para visualizar los pick-ups por separado.
- `pick-ups/index.js`: escena auxiliar para inspeccionar los modelos.
- `libs/`: bibliotecas usadas por Three.js y utilidades complementarias.
- `imgs/`: imagenes usadas como texturas.

Esta separacion permite aislar el codigo del laberinto, la escena principal y los objetos modelados.

## 4. Descripcion general del juego

El jugador aparece dentro de un laberinto en primera persona. Debe desplazarse por los pasillos, localizar los pick-ups y recogerlos con el raton.

Los pick-ups implementados son:

- Abanico.
- Farolillo.
- Castañuelas.
- Rebujito.

Cuando todos los pick-ups han sido recogidos, el jugador puede dirigirse a la puerta final y abrirla haciendo click sobre el pomo.

El juego incluye tambien un minimapa superior que permite ver la distribucion completa del laberinto.

## 5. Laberinto

El laberinto se implementa en `Laberinto/Laberinto.js`.

El mapa se carga desde el fichero `laberinto.txt`, donde cada caracter representa una celda:

- `X`: muro.
- Espacio en blanco: zona transitable.

El fichero se interpreta como una matriz de filas y columnas. A partir de esa matriz se generan cubos para las paredes del laberinto.

Para facilitar la colocacion de elementos, el laberinto dispone de funciones que convierten coordenadas de celda a coordenadas mundo. Esto se usa para posicionar el jugador, los pick-ups y la puerta.

## 6. Movimiento del jugador

El movimiento del jugador se implementa en `Laberinto/MyScene.js`.

La camara principal usa `PointerLockControls`, de forma que el raton controla la direccion de la mirada. El jugador se desplaza usando teclado:

- `W` o flecha arriba: avanzar.
- `S` o flecha abajo: retroceder.

La direccion de avance se obtiene a partir de la direccion de la camara. Para evitar desplazamientos verticales, se elimina la componente `Y` y se normaliza el vector resultante.

El movimiento se aplica separando el eje `X` y el eje `Z`. Esto permite que, si el jugador choca contra una pared en un eje, pueda seguir desplazandose por el otro, dando una sensacion mas natural al moverse por pasillos estrechos.

## 7. Colisiones con el laberinto

Para evitar que el jugador atraviese los muros se usa el metodo `puedeMoverseA()` de la clase `Laberinto`.

El algoritmo no comprueba solo el punto central de la camara. En su lugar, usa un radio aproximado del jugador y comprueba varios puntos alrededor de su posicion.

Si alguno de esos puntos cae dentro de una celda ocupada por un muro, el movimiento se cancela.

Resumen del algoritmo:

1. Se calcula la posicion candidata del jugador.
2. Se generan varios puntos alrededor de esa posicion.
3. Cada punto se convierte de coordenadas mundo a coordenadas de celda.
4. Si alguna celda es un muro, la posicion no es valida.
5. Si todas las celdas son transitables, se permite el movimiento.

Con esto se simula que el jugador tiene volumen y no puede atravesar las paredes.

## 8. Recogida de pick-ups

La recogida de pick-ups se realiza con un `Raycaster`.

Cuando el jugador hace click:

1. Se lanza un rayo desde el centro de la camara.
2. Se comprueba si el rayo intersecta algun pick-up.
3. Se busca el objeto padre marcado como recogible mediante `userData.recogible`.
4. Se comprueba que la distancia entre jugador y pick-up sea suficientemente pequena.
5. Si se cumplen las condiciones, el objeto se marca como recogido y se oculta.

La recogida se registra con:

```js
objeto.recogido = true;
objeto.visible = false;
```

Ademas, se actualiza el contador de pick-ups del HUD.

## 9. Puerta final

La salida del laberinto esta cerrada por una puerta con pomo.

La puerta esta formada por:

- Marco.
- Hueco oscuro.
- Hoja de la puerta.
- Pomo.
- Placa y hueco de cerradura.

La hoja y el pomo forman parte de un mismo grupo con pivote, de forma que ambos rotan juntos durante la apertura.

La puerta solo se abre si:

1. El jugador apunta al pomo.
2. El jugador esta suficientemente cerca.
3. Se han recogido todos los pick-ups.

La apertura se anima mediante `TWEEN`. Antes de abrir la hoja, se reutiliza el pick-up Farolillo, que tiene forma de llave, como llave de la cerradura: aparece frente a la puerta, se introduce en el hueco, gira y despues comienza la animacion de apertura de la puerta.

## 10. Modelo jerarquico del pick-up articulado

El pick-up articulado principal es el abanico, implementado en `pick-ups/Abanico.js`.

El abanico se construye como un modelo jerarquico:

```text
Abanico
|
+-- Grupo general
    |
    +-- Modulo 1
    |   +-- Varilla 1
    |   +-- Tela 1
    |
    +-- Modulo 2
    |   +-- Varilla 2
    |   +-- Tela 2
    |
    +-- ...
    |
    +-- Modulo N
        +-- Varilla N
        +-- Tela N
```

Cada modulo se coloca con una rotacion distinta respecto al punto de union del abanico.

El abanico tiene grados de libertad no independientes porque las piezas no se mueven de forma aislada. Todas dependen de un mismo parametro de apertura. Al cambiar ese parametro, se recalcula la rotacion de cada modulo.

La animacion se basa en una funcion seno que hace variar continuamente el angulo de apertura entre un minimo y un maximo.

## 11. Otros pick-ups modelados

### Farolillo

El farolillo representa un objeto decorativo. Combina primitivas geometricas, materiales con color y elementos repetidos para conseguir una forma reconocible.

### Castañuelas

Las castañuelas estan formadas por dos mitades que se abren y se cierran mediante pivotes.

Se usan operaciones de modelado mas complejas para obtener una forma curva y hueca. Tambien se incluyen cordones unidos a las mitades, de forma que acompanen el movimiento.

### Rebujito

El rebujito incluye:

- Vaso transparente.
- Liquido animado.
- Hielos.
- Limon.
- Pajita.

El liquido sube y baja para simular que el vaso se rellena y se vacia. Los hielos acompanian el nivel del liquido y se mantienen visualmente separados para evitar que se atraviesen entre ellos o atraviesen el vaso.

## 12. Materiales y texturas

El proyecto usa distintos tipos de materiales:

- Materiales basados en color.
- Materiales con textura en el canal de color.
- Materiales con textura en el canal de relieve.
- Materiales transparentes para elementos como el vaso.

Los materiales basados en color aparecen en elementos como los muros del laberinto, el suelo, la puerta, el marco y algunos detalles de los pick-ups.

Los materiales de los pick-ups se han asignado segun el tipo de objeto que representan:

- Abanico: las varillas usan textura de madera y la tela usa textura decorativa, con un mapa de relieve para simular el tejido.
- Farolillo/llave: la llave usa un material metalico de laton envejecido y el farolillo usa papel rojo con lunares blancos y relieve de pliegues.
- Castañuelas: las conchas usan textura de madera con relieve, para reforzar la sensacion de pieza tallada.
- Rebujito: el vaso usa material transparente de cristal, el liquido tiene color amarillento con relieve de burbujas, el limon tiene textura radial, la pajita usa franjas rojas y blancas, y los hielos usan material transparente.

Tambien hay texturas en el canal de relieve. El abanico utiliza `bumpMap` para dar mas detalle a la tela y el rebujito usa un mapa de relieve generado por codigo para simular pequenas burbujas o irregularidades en el liquido.

En algunos casos se usa `RepeatWrapping` para repetir la textura y evitar que quede estirada sobre la geometria.

El vaso del rebujito usa un material fisico transparente (`MeshPhysicalMaterial`) para representar el cristal. Este material permite jugar con transparencia, rugosidad, transmision y grosor.

## 13. Luces

La escena incluye diferentes tipos de luces:

- `AmbientLight`: luz ambiental blanca que ilumina toda la escena de forma general.
- `DirectionalLight`: luz principal calida que actua como iluminacion dominante y genera sombras.
- `PointLight`: luz puntual azulada que aporta un color diferente a la escena.
- `PointLight` dinamica: luz de acento que cambia de color e intensidad durante el juego.

El objetivo es que el laberinto y los pick-ups sean visibles, y que algunos elementos tengan sombras y volumen.

La luz direccional tiene activadas las sombras:

```js
this.sunLight.castShadow = true;
```

La luz cambiante se actualiza en cada frame. Su color se modifica con `setHSL()` y su intensidad varia con una funcion seno:

```js
this.dynamicLight.color.setHSL(hue, 0.85, 0.55);
this.dynamicLight.intensity = 70 + Math.sin(this.lightTime * 1.4) * 18;
```

Con esto se cumple el requisito de tener luces de diferentes colores y al menos una luz que cambie durante el juego.

## 14. Camaras

El juego usa dos camaras:

- Camara principal en perspectiva, usada para la vista en primera persona.
- Camara ortografica superior, usada para mostrar el minimapa.

La camara principal representa la vision del jugador. La camara superior muestra el laberinto completo desde arriba y se renderiza en una zona separada de la pantalla.

La camara superior se coloca sobre el laberinto, mirando hacia abajo:

```js
this.topCamera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 80);
this.topCamera.position.set(0, 40, 0);
this.topCamera.lookAt(0, 0, 0);
```

Cuando termina de cargarse el laberinto, se ajustan los limites de la camara ortografica para cubrir todo el mapa. Asi el minimapa siempre muestra el laberinto completo.

El render se hace en dos pasos:

1. Primero se renderiza la escena normal con la camara principal.
2. Despues se limpia la profundidad y se renderiza una segunda vista con la camara superior en una esquina de la pantalla.

Para colocar el minimapa se usan `setViewport()` y `setScissor()`. Esto permite dibujar la segunda camara solo dentro de una region rectangular de la ventana.

Ademas, se ha anadido zoom con la rueda del raton modificando el FOV de la camara principal.

## 15. Ayudas de prueba y mejoras

Durante el desarrollo se han anadido algunas ayudas para facilitar las pruebas:

- `F`: coloca al jugador frente a la puerta.
- `P`: lleva al jugador de un pick-up al siguiente.
- Rueda del raton: aumenta o reduce el zoom.
- GUI: permite modificar parametros como la velocidad del jugador o mostrar/ocultar el minimapa.

Estas funciones ayudan a comprobar rapidamente el estado del juego durante la defensa y durante el desarrollo.

## 16. Bibliotecas y recursos externos

Bibliotecas usadas:

- Three.js.
- `PointerLockControls`.
- `OrbitControls`, usado en el visor independiente de pick-ups.
- `dat.GUI`, usado como herramienta auxiliar de configuracion.
- `TWEEN`, usado para animaciones interpoladas.
- `three-bvh-csg`, usado para operaciones CSG en el modelado.

Recursos graficos:

- Texturas incluidas en la carpeta `imgs/`.
- Modelos incluidos en la carpeta `models/`, si finalmente se utilizan en la entrega.

Pendiente de completar:

- Indicar el origen exacto de cada textura o modelo externo.
- Confirmar si todos los recursos proceden del material base de practicas o si alguno fue descargado de internet.

## 17. Elementos usados fuera del temario

Algunas herramientas no aparecen explicadas directamente en los apuntes, pero se han usado como complemento:

- `three-bvh-csg`: para modelar formas mas complejas mediante operaciones booleanas.
- `dat.GUI`: para depuracion y ajuste de parametros.
- `OrbitControls`: para inspeccionar pick-ups en el visor independiente.
- `CanvasTexture`: para generar texturas por codigo.
- `FileLoader`: para cargar el laberinto desde un fichero de texto.

Estas herramientas no sustituyen los contenidos de la asignatura, sino que los complementan para mejorar el modelado, facilitar pruebas y separar mejor los datos del codigo.

Para una explicacion mas detallada se puede consultar `FueraTemario.md`.

## 18. Video de demostracion

El guion indica que la documentacion debe incluir una demo en video de entre 20 y 40 segundos.

El video debe mostrar:

1. Movimiento del protagonista por el laberinto.
2. Recogida del ultimo pick-up.
3. Apertura de la puerta final.
4. Salida del laberinto.

Pendiente de anadir:

- Nombre del archivo de video.
- Duracion final.
- Breve descripcion de lo que se muestra.

## 19. Comprobaciones antes de la entrega

Antes de generar el PDF final y preparar el ZIP de entrega, conviene comprobar:

- Que el juego se ejecuta sin errores desde un servidor local.
- Que todos los archivos usan rutas relativas.
- Que no faltan texturas, bibliotecas ni modelos.
- Que los nombres de archivo coinciden exactamente en mayusculas y minusculas.
- Que el proyecto funciona en Linux.
- Que los pick-ups pueden visualizarse por separado.
- Que la puerta solo se abre tras recoger todos los pick-ups.
- Que la demo en video dura entre 20 y 40 segundos.

## 20. Conclusiones

El proyecto integra los contenidos principales de la asignatura en un juego completo: modelado geometrico, materiales, texturas, luces, camaras, animacion e interaccion.

El resultado es un laberinto en primera persona donde el jugador debe recoger objetos modelados en Three.js y abrir una puerta final. Ademas, se han incorporado mejoras de usabilidad y ayudas de prueba que facilitan la demostracion del funcionamiento durante la defensa.
