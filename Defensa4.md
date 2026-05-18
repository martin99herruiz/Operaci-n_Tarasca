# Defensa 4 - Explicacion de cambios

Este documento resume los apartados preparados para la **Defensa 4** de la practica. Segun el guion, en esta defensa se debe tener:

- La camara con vista superior incorporada al juego.
- Los materiales hechos y aplicados a los elementos del juego.
- Las luces con sus requisitos minimos.

Ademas, se han incorporado mejoras de interaccion y colision indicadas por el profesor.

## Camara superior y minimapa

La camara superior se implementa en `Laberinto/MyScene.js` mediante una `OrthographicCamera`.

Esta camara se coloca por encima del laberinto:

```js
this.topCamera.position.set(0, 40, 0)
this.topCamera.lookAt(0, 0, 0)
```

Se usa una camara ortografica porque interesa ver el plano completo del laberinto sin deformacion de perspectiva. Asi, las distancias y la forma general del mapa se entienden mejor durante el juego.

Cuando termina de cargarse el laberinto, se llama a `configureTopCamera()`. Este metodo calcula el tamano real del mapa y ajusta los limites de la camara:

```js
this.topCamera.left = -size / 2
this.topCamera.right = size / 2
this.topCamera.top = size / 2
this.topCamera.bottom = -size / 2
```

Con esto la vista superior se adapta al tamano del laberinto aunque cambie el fichero `laberinto.txt`.

## Incorporacion de la camara superior en pantalla

La escena se renderiza en dos pasos dentro de `renderScene()`:

1. Primero se dibuja la vista principal en primera persona ocupando toda la ventana.
2. Despues se limpia la profundidad y se dibuja la camara superior en una zona pequena de la pantalla.

Para colocar el minimapa se usan:

```js
setViewport()
setScissor()
setScissorTest()
```

Esto permite renderizar una segunda camara en una region rectangular sin crear otra escena ni otra pagina.

El minimapa puede activarse o desactivarse desde la GUI con el parametro:

```js
mostrarMiniMapa
```

## Indicador del jugador en el minimapa

Para que la vista superior sea util, se ha anadido un marcador del jugador.

El marcador se crea con una geometria de cono:

```js
this.playerMarker = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 3), markerMaterial)
```

En cada frame, su posicion se actualiza con la posicion de la camara principal:

```js
this.playerMarker.position.x = this.camera.position.x
this.playerMarker.position.z = this.camera.position.z
```

Tambien se orienta segun la direccion de mirada del jugador. De esta forma, el minimapa no solo muestra donde esta el jugador, sino tambien hacia donde mira.

## Materiales del juego

El proyecto incluye materiales basados en color, materiales con texturas en el canal de color y materiales con mapas de relieve.

### Materiales basados en color

Se usan en elementos principales del escenario:

- Muros del laberinto.
- Suelo.
- Puerta.
- Marco de la puerta.
- Pomo y cerradura.
- Luces y elementos auxiliares del HUD/minimapa.

Un ejemplo es el material de los muros, definido con `MeshStandardMaterial`:

```js
this.bloqueMat = new THREE.MeshStandardMaterial({
  color: 0x7b4a2a,
  roughness: 0.8,
  metalness: 0.05
})
```

### Materiales con textura de color

Los pick-ups usan texturas para reforzar su aspecto real:

- El abanico usa textura de madera para las varillas y textura decorativa en la tela.
- Las castanuelas usan textura de madera para simular el veteado.
- El rebujito incluye materiales para cristal, liquido, limon, pajita e hielos.
- El farolillo usa materiales decorativos para que se reconozca como objeto festivo.

En varios casos se usan `CanvasTexture` para generar patrones por codigo, evitando depender de imagenes externas para cada detalle.

### Materiales con textura de relieve

El requisito de relieve se cumple con materiales que usan mapas de relieve (`bumpMap`).

El abanico aplica relieve en la tela para simular una superficie con trama. El rebujito tambien usa relieve en el liquido para dar una sensacion de burbujas o irregularidad.

Esto permite que el material no sea solo plano, sino que reaccione mejor a la iluminacion.

