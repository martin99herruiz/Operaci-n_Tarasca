import * as THREE from 'three'
import * as TWEEN from '../libs/tween.esm.js'
import { GUI } from 'gui'
import { PointerLockControls } from '../libs/PointerLockControls.js'

import { Abanico } from '../pick-ups/Abanico.js'
import { Farolillo } from '../pick-ups/Farolillo.js'
import { Castanuelas } from '../pick-ups/Castanuelas.js'
import { Rebujito } from '../pick-ups/Rebujito.js'

import { Laberinto } from './Laberinto.js'

class MyScene extends THREE.Scene {

  constructor(myCanvas) {
    super()

    this.renderer = this.createRenderer(myCanvas)
    this.clock = new THREE.Clock()

    // Parametros principales del jugador y de las ayudas de prueba.
    this.playerHeight = 1.65
    this.playerRadius = 0.28
    this.interactionDistance = 3.0
    this.minCameraFov = 35
    this.maxCameraFov = 80
    this.zoomWheelSensitivity = 0.035
    this.totalPickups = 4
    this.pickupsRecogidos = 0
    this.pickups = []
    this.pickupMazeScale = 0.35
    this.pickupVisualCenterHeight = 1.05
    this.pickupTeleportIndex = 0
    this.doorSurfaceOffset = 0.08
    this.animatedObjects = []
    this.lightTime = 0

    this.keys = {
      forward: false,
      backward: false
    }

    this.tmpDirection = new THREE.Vector3()
    this.tmpMovement = new THREE.Vector3()
    this.tmpPosition = new THREE.Vector3()
    this.tmpDoorPosition = new THREE.Vector3()
    this.centerPointer = new THREE.Vector2(0, 0)
    this.raycaster = new THREE.Raycaster()

    this.guiControls = {
      velocidad: 2.2,
      mostrarMiniMapa: true
    }

    this.background = new THREE.Color(0x2d353b)

    // La escena se construye en varias funciones para separar camaras, luces,
    // suelo, puerta, interfaz y eventos.
    this.createCameras()
    this.createLights()
    this.createGround()
    this.createDoor()
    this.createPlayerMarker()
    this.createGUI()
    this.bindEvents()

    const laberintoCargado = $.Deferred()
    this.model = new Laberinto('./laberinto.txt', laberintoCargado)
    this.add(this.model)

    // FileLoader carga el laberinto de forma asincrona; los objetos que dependen
    // del mapa se colocan cuando termina la carga.
    laberintoCargado.done(() => {
      this.onLaberintoLoaded()
    })
  }

  createCameras() {
    // Camara principal: vista en primera persona del jugador.
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.05,
      100
    )
    this.camera.position.set(0, this.playerHeight, 0)
    this.add(this.camera)

    this.cameraControl = new PointerLockControls(this.camera, this.renderer.domElement)
    this.cameraControl.pointerSpeed = 0.85

