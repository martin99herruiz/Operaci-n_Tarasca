import * as THREE from 'three'
import * as TWEEN from '../libs/tween.esm.js'
import { GUI } from 'gui'
import { PointerLockControls } from '../libs/PointerLockControls.js'

import { Abanico } from '../pick-ups/Abanico.js'
import { Farolillo } from '../pick-ups/Farolillo.js'
import { Castanuelas } from '../pick-ups/Castanuelas.js'
import { Rebujito } from '../pick-ups/Rebujito.js'

import { Laberinto } from './Laberinto.js?v=feria-casetas-18'

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
    this.garlandBulbs = []
    this.garlandPointLights = []
    this.lightTime = 0
    this.skyProgress = 0
    this.targetSkyProgress = 0
    this.skyTextureNeedsRefresh = true
    this.skyStars = Array.from({ length: 95 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.62,
      radius: 0.7 + Math.random() * 1.4,
      alpha: 0.35 + Math.random() * 0.65
    }))

    this.keys = {
      forward: false,
      backward: false
    }

    this.tmpDirection = new THREE.Vector3()
    this.tmpMovement = new THREE.Vector3()
    this.tmpPosition = new THREE.Vector3()
    this.tmpDoorPosition = new THREE.Vector3()
    this.tmpPickupPosition = new THREE.Vector3()
    this.centerPointer = new THREE.Vector2(0, 0)
    this.mousePointer = new THREE.Vector2(0, 0)
    this.raycaster = new THREE.Raycaster()

    this.guiControls = {
      velocidad: 2.2,
      mostrarMiniMapa: true
    }

    this.background = new THREE.Color(0x77b8df)
    this.fog = new THREE.Fog(0xf3c36f, 13, 36)

    // La escena se construye en varias funciones para separar camaras, luces,
    // suelo, puerta, interfaz y eventos.
    this.createCameras()
    this.createSky()
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
    this.cameraControl.minPolarAngle = THREE.MathUtils.degToRad(18)
    this.cameraControl.maxPolarAngle = THREE.MathUtils.degToRad(162)

    // Camara superior para el mini-mapa.
    this.topCamera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 80)
    this.topCamera.position.set(0, 40, 0)
    this.topCamera.up.set(0, 0, -1)
    this.topCamera.layers.enable(1)
    this.topCamera.lookAt(0, 0, 0)
    this.add(this.topCamera)
  }

  createSky() {
    this.skyCanvas = document.createElement('canvas')
    this.skyCanvas.width = 512
    this.skyCanvas.height = 256
    this.skyContext = this.skyCanvas.getContext('2d')

    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas)
    this.skyTexture.colorSpace = THREE.SRGBColorSpace

    this.skyMaterial = new THREE.MeshBasicMaterial({
      map: this.skyTexture,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    })

    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(58, 48, 24), this.skyMaterial)
    this.skyDome.renderOrder = -10
    this.add(this.skyDome)

    this.drawSkyTexture(0)
  }

  createLights() {
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
  }

  createAlberoTexture() {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')
    context.fillStyle = '#c68f3b'
    context.fillRect(0, 0, size, size)

    const imageData = context.getImageData(0, 0, size, size)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 38 - 19
      const speckle = Math.random() > 0.965 ? Math.random() * 38 : 0

      data[i] = THREE.MathUtils.clamp(data[i] + noise + speckle, 0, 255)
      data[i + 1] = THREE.MathUtils.clamp(data[i + 1] + noise * 0.75 + speckle * 0.8, 0, 255)
      data[i + 2] = THREE.MathUtils.clamp(data[i + 2] + noise * 0.35, 0, 255)
    }

    context.putImageData(imageData, 0, 0)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(12, 12)
    texture.colorSpace = THREE.SRGBColorSpace

    return texture
  }

  createGround() {
    const alberoTexture = this.createAlberoTexture()

    const materialGround = new THREE.MeshStandardMaterial({
      color: 0xd19a44,
      map: alberoTexture,
      emissive: 0x6b3f12,
      emissiveIntensity: 0.08,
      roughness: 0.96,
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

    // Hueco de cerradura: una placa metalica fina con el hueco negro encima.
    // Se separa ligeramente de la hoja para evitar z-fighting con la puerta.
    const lockPlateMaterial = new THREE.MeshBasicMaterial({ color: 0xb58a2a })
    const lockMaterial = new THREE.MeshBasicMaterial({ color: 0x050505 })
    const lockGroup = new THREE.Group()
    const lockPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.24), lockPlateMaterial)
    const lockHead = new THREE.Mesh(new THREE.CircleGeometry(0.038, 24), lockMaterial)
    const lockSlot = new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.11), lockMaterial)
    const lockX = doorWidth * 0.82
    const lockY = doorHeight * 0.35
    const lockZ = -panelDepth * 0.86
    lockPlate.position.set(lockX, lockY, lockZ)
    lockHead.position.set(lockX, lockY + 0.048, lockZ - 0.002)
    lockSlot.position.set(lockX, lockY - 0.018, lockZ - 0.002)
    lockPlate.rotation.y = Math.PI
    lockHead.rotation.y = Math.PI
    lockSlot.rotation.y = Math.PI
    lockPlate.renderOrder = 2
    lockHead.renderOrder = 3
    lockSlot.renderOrder = 3
    lockGroup.add(lockPlate, lockHead, lockSlot)
    this.doorPivot.add(lockGroup)

    this.doorKey = this.createDoorKey()
    this.doorKey.position.set(lockX, lockY, lockZ - 0.38)
    this.doorKey.visible = false
    this.doorPivot.add(this.doorKey)

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

  createDoorKey() {
    // La llave que abre la puerta es el propio pick-up Farolillo, reutilizado a
    // menor escala y orientado para entrar en la cerradura.
    const keyGroup = new THREE.Group()
    const pickupKey = new Farolillo()

    if (typeof pickupKey.setRotacionActiva === 'function') {
      pickupKey.setRotacionActiva(false)
    }

    pickupKey.userData.recogible = false
    pickupKey.recogido = true
    pickupKey.scale.setScalar(0.12)
    // El giro en X coloca el paleton/dientes mirando hacia la cerradura.
    pickupKey.rotation.x = Math.PI / 2
    pickupKey.rotation.y = Math.PI / 2
    pickupKey.rotation.z = Math.PI

    keyGroup.add(pickupKey)
    return keyGroup
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
    this.renderer.domElement.addEventListener('contextmenu', (event) => this.onMouseRightClick(event))
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
    llaveFarolillo.setRotacionActiva(true)
    this.posicionarPickup(llaveFarolillo, 5, 14) 

    // 3. Crear las Castañuelas
    const castanuelas = new Castanuelas()
    this.posicionarPickup(castanuelas, 22, 5)

    // 4. Crear el Rebujito
    const rebujito = new Rebujito()
    this.posicionarPickup(rebujito, 23, 21)

    this.createGarlands()
    this.configureTopCamera()
    this.updateHud()
  }

  createGarlands() {
    if (this.garlandGroup) {
      this.remove(this.garlandGroup)
    }

    this.garlandGroup = new THREE.Group()
    this.garlandBulbs = []
    this.garlandPointLights = []

    this.garlandCableMaterial = new THREE.LineBasicMaterial({ color: 0x1c1510 })
    this.garlandBulbGeometry = new THREE.SphereGeometry(0.055, 12, 8)
    this.garlandBulbMaterials = [
      this.createGarlandBulbMaterial(0xffd36a),
      this.createGarlandBulbMaterial(0xff6f5f),
      this.createGarlandBulbMaterial(0x67d8ff),
      this.createGarlandBulbMaterial(0x82ff9a)
    ]

    const horizontalRuns = this.findFreeRuns('horizontal', 3)
    const verticalRuns = this.findFreeRuns('vertical', 3)

    horizontalRuns.forEach((run) => this.addGarlandRun(run, 'horizontal'))
    verticalRuns.forEach((run) => this.addGarlandRun(run, 'vertical'))

    this.add(this.garlandGroup)
  }

  createGarlandBulbMaterial(color) {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2,
      roughness: 0.25
    })
  }

  findFreeRuns(direction, minLength) {
    const runs = []

    if (direction === 'horizontal') {
      for (let fila = 1; fila < this.model.zNumBloques - 1; fila++) {
        let start = null

        for (let columna = 1; columna < this.model.xNumBloques - 1; columna++) {
          const isFree = !this.model.esMuro(fila, columna)

          if (isFree && start === null) {
            start = columna
          }

          if ((!isFree || columna === this.model.xNumBloques - 2) && start !== null) {
            const end = isFree && columna === this.model.xNumBloques - 2 ? columna : columna - 1

            if (end - start + 1 >= minLength) {
              runs.push({ fila, start, end })
            }

            start = null
          }
        }
      }
    } else {
      for (let columna = 1; columna < this.model.xNumBloques - 1; columna++) {
        let start = null

        for (let fila = 1; fila < this.model.zNumBloques - 1; fila++) {
          const isFree = !this.model.esMuro(fila, columna)

          if (isFree && start === null) {
            start = fila
          }

          if ((!isFree || fila === this.model.zNumBloques - 2) && start !== null) {
            const end = isFree && fila === this.model.zNumBloques - 2 ? fila : fila - 1

            if (end - start + 1 >= minLength) {
              runs.push({ columna, start, end })
            }

            start = null
          }
        }
      }
    }

    return runs
  }

  addGarlandRun(run, direction) {
    const startCell = new THREE.Vector3()
    const endCell = new THREE.Vector3()
    const y = 2.34

    if (direction === 'horizontal') {
      this.model.getMundoFromCelda(run.fila, run.start, startCell)
      this.model.getMundoFromCelda(run.fila, run.end, endCell)
    } else {
      this.model.getMundoFromCelda(run.start, run.columna, startCell)
      this.model.getMundoFromCelda(run.end, run.columna, endCell)
    }

    const length = startCell.distanceTo(endCell)
    const bulbCount = Math.max(2, Math.floor(length / 0.62) + 1)
    const points = []

    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      const point = new THREE.Vector3().lerpVectors(startCell, endCell, t)
      point.y = y - Math.sin(t * Math.PI) * 0.16
      points.push(point)
    }

    const cable = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      this.garlandCableMaterial
    )
    this.garlandGroup.add(cable)

    for (let i = 0; i < bulbCount; i++) {
      const t = bulbCount === 1 ? 0.5 : i / (bulbCount - 1)
      const position = new THREE.Vector3().lerpVectors(startCell, endCell, t)
      position.y = y - Math.sin(t * Math.PI) * 0.16 - 0.09
      this.addGarlandBulb(position, this.garlandBulbs.length)
    }
  }

  addGarlandBulb(position, index) {
    const material = this.garlandBulbMaterials[index % this.garlandBulbMaterials.length]
    const bulb = new THREE.Mesh(this.garlandBulbGeometry, material)

    bulb.position.copy(position)
    bulb.userData.phase = index * 0.41
    bulb.userData.baseScale = 1
    this.garlandGroup.add(bulb)
    this.garlandBulbs.push(bulb)

    // Solo algunas bombillas tienen PointLight real para mantener buen rendimiento.
    if (this.garlandPointLights.length < 32 && index % 8 === 0) {
      const light = new THREE.PointLight(material.color, 0.04, 3.7, 1.45)
      light.position.copy(position)
      light.userData.phase = bulb.userData.phase
      this.garlandGroup.add(light)
      this.garlandPointLights.push(light)
    }
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
    objeto.updateMatrixWorld(true)

    const cajaFinal = new THREE.Box3().setFromObject(objeto)
    const tamanoPickup = new THREE.Vector3()
    cajaFinal.getSize(tamanoPickup)
    objeto.userData.obstaculo = true
    objeto.userData.radioObstaculo = Math.max(tamanoPickup.x, tamanoPickup.z) * 0.5
    
    this.add(objeto)                     // Para que se vean
    this.pickups.push(objeto)            // Para poder recogerlos con el Raycaster
    this.registerAnimatedObject(objeto)  // Para que se muevan solos (animación continua) 
    
    objeto.userData.recogible = true
  }

  updateMousePointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect()

    this.mousePointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mousePointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    return this.mousePointer
  }

  tryPickUp(pointer = this.centerPointer) {
    // Apuntamos el raycaster desde el centro de la pantalla o desde el cursor.
    this.raycaster.setFromCamera(pointer, this.camera);

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
            return true;
        }
    }

    return false;
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

  onMouseClick(event) {
    if (!this.cameraControl.isLocked) {
      // Con el cursor libre se puede recoger un pick-up sin que la vista se mueva.
      const pointer = this.updateMousePointer(event)

      if (this.tryInteractWithDoor(pointer) || this.tryPickUp(pointer)) {
        return
      }

      // Si no se ha pulsado sobre nada interactivo, el click activa la vista en primera persona.
      this.cameraControl.lock()
      return
    }

    // 1. Intentamos abrir la puerta (esto ya lo tienes)
    this.tryInteractWithDoor();

    // 2. NUEVO: Intentamos recoger un pick-up
    this.tryPickUp();
  }

  onMouseRightClick(event) {
    event.preventDefault()

    if (this.cameraControl.isLocked) {
      this.cameraControl.unlock()
      this.setHudMessage('Cursor libre: click sobre un pick-up')
    }
  }

  tryInteractWithDoor(pointer = this.centerPointer) {
    if (!this.doorGroup.visible || this.doorOpening) {
      return false
    }

    // Para abrir la puerta hay que apuntar al pomo, estar cerca y haber recogido todo.
    this.raycaster.setFromCamera(pointer, this.camera)
    const hits = this.raycaster.intersectObject(this.doorKnob, true)

    if (hits.length === 0 || hits[0].distance > this.interactionDistance) {
      return false
    }

    if (!this.todosPickupsRecogidos()) {
      this.setHudMessage(`Puerta cerrada: faltan ${this.pickupsPendientes()} pick-ups`)
      this.flashKnob(0x661111)
      return true
    }

    this.openDoor()
    return true
  }

  openDoor() {
    if (this.doorOpening) {
      return
    }

    this.doorOpening = true
    this.setHudMessage('Abriendo cerradura...')
    this.flashKnob(0x226611)

    if (this.doorTween) {
      this.doorTween.stop()
    }

    if (this.keyInsertTween) {
      this.keyInsertTween.stop()
    }

    if (this.keyTurnTween) {
      this.keyTurnTween.stop()
    }

    this.animateKeyUnlock()
  }

  animateKeyUnlock() {
    const startZ = -0.38
    const insertedZ = -0.13
    const keyState = { z: startZ, turn: 0 }

    this.doorKey.visible = true
    this.doorKey.position.z = startZ
    this.doorKey.rotation.set(0, 0, 0)

    this.keyInsertTween = new TWEEN.Tween(keyState)
      .to({ z: insertedZ }, 520)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        this.doorKey.position.z = keyState.z
      })
      .onComplete(() => {
        this.keyTurnTween = new TWEEN.Tween(keyState)
          .to({ turn: Math.PI * 1.75 }, 620)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate(() => {
            this.doorKey.rotation.z = keyState.turn
          })
          .onComplete(() => {
            this.startDoorOpening()
          })
          .start()
      })
      .start()
  }

  startDoorOpening() {
    this.setHudMessage('Puerta abierta')

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
    this.setSkyProgressFromPickups()
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

    // La camara solo se mueve si el jugador no invade muros ni pick-ups pendientes.
    if (this.canPlayerMoveTo(candidate)) {
      this.camera.position.copy(candidate)
    }
  }

  canPlayerMoveTo(position) {
    return (
      this.model.puedeMoverseA(position, this.playerRadius) &&
      !this.intersectsPickupObstacle(position)
    )
  }

  intersectsPickupObstacle(position) {
    return this.pickups.some((pickup) => {
      if (!pickup.userData.obstaculo || pickup.recogido || pickup.collected || !pickup.visible) {
        return false
      }

      pickup.getWorldPosition(this.tmpPickupPosition)

      const minDistance = this.playerRadius + pickup.userData.radioObstaculo
      const dx = position.x - this.tmpPickupPosition.x
      const dz = position.z - this.tmpPickupPosition.z

      return dx * dx + dz * dz < minDistance * minDistance
    })
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
    this.updateSky(delta)
    this.updateGarlandLights()
  }

  updateGarlandLights() {
    const nightFactor = THREE.MathUtils.smoothstep(this.skyProgress, 0.18, 1.0)
    const emissiveIntensity = THREE.MathUtils.lerp(0.18, 2.25, nightFactor)
    const lightIntensity = THREE.MathUtils.lerp(0.0, 1.35, nightFactor)

    if (this.garlandBulbMaterials) {
      this.garlandBulbMaterials.forEach((material, index) => {
        const pulse = 0.88 + Math.sin(this.lightTime * 2.4 + index * 0.9) * 0.12
        material.emissiveIntensity = emissiveIntensity * pulse
      })
    }

    this.garlandBulbs.forEach((bulb) => {
      const pulse = 0.96 + Math.sin(this.lightTime * 3.1 + bulb.userData.phase) * 0.04
      bulb.scale.setScalar(pulse)
    })

    this.garlandPointLights.forEach((light) => {
      const pulse = 0.82 + Math.sin(this.lightTime * 2.8 + light.userData.phase) * 0.18
      light.intensity = lightIntensity * pulse
    })
  }

  setSkyProgressFromPickups() {
    const total = Math.max(1, this.totalPickupsActual())
    this.targetSkyProgress = THREE.MathUtils.clamp(this.pickupsRecogidosActuales() / total, 0, 1)
  }

  updateSky(delta) {
    this.setSkyProgressFromPickups()

    const previousProgress = this.skyProgress
    this.skyProgress = THREE.MathUtils.damp(this.skyProgress, this.targetSkyProgress, 1.8, delta)

    if (Math.abs(this.skyProgress - previousProgress) > 0.002 || this.skyTextureNeedsRefresh) {
      this.applySkyState(this.skyProgress)
      this.drawSkyTexture(this.skyProgress)
      this.skyTextureNeedsRefresh = false
    }

    if (this.skyDome) {
      this.skyDome.position.copy(this.camera.position)
    }
  }

  applySkyState(progress) {
    const dawn = new THREE.Color(0x77b8df)
    const sunset = new THREE.Color(0xf08d56)
    const night = new THREE.Color(0x020713)
    const fogDay = new THREE.Color(0xf3c36f)
    const fogNight = new THREE.Color(0x030814)

    const skyColor = dawn.clone()

    if (progress < 0.58) {
      skyColor.lerp(sunset, progress / 0.58)
    } else {
      skyColor.copy(sunset).lerp(night, (progress - 0.58) / 0.42)
    }

    this.background.copy(skyColor)
    this.fog.color.copy(fogDay).lerp(fogNight, progress)
    this.fog.near = THREE.MathUtils.lerp(13, 9, progress)
    this.fog.far = THREE.MathUtils.lerp(36, 26, progress)

    this.sunLight.intensity = THREE.MathUtils.lerp(1.35, 0.08, progress)
    this.sunLight.color.copy(new THREE.Color(0xfff4df).lerp(new THREE.Color(0x2f3d69), progress))
    this.sunLight.position.set(
      THREE.MathUtils.lerp(6, -6, progress),
      THREE.MathUtils.lerp(14, 2.5, progress),
      THREE.MathUtils.lerp(5, -4, progress)
    )
  }

  drawSkyTexture(progress) {
    const context = this.skyContext
    const width = this.skyCanvas.width
    const height = this.skyCanvas.height
    const topColor = this.getSkyGradientColor(progress, true)
    const horizonColor = this.getSkyGradientColor(progress, false)
    const gradient = context.createLinearGradient(0, 0, 0, height)

    gradient.addColorStop(0, topColor)
    gradient.addColorStop(0.72, horizonColor)
    gradient.addColorStop(1, '#f0bd69')

    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)

    const sunProgress = THREE.MathUtils.clamp(progress / 0.72, 0, 1)
    const sunX = THREE.MathUtils.lerp(width * 0.24, width * 0.74, sunProgress)
    const sunY = THREE.MathUtils.lerp(height * 0.26, height * 0.74, sunProgress)
    const sunRadius = THREE.MathUtils.lerp(24, 15, progress)
    const sunAlpha = THREE.MathUtils.clamp(1 - progress * 1.15, 0, 1)

    context.globalAlpha = sunAlpha
    context.fillStyle = '#ffe7a3'
    context.beginPath()
    context.arc(sunX, sunY, sunRadius, 0, Math.PI * 2)
    context.fill()

    const moonAlpha = THREE.MathUtils.clamp((progress - 0.62) / 0.38, 0, 1)
    context.globalAlpha = moonAlpha
    context.fillStyle = '#f1f0da'
    context.beginPath()
    context.arc(width * 0.74, height * 0.26, 18, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = this.getSkyGradientColor(progress, true)
    context.beginPath()
    context.arc(width * 0.755, height * 0.245, 18, 0, Math.PI * 2)
    context.fill()

    context.globalAlpha = THREE.MathUtils.clamp((progress - 0.48) / 0.52, 0, 1)
    context.fillStyle = '#fff8d6'
    this.skyStars.forEach((star) => {
      context.globalAlpha = star.alpha * THREE.MathUtils.clamp((progress - 0.48) / 0.52, 0, 1)
      context.beginPath()
      context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2)
      context.fill()
    })

    context.globalAlpha = 1
    this.skyTexture.needsUpdate = true
  }

  getSkyGradientColor(progress, isTop) {
    const day = new THREE.Color(isTop ? 0x77b8df : 0xffd08b)
    const sunset = new THREE.Color(isTop ? 0xe27765 : 0xffb45f)
    const night = new THREE.Color(isTop ? 0x020713 : 0x071225)
    const color = day.clone()

    if (progress < 0.58) {
      color.lerp(sunset, progress / 0.58)
    } else {
      color.copy(sunset).lerp(night, (progress - 0.58) / 0.42)
    }

    return `#${color.getHexString()}`
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
      const skyWasVisible = this.skyDome ? this.skyDome.visible : false
      const sceneFog = this.fog

      if (this.skyDome) {
        this.skyDome.visible = false
      }

      this.fog = null
      this.renderViewport(this, this.topCamera, left, bottom, size, size)
      this.fog = sceneFog

      if (this.skyDome) {
        this.skyDome.visible = skyWasVisible
      }

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
