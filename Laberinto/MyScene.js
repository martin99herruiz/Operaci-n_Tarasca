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

    this.playerHeight = 1.65
    this.playerRadius = 0.28
    this.interactionDistance = 3.0
    this.totalPickups = 4
    this.pickupsRecogidos = 0
    this.pickups = []
    this.animatedObjects = []

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
      sensibilidad: 0.85,
      mostrarMiniMapa: true
    }

    this.background = new THREE.Color(0x2d353b)

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

    laberintoCargado.done(() => {
      this.onLaberintoLoaded()
    })
  }

  createCameras() {
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.05,
      100
    )
    this.camera.position.set(0, this.playerHeight, 0)
    this.add(this.camera)

    this.cameraControl = new PointerLockControls(this.camera, this.renderer.domElement)
    this.cameraControl.pointerSpeed = this.guiControls.sensibilidad

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
    this.doorGroup = new THREE.Group()
    this.doorPivot = new THREE.Group()
    this.doorOpenAmount = 0
    this.doorOpening = false
    this.doorTweenState = { p: 0 }

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

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.86, 2.25, 0.1), doorMaterial)
    door.position.set(0.43, 1.12, 0)
    door.castShadow = true
    door.receiveShadow = true
    this.doorPivot.add(door)

    this.doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), this.knobMaterial)
    this.doorKnob.position.set(0.72, 1.05, -0.075)
    this.doorKnob.castShadow = true
    this.doorKnob.userData.interactable = 'door'
    this.doorPivot.add(this.doorKnob)

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b1a12,
      roughness: 0.75
    })
    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.45, 0.16), frameMaterial)
    const rightFrame = leftFrame.clone()
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.1, 0.16), frameMaterial)
    leftFrame.position.set(-0.05, 1.22, 0)
    rightFrame.position.set(0.95, 1.22, 0)
    topFrame.position.set(0.45, 2.43, 0)
    this.doorGroup.add(leftFrame, rightFrame, topFrame, this.doorPivot)

    this.doorGroup.visible = false
    this.add(this.doorGroup)
  }

  createPlayerMarker() {
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

    gui.add(this.guiControls, 'sensibilidad', 0.2, 2.0, 0.05)
      .name('Sensibilidad')
      .onChange((valor) => {
        this.cameraControl.pointerSpeed = valor
      })

    gui.add(this.guiControls, 'mostrarMiniMapa')
      .name('Mini-mapa')

    return gui
  }

  bindEvents() {
    this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event))
    window.addEventListener('keydown', (event) => this.onKey(event, true))
    window.addEventListener('keyup', (event) => this.onKey(event, false))
  }

  onLaberintoLoaded() {
    console.log(
      `Laberinto cargado: ${this.model.zNumBloques} filas x ${this.model.xNumBloques} columnas`
    )

    this.placePlayerAtCell(1, 1)
    this.placeDoorAtCell(25, 25)

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

  placeDoorAtCell(fila, columna) {
    this.model.getMundoFromCelda(fila, columna, this.tmpDoorPosition)

    const halfBlock = this.model.anchoBloque * 0.5
    this.doorGroup.position.set(this.tmpDoorPosition.x - 0.45, 0, this.tmpDoorPosition.z + halfBlock)
    this.doorGroup.visible = true
  }

  posicionarPickup(objeto, fila, columna) {
    this.model.getMundoFromCelda(fila, columna, this.tmpPosition)
    
    objeto.position.set(this.tmpPosition.x, 0.5, this.tmpPosition.z)
    
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
    }
  }

  onMouseClick() {
    if (!this.cameraControl.isLocked) {
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
    this.tryMoveAxis(this.tmpMovement.x, 0)
    this.tryMoveAxis(0, this.tmpMovement.z)
  }

  tryMoveAxis(deltaX, deltaZ) {
    const candidate = this.camera.position.clone()
    candidate.x += deltaX
    candidate.z += deltaZ

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

    this.renderer.setScissorTest(false)
    this.renderer.setViewport(0, 0, width, height)
    this.renderer.setClearColor(0x2d353b, 1)
    this.renderer.clear(true, true, true)
    this.renderer.render(this, this.camera)

    if (this.guiControls.mostrarMiniMapa) {
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

    this.updatePlayer(delta)
    this.updateDoor(delta)
    this.updateAnimatedObjects(delta)
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