    // Camara superior para el mini-mapa.
    this.topCamera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 80)
    this.topCamera.position.set(0, 40, 0)
    this.topCamera.up.set(0, 0, -1)
    this.topCamera.layers.enable(1)
    this.topCamera.lookAt(0, 0, 0)
    this.add(this.topCamera)
  }

  createLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.42)
    this.add(this.ambientLight)

    this.sunLight = new THREE.DirectionalLight(0xfff4df, 1.35)
    this.sunLight.position.set(6, 14, 5)
    this.sunLight.castShadow = true
    this.sunLight.shadow.mapSize.set(1024, 1024)
    this.sunLight.shadow.camera.near = 0.5
    this.sunLight.shadow.camera.far = 45
    this.sunLight.shadow.camera.left = -12
    this.sunLight.shadow.camera.right = 12
    this.sunLight.shadow.camera.top = 12
    this.sunLight.shadow.camera.bottom = -12
    this.add(this.sunLight)

    this.fillLight = new THREE.PointLight(0x5fb7ff, 120)
    this.fillLight.position.set(-4, 2.5, -4)
    this.add(this.fillLight)

    // Luz cambiante exigida en la Defensa 4: aporta un acento de color que
    // varia suavemente durante el juego.
    this.dynamicLight = new THREE.PointLight(0xff6a3d, 85, 9, 1.6)
    this.dynamicLight.position.set(4.5, 2.4, 3.5)
    this.add(this.dynamicLight)
  }

  createGround() {
    const materialGround = new THREE.MeshStandardMaterial({
      color: 0x476340,
      roughness: 0.85,
      metalness: 0.0
    })

    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(31, 31), materialGround)
    this.ground.rotation.x = -Math.PI / 2
    this.ground.position.y = -0.01
    this.ground.receiveShadow = true
    this.add(this.ground)
  }

  createDoor() {
    // La puerta se monta como jerarquia: doorGroup posiciona el conjunto en el
    // laberinto y doorPivot permite abrir solo la hoja y el pomo.
    this.doorGroup = new THREE.Group()
    this.doorPivot = new THREE.Group()
    this.doorOpenAmount = 0
    this.doorOpening = false
    this.doorTweenState = { p: 0 }
    this.doorMetrics = {
      openingWidth: 1.55,
      openingHeight: 2.52,
      frameThickness: 0.09,
      frameDepth: 0.16,
      panelDepth: 0.1
    }

    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b2d12,
      roughness: 0.5,
      metalness: 0.05
    })

    this.knobMaterial = new THREE.MeshStandardMaterial({
      color: 0xd6b64c,
      roughness: 0.24,
      metalness: 0.9,
      emissive: 0x000000
    })

    const {
      openingWidth,
      openingHeight,
      frameThickness,
      frameDepth,
      panelDepth
    } = this.doorMetrics
    const doorWidth = openingWidth
    const doorHeight = openingHeight

    // Hoja de la puerta. Su origen queda en la bisagra izquierda para que rote
    // de forma natural al abrirse.
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, panelDepth), doorMaterial)
    door.position.set(doorWidth / 2, doorHeight / 2, 0)
    door.castShadow = true
    door.receiveShadow = true
    this.doorPivot.add(door)

    // Plano oscuro detras de la hoja, usado como hueco visual de salida.
    this.doorVoid = new THREE.Mesh(
      new THREE.BoxGeometry(openingWidth, openingHeight, 0.035),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    )
    this.doorVoid.position.set(openingWidth / 2, openingHeight / 2, 0.07)
    this.doorVoid.renderOrder = -1

    this.doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.065, 24, 16), this.knobMaterial)
    this.doorKnob.position.set(doorWidth * 0.82, doorHeight * 0.47, -panelDepth * 0.75)
    this.doorKnob.castShadow = true
    this.doorKnob.userData.interactable = 'door'
    this.doorPivot.add(this.doorKnob)

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b1a12,
      roughness: 0.75
    })
    // Marco construido con tres prismas: dos laterales y uno superior.
    const frameHeight = openingHeight + frameThickness
    const frameWidth = openingWidth + frameThickness * 2
    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, frameHeight, frameDepth), frameMaterial)
    const rightFrame = leftFrame.clone()
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, frameThickness, frameDepth), frameMaterial)
    leftFrame.position.set(-frameThickness / 2, frameHeight / 2, 0)
    rightFrame.position.set(openingWidth + frameThickness / 2, frameHeight / 2, 0)
    topFrame.position.set(openingWidth / 2, openingHeight + frameThickness / 2, 0)
    this.doorGroup.add(this.doorVoid, leftFrame, rightFrame, topFrame, this.doorPivot)

    this.doorGroup.visible = false
    this.add(this.doorGroup)
  }

  createPlayerMarker() {
    // Indicador usado solo en la camara superior para saber donde esta el jugador.
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff16a,
      depthTest: false
    })

    this.playerMarker = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 3), markerMaterial)
    this.playerMarker.position.y = 2.85
    this.playerMarker.renderOrder = 10
    this.playerMarker.layers.set(1)
    this.add(this.playerMarker)
  }

  createGUI() {
    const gui = new GUI({ width: 310 })

    gui.add(this.guiControls, 'velocidad', 0.6, 5.0, 0.1)
      .name('Velocidad')

    gui.add(this.guiControls, 'mostrarMiniMapa')
      .name('Mini-mapa')

    return gui
  }

  bindEvents() {
    this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event))
    this.renderer.domElement.addEventListener('wheel', (event) => this.onMouseWheel(event), { passive: false })
    window.addEventListener('keydown', (event) => this.onKey(event, true))
    window.addEventListener('keyup', (event) => this.onKey(event, false))
  }

  onMouseWheel(event) {
    event.preventDefault()

    // Zoom mediante FOV: menor FOV acerca la camara, mayor FOV aleja.
    this.camera.fov = THREE.MathUtils.clamp(
      this.camera.fov + event.deltaY * this.zoomWheelSensitivity,
      this.minCameraFov,
      this.maxCameraFov
    )
    this.camera.updateProjectionMatrix()
  }

  onLaberintoLoaded() {
    console.log(
      `Laberinto cargado: ${this.model.zNumBloques} filas x ${this.model.xNumBloques} columnas`
    )

    this.placePlayerAtCell(1, 1)
    this.placeDoorAtWall(25, 27, 'west')

    // 1. Crear el Abanico (Articulado y animado para la Defensa 3)
    const abanico = new Abanico()
    this.posicionarPickup(abanico, 2, 2) 

    // 2. Crear el Farolillo (La Llave requerida por la práctica)
    const llaveFarolillo = new Farolillo()
    this.posicionarPickup(llaveFarolillo, 5, 14) 

    // 3. Crear las Castañuelas
    const castanuelas = new Castanuelas()
    this.posicionarPickup(castanuelas, 22, 5)

    // 4. Crear el Rebujito
    const rebujito = new Rebujito()
    this.posicionarPickup(rebujito, 23, 21)

    this.configureTopCamera()
    this.updateHud()
  }

  placePlayerAtCell(fila, columna) {
    this.model.getMundoFromCelda(fila, columna, this.tmpPosition)
    this.camera.position.set(this.tmpPosition.x, this.playerHeight, this.tmpPosition.z)
    this.camera.lookAt(this.tmpPosition.x + 1, this.playerHeight, this.tmpPosition.z)
  }

  placeDoorAtWall(fila, columna, lado = 'south') {
    this.model.getMundoFromCelda(fila, columna, this.tmpDoorPosition)

    // La puerta se alinea con una cara del bloque indicado.
    const halfBlock = this.model.anchoBloque * 0.5
    const halfDoorOpening = this.doorMetrics.openingWidth * 0.5

    if (lado === 'west') {
      this.doorGroup.rotation.y = Math.PI / 2
      this.doorGroup.position.set(
        this.tmpDoorPosition.x - halfBlock - this.doorSurfaceOffset,
        0,
        this.tmpDoorPosition.z + halfDoorOpening
      )
    } else {
      this.doorGroup.rotation.y = 0
      this.doorGroup.position.set(
        this.tmpDoorPosition.x - halfDoorOpening,
        0,
        this.tmpDoorPosition.z + halfBlock
      )
    }

    this.doorGroup.visible = true
  }

  posicionarPickup(objeto, fila, columna) {
    this.model.getMundoFromCelda(fila, columna, this.tmpPosition)

    // Todos los pick-ups se escalan y se alinean por centro visual para que
    // aparezcan a una altura coherente aunque sus modelos tengan origen distinto.
    objeto.scale.multiplyScalar(this.pickupMazeScale)
    objeto.position.set(this.tmpPosition.x, 0, this.tmpPosition.z)
    objeto.updateMatrixWorld(true)

    const caja = new THREE.Box3().setFromObject(objeto)
    caja.getCenter(this.tmpPosition)
    objeto.position.y += this.pickupVisualCenterHeight - this.tmpPosition.y
    
    this.add(objeto)                     // Para que se vean
    this.pickups.push(objeto)            // Para poder recogerlos con el Raycaster
    this.registerAnimatedObject(objeto)  // Para que se muevan solos (animación continua) 
    
    objeto.userData.recogible = true
  }

  tryPickUp() {
    // Apuntamos el raycaster desde el centro de la pantalla
    this.raycaster.setFromCamera(this.centerPointer, this.camera);

    // Buscamos si el rayo choca con algo en nuestra lista de pickups
    const intersecciones = this.raycaster.intersectObjects(this.pickups, true);

    if (intersecciones.length > 0) {
        const objetoTocado = intersecciones[0].object;
        const distancia = intersecciones[0].distance;

        // Buscamos el padre que tenga la propiedad 'recogible' (por si el rayo toca una parte del objeto)
        let pickupRaiz = objetoTocado;
        while (pickupRaiz.parent && !pickupRaiz.userData.recogible) {
            pickupRaiz = pickupRaiz.parent;
        }

        // REQUISITOS: Que sea recogible, no esté recogido ya y esté CERCA (interactionDistance)
        if (pickupRaiz.userData.recogible && !pickupRaiz.recogido && distancia < this.interactionDistance) {
            this.recogerObjeto(pickupRaiz);
        }
    }
  }

  recogerObjeto(objeto) {
    objeto.recogido = true;
    objeto.visible = false; // Lo hacemos invisible
    
    // Sumamos al contador interno y actualizamos el texto de arriba a la izquierda
    this.registrarPickupRecogido(); 
    
    this.setHudMessage("¡Has recogido un pick-up!");
    
    // Opcional: imprimir en consola para depurar
    console.log("Pickups recogidos:", this.pickupsRecogidosActuales());
  }

  configureTopCamera() {
    const ancho = this.model.xNumBloques * this.model.anchoBloque
    const alto = this.model.zNumBloques * this.model.anchoBloque
    const size = Math.max(ancho, alto) + 1.5

    this.topCamera.left = -size / 2
    this.topCamera.right = size / 2
    this.topCamera.top = size / 2
    this.topCamera.bottom = -size / 2
    this.topCamera.position.set(0, 40, 0)
    this.topCamera.lookAt(0, 0, 0)
    this.topCamera.updateProjectionMatrix()
  }

  onKey(event, pressed) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = pressed
        event.preventDefault()
        break
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = pressed
        event.preventDefault()
        break
      case 'KeyF':
        if (pressed && !event.repeat) {
          this.teleportPlayerToDoor()
        }
        event.preventDefault()
        break
      case 'KeyP':
        if (pressed && !event.repeat) {
          this.teleportPlayerToNextPickup()
        }
        event.preventDefault()
        break
    }
  }

  teleportPlayerToDoor() {
    if (!this.doorGroup.visible) {
      return
    }

    // Herramienta de prueba: coloca al jugador delante de la puerta mirando al centro.
    const doorFront = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(this.doorGroup.quaternion)
      .normalize()
    const doorCenter = new THREE.Vector3()
    this.doorVoid.getWorldPosition(doorCenter)

    this.camera.position.set(
      doorCenter.x + doorFront.x * 1.35,
      this.playerHeight,
      doorCenter.z + doorFront.z * 1.35
    )
    this.camera.lookAt(doorCenter.x, this.playerHeight, doorCenter.z)
    this.setHudMessage('Jugador frente a la puerta')
  }

  teleportPlayerToNextPickup() {
    if (this.pickups.length === 0) {
      return
    }

    // Herramienta de prueba: recorre los pick-ups pendientes para comprobar la recogida.
    const pendingPickups = this.pickups.filter((pickup) => !(pickup.recogido || pickup.collected))
    const targets = pendingPickups.length > 0 ? pendingPickups : this.pickups
    const targetIndex = this.pickupTeleportIndex % targets.length
    const target = targets[targetIndex]
    this.pickupTeleportIndex = (targetIndex + 1) % targets.length

    target.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(target)
    const targetCenter = new THREE.Vector3()
    box.getCenter(targetCenter)

    const offsets = [
      new THREE.Vector3(0, 0, 0.65),
      new THREE.Vector3(0.65, 0, 0),
      new THREE.Vector3(0, 0, -0.65),
      new THREE.Vector3(-0.65, 0, 0)
    ]
    const playerPosition = new THREE.Vector3(targetCenter.x, this.playerHeight, targetCenter.z)
    let foundPosition = false

    // Se prueban varias posiciones alrededor del pick-up y se escoge la primera
    // que no caiga dentro de un muro.
    for (const offset of offsets) {
      playerPosition.set(
        targetCenter.x + offset.x,
        this.playerHeight,
        targetCenter.z + offset.z
      )

      if (!this.model || this.model.puedeMoverseA(playerPosition, this.playerRadius)) {
        foundPosition = true
        break
      }
    }

    if (!foundPosition) {
      playerPosition.set(targetCenter.x, this.playerHeight, targetCenter.z)
    }

    this.camera.position.copy(playerPosition)
    this.camera.lookAt(targetCenter.x, this.playerHeight, targetCenter.z)
    this.setHudMessage(`Pick-up ${targetIndex + 1}/${targets.length}`)
  }

  onMouseClick() {
    if (!this.cameraControl.isLocked) {
      // Primer click: bloquea el puntero para activar la camara en primera persona.
      this.cameraControl.lock()
      return
    }

    // 1. Intentamos abrir la puerta (esto ya lo tienes)
    this.tryInteractWithDoor();

    // 2. NUEVO: Intentamos recoger un pick-up
    this.tryPickUp();
  }

  tryInteractWithDoor() {
    if (!this.doorGroup.visible || this.doorOpening) {
      return
    }

    // Para abrir la puerta hay que apuntar al pomo, estar cerca y haber recogido todo.
    this.raycaster.setFromCamera(this.centerPointer, this.camera)
    const hits = this.raycaster.intersectObject(this.doorKnob, true)

    if (hits.length === 0 || hits[0].distance > this.interactionDistance) {
      return
    }

    if (!this.todosPickupsRecogidos()) {
      this.setHudMessage(`Puerta cerrada: faltan ${this.pickupsPendientes()} pick-ups`)
      this.flashKnob(0x661111)
      return
    }

    this.openDoor()
  }

  openDoor() {
    if (this.doorOpening) {
      return
    }

    this.doorOpening = true
    this.setHudMessage('Puerta abierta')
    this.flashKnob(0x226611)

    if (this.doorTween) {
      this.doorTween.stop()
    }

    this.doorTweenState.p = this.doorOpenAmount
    // Tween de apertura: interpola una variable p de 0 a 1 y la convierte en rotacion.
    this.doorTween = new TWEEN.Tween(this.doorTweenState)
      .to({ p: 1 }, 850)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        this.doorOpenAmount = this.doorTweenState.p
        this.doorPivot.rotation.y = -Math.PI * 0.55 * this.doorOpenAmount
      })
      .onComplete(() => {
        this.doorOpenAmount = 1
        this.doorPivot.rotation.y = -Math.PI * 0.55
      })
      .start()
  }

  todosPickupsRecogidos() {
    if (this.pickups.length > 0) {
      return this.pickups.every((pickup) => pickup.recogido || pickup.collected)
    }

    return this.pickupsRecogidos >= this.totalPickups
  }

  pickupsPendientes() {
    if (this.pickups.length > 0) {
      return this.pickups.filter((pickup) => !(pickup.recogido || pickup.collected)).length
    }

    return Math.max(0, this.totalPickups - this.pickupsRecogidos)
  }

  pickupsRecogidosActuales() {
    if (this.pickups.length > 0) {
      return this.pickups.filter((pickup) => pickup.recogido || pickup.collected).length
    }

    return this.pickupsRecogidos
  }

  totalPickupsActual() {
    return this.pickups.length > 0 ? this.pickups.length : this.totalPickups
  }

  registrarPickupRecogido() {
    this.pickupsRecogidos = Math.min(this.totalPickups, this.pickupsRecogidos + 1)
    this.updateHud()
  }

  registerAnimatedObject(object) {
    if (object && typeof object.update === 'function' && !this.animatedObjects.includes(object)) {
      this.animatedObjects.push(object)
    }
  }

  updatePlayer(delta) {
    if (!this.model || !this.cameraControl.isLocked) {
      return
    }

    // La direccion de avance sale de la camara, pero se anula Y para moverse solo
    // sobre el plano del suelo.
    this.tmpMovement.set(0, 0, 0)
    this.cameraControl.getDirection(this.tmpDirection)
    this.tmpDirection.y = 0
    this.tmpDirection.normalize()

    if (this.keys.forward) {
      this.tmpMovement.add(this.tmpDirection)
    }

    if (this.keys.backward) {
      this.tmpMovement.sub(this.tmpDirection)
    }

    if (this.tmpMovement.lengthSq() === 0) {
      return
    }

    this.tmpMovement.normalize().multiplyScalar(this.guiControls.velocidad * delta)
    // Movimiento por ejes separados: permite deslizarse por una pared si el otro eje
    // sigue siendo valido.
    this.tryMoveAxis(this.tmpMovement.x, 0)
    this.tryMoveAxis(0, this.tmpMovement.z)
  }

  tryMoveAxis(deltaX, deltaZ) {
    const candidate = this.camera.position.clone()
    candidate.x += deltaX
    candidate.z += deltaZ

    // La camara solo se mueve si el radio del jugador no invade ninguna celda muro.
    if (this.model.puedeMoverseA(candidate, this.playerRadius)) {
      this.camera.position.copy(candidate)
    }
  }

  updateDoor() {
    TWEEN.update()
    this.updateDoorFeedback()
  }

  updateDoorFeedback() {
    if (!this.doorGroup.visible) {
      return
    }

    this.doorKnob.getWorldPosition(this.tmpDoorPosition)
    const distance = this.camera.position.distanceTo(this.tmpDoorPosition)
    const isNear = distance <= this.interactionDistance

    this.doorKnob.scale.setScalar(isNear ? 1.18 : 1.0)

    if (!isNear || this.doorOpening) {
      this.knobMaterial.emissive.setHex(0x000000)
    } else if (this.todosPickupsRecogidos()) {
      this.knobMaterial.emissive.setHex(0x114411)
    } else {
      this.knobMaterial.emissive.setHex(0x441111)
    }
  }

  flashKnob(color) {
    this.knobMaterial.emissive.setHex(color)
  }

  updateAnimatedObjects(delta) {
    this.animatedObjects.forEach((object) => object.update(delta))
  }

  updateLights(delta) {
    this.lightTime += delta

    const hue = (0.04 + Math.sin(this.lightTime * 0.7) * 0.05 + 1) % 1
    this.dynamicLight.color.setHSL(hue, 0.85, 0.55)
    this.dynamicLight.intensity = 70 + Math.sin(this.lightTime * 1.4) * 18
  }

  updatePlayerMarker() {
    this.playerMarker.position.x = this.camera.position.x
    this.playerMarker.position.z = this.camera.position.z

    this.cameraControl.getDirection(this.tmpDirection)
    this.playerMarker.rotation.y = Math.atan2(this.tmpDirection.x, this.tmpDirection.z)
  }

  updateHud() {
    const counter = document.getElementById('PickupCounter')

    if (counter) {
      counter.textContent = `${this.pickupsRecogidosActuales()}/${this.totalPickupsActual()}`
    }
  }

  setHudMessage(text) {
    const message = document.getElementById('HudMessage')

    if (message) {
      message.textContent = text
    }
  }

  createRenderer(myCanvas) {
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(new THREE.Color(0x2d353b), 1.0)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.autoClear = false
    $(myCanvas).append(renderer.domElement)
    return renderer
  }

  renderViewport(escena, camara, left, bottom, width, height) {
    this.renderer.setViewport(left, bottom, width, height)
    this.renderer.setScissor(left, bottom, width, height)
    this.renderer.setScissorTest(true)
    this.renderer.render(escena, camara)
  }

  renderScene() {
    const width = window.innerWidth
    const height = window.innerHeight

    // Primero se renderiza la vista principal ocupando toda la ventana.
    this.renderer.setScissorTest(false)
    this.renderer.setViewport(0, 0, width, height)
    this.renderer.setClearColor(0x2d353b, 1)
    this.renderer.clear(true, true, true)
    this.renderer.render(this, this.camera)

    if (this.guiControls.mostrarMiniMapa) {
      // Segundo render en una ventana pequena: vista superior del laberinto.
      const size = Math.min(280, Math.floor(width * 0.28), Math.floor(height * 0.34))
      const margin = 16
      const left = width - size - margin
      const bottom = height - size - margin

      this.renderer.clearDepth()
      this.renderViewport(this, this.topCamera, left, bottom, size, size)
      this.renderer.setScissorTest(false)
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  update() {
    const delta = this.clock.getDelta()

    // Bucle principal de juego: entrada, animaciones, HUD y render.
    this.updatePlayer(delta)
    this.updateDoor(delta)
    this.updateAnimatedObjects(delta)
    this.updateLights(delta)
    this.updatePlayerMarker()
    this.updateHud()
    this.renderScene()

    requestAnimationFrame(() => this.update())
  }
}

$(function () {
  const scene = new MyScene("#WebGL-output")
  window.gameScene = scene
  window.addEventListener("resize", () => scene.onWindowResize())
  scene.update()
})