### Materiales transparentes

El rebujito incluye un vaso transparente. Para ello se usa un material fisico con transparencia, rugosidad y transmision.

El objetivo es que el vaso se perciba como cristal y que pueda verse el contenido interior.

## Luces

La escena tiene luces de distintos tipos y colores, cumpliendo los requisitos minimos de la Defensa 4.

## Luz ambiental

La luz ambiental ilumina toda la escena de forma general:

```js
this.ambientLight = new THREE.AmbientLight(0xffffff, 0.42)
```

Se usa para que las zonas en sombra no queden completamente negras.

## Luz direccional

La luz principal es una `DirectionalLight` calida:

```js
this.sunLight = new THREE.DirectionalLight(0xfff4df, 1.35)
```

Esta luz genera sombras:

```js
this.sunLight.castShadow = true
```

Se configura tambien el tamano del mapa de sombras y los limites de la camara de sombra para cubrir el laberinto.

## Luz puntual azul

Se anade una `PointLight` azulada:

```js
this.fillLight = new THREE.PointLight(0x5fb7ff, 120)
```

Esta luz aporta contraste de color respecto a la luz principal calida.

## Luz dinamica

La escena incluye una luz puntual dinamica:

```js
this.dynamicLight = new THREE.PointLight(0xff6a3d, 85, 9, 1.6)
```

Esta luz cambia durante el juego. En cada frame se actualizan su color e intensidad:

```js
this.dynamicLight.color.setHSL(hue, 0.85, 0.55)
this.dynamicLight.intensity = 70 + Math.sin(this.lightTime * 1.4) * 18
```

El color cambia suavemente usando HSL y la intensidad oscila con una funcion seno. Con esto se cumple el requisito de tener al menos una luz que cambie en el juego.

## Mejoras incorporadas tras la revision

Ademas de los apartados propios de Defensa 4, se han incorporado mejoras pedidas por el profesor.

### Limite vertical de la camara

La camara en primera persona usa `PointerLockControls`. Para evitar que el jugador pueda mirar demasiado arriba o demasiado abajo, se han limitado los angulos verticales:

```js
this.cameraControl.minPolarAngle = THREE.MathUtils.degToRad(18)
this.cameraControl.maxPolarAngle = THREE.MathUtils.degToRad(162)
```

Asi la vista queda mas controlada y no se puede sobrepasar el limite vertical.

### Modo de raton para recoger pick-ups

Antes, al usar el raton para apuntar, la vista se movia constantemente. Ahora se permite liberar el cursor con click derecho.

Cuando el cursor esta libre, se puede hacer click directamente sobre un pick-up. Para ello, el raycaster ya no usa solo el centro de la pantalla, sino tambien la posicion real del raton:

```js
this.mousePointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
this.mousePointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
```

Esto facilita recoger pick-ups sin que la camara se desplace mientras se intenta hacer click.

### Pick-ups como obstaculos

Los pick-ups ya no son atravesables. Al colocarlos en el laberinto se calcula una caja envolvente y, a partir de ella, un radio de colision:

```js
objeto.userData.obstaculo = true
objeto.userData.radioObstaculo = Math.max(tamanoPickup.x, tamanoPickup.z) * 0.5
```

Durante el movimiento del jugador se comprueba:

1. Que la nueva posicion no atraviese muros.
2. Que la nueva posicion no invada ningun pick-up pendiente de recoger.

Cuando un pick-up se recoge, se marca como recogido y se oculta, por lo que deja de bloquear el paso.

## Resumen para la defensa

Para explicar la Defensa 4 de forma rapida:

- La camara superior es ortografica y se muestra como minimapa con `viewport` y `scissor`.
- El minimapa incluye un marcador que sigue al jugador y muestra su orientacion.
- Hay materiales de color, materiales con textura, materiales con relieve y materiales transparentes.
- Hay luces de diferentes colores: ambiental blanca, direccional calida y puntual azul.
- Hay una luz dinamica que cambia color e intensidad durante el juego.
- Se han anadido mejoras de camara, raton y colisiones con pick-ups segun la revision del profesor.
