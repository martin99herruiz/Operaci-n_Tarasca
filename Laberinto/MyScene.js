import * as THREE from 'three'
import * as TWEEN from '../libs/tween.esm.js'
import { GUI } from 'gui'
import { PointerLockControls } from '../libs/PointerLockControls.js'

import { Abanico } from '../pick-ups/Abanico.js?v=huida-pasillos-3'
import { Farolillo } from '../pick-ups/Farolillo.js?v=materiales-2'
import { Castanuelas } from '../pick-ups/Castanuelas.js?v=materiales-3'
import { Rebujito } from '../pick-ups/Rebujito.js?v=materiales-2'

import { Laberinto } from './Laberinto.js?v=feria-casetas-30'
import { FeriaExtras } from './FeriaExtras.js?v=feria-extras-18'

class MyScene extends THREE.Scene {

  constructor(myCanvas) {
    super()

    this.renderer = this.createRenderer(myCanvas)
    this.clock = new THREE.Clock()

    // Parametros principales del jugador y de las ayudas de prueba.
    this.playerHeight = 1.25
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
    this.tmpCrowdPosition = new THREE.Vector3()
    this.centerPointer = new THREE.Vector2(0, 0)
    this.mousePointer = new THREE.Vector2(0, 0)
    this.raycaster = new THREE.Raycaster()

    this.guiControls = {
      velocidad: 2.2,
      mostrarMiniMapa: true,
      luzBombillas: 1.0,
      musica: true,
      volumenMusica: 0.35
    }

    this.background = new THREE.Color(0x77b8df)

    this.objetoMiradoActual = null; 
    this.raycasterPicking = new THREE.Raycaster();
    this.raycasterPicking.far = 3.5;

    this.borracheraActiva = false;   
    this.tiempoBorrachera = 0;      
    this.duracionBorrachera = 6.0;
    this.musicAudio = null
    this.musicStarted = false
    this.musicMissingNotified = false

    this.fog = new THREE.Fog(0xf3c36f, 13, 36)

    // La escena se construye en varias funciones para separar camaras, luces,
    // suelo, puerta, interfaz y eventos.
    this.createCameras()
    this.createSky()
    this.createLights()
    this.createGround()
    this.createDoor()
    this.createPlayerMarker()
    this.setupMusic()
    this.createGUI()
    this.bindEvents()

    const laberintoCargado = $.Deferred()
    this.model = new Laberinto('./laberinto.txt?v=feria-31', laberintoCargado)
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
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.38)
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

    this.fillLight = new THREE.PointLight(0x5fb7ff, 1.15, 13, 1.7)
    this.fillLight.position.set(-5.5, 2.4, -4.5)
    this.add(this.fillLight)

    this.dynamicLight = new THREE.PointLight(0xff6a3d, 1.25, 9, 1.6)
    this.dynamicLight.position.set(0, 2.1, -2.5)
    this.add(this.dynamicLight)
  }

createAlberoTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    context.fillStyle = '#8080ff'; 
    context.fillRect(0, 0, size, size);

    const imageData = context.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const nx = Math.random() * 80 - 40;
      const ny = Math.random() * 80 - 40;

      data[i] = THREE.MathUtils.clamp(data[i] + nx, 0, 255);     // Canal R
      data[i + 1] = THREE.MathUtils.clamp(data[i + 1] + ny, 0, 255); // Canal G
    }

    context.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(18, 18);
    return texture;
  }

createGround() {
    const size = 256;
    const cColor = document.createElement('canvas');
    cColor.width = cColor.height = size;
    const ctx = cColor.getContext('2d');
    ctx.fillStyle = '#c68f3b';
    ctx.fillRect(0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = Math.random() * 30 - 15;
      imgData.data[i] = THREE.MathUtils.clamp(imgData.data[i]+n, 0, 255);
      imgData.data[i+1] = THREE.MathUtils.clamp(imgData.data[i+1]+n*0.7, 0, 255);
      imgData.data[i+2] = THREE.MathUtils.clamp(imgData.data[i+2]+n*0.3, 0, 255);
    }
    ctx.putImageData(imgData, 0, 0);
    const alberoColor = new THREE.CanvasTexture(cColor);
    alberoColor.wrapS = alberoColor.wrapT = THREE.RepeatWrapping;
    alberoColor.repeat.set(18, 18);
    alberoColor.colorSpace = THREE.SRGBColorSpace;

    const alberoNormal = this.createAlberoTexture();

    const materialGround = new THREE.MeshStandardMaterial({
      map: alberoColor,
      normalMap: alberoNormal,
      normalScale: new THREE.Vector2(3.5, 3.5), // Escala de fuerza X e Y exagerada
      emissive: 0x6b3f12,
      emissiveIntensity: 0.08,
      roughness: 0.92,
      metalness: 0.0
    });

    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(36, 44), materialGround);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(0, -0.01, -4.5);
    this.ground.receiveShadow = true;
    this.add(this.ground);
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
      // El hueco final del laberinto mide 5 celdas de ancho:
      // 3 celdas de vano central + 1 celda lateral por cada lado.
      openingWidth: 3.0,
      openingRectHeight: 2.2,
      openingHeight: 3.7,
      frameThickness: 0.14,
      frameDepth: 0.24,
      panelDepth: 0.12,
      portadaWingWidth: 1.0,
      portadaHeight: 4.5
    }

    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x6a3920,
      roughness: 0.52,
      metalness: 0.05
    })

    const portadaStone = new THREE.MeshStandardMaterial({
      color: 0xc7cfbf,
      roughness: 0.9,
      metalness: 0.02
    })
    const portadaShadow = new THREE.MeshStandardMaterial({
      color: 0xb6c0af,
      roughness: 0.88,
      metalness: 0.02
    })
    const portadaTrim = new THREE.MeshStandardMaterial({
      color: 0xa2ac98,
      roughness: 0.84,
      metalness: 0.04
    })
    const portadaImageTexture = new THREE.TextureLoader().load('../imgs/images_alhambra.jpeg')
    portadaImageTexture.colorSpace = THREE.SRGBColorSpace
    const portadaImageMaterial = new THREE.MeshStandardMaterial({
      map: portadaImageTexture,
      roughness: 0.7,
      metalness: 0.02
    })

    this.knobMaterial = new THREE.MeshStandardMaterial({
      color: 0xd6b64c,
      roughness: 0.24,
      metalness: 0.9,
      emissive: 0x000000
    })

    const {
      openingWidth,
      openingRectHeight,
      openingHeight,
      frameThickness,
      frameDepth,
      panelDepth,
      portadaWingWidth,
      portadaHeight
    } = this.doorMetrics
    const doorWidth = openingWidth
    const doorRectHeight = openingRectHeight
    const totalPortadaWidth = openingWidth + portadaWingWidth * 2

    // Hoja de la puerta. Su origen queda en la bisagra izquierda para que rote
    // de forma natural al abrirse.
    const door = this.createArchedDoorPanel(doorWidth, doorRectHeight, panelDepth, doorMaterial)
    door.position.set(0, 0, 0)
    this.doorPivot.add(door)

    // Plano oscuro detras de la hoja, usado como hueco visual de salida.
    this.doorVoid = new THREE.Mesh(
      new THREE.BoxGeometry(openingWidth, openingHeight, 0.035),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    )
    this.doorVoid.position.set(openingWidth / 2, openingHeight / 2, 0.07)
    this.doorVoid.renderOrder = -1
    this.doorVoid.castShadow = false
    this.doorVoid.receiveShadow = false

    this.doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.065, 24, 16), this.knobMaterial)
    this.doorKnob.position.set(doorWidth * 0.82, doorRectHeight * 0.47, -panelDepth * 0.78)
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
    const lockY = doorRectHeight * 0.35
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

    // Portada inspirada en la portada de Granada: cuerpo central con arco,
    // paños laterales, coronación y decoración en relieve.
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(portadaWingWidth, portadaHeight, 0.36), portadaStone)
    const rightWing = leftWing.clone()
    leftWing.position.set(-portadaWingWidth * 0.5, portadaHeight * 0.5, 0)
    rightWing.position.set(openingWidth + portadaWingWidth * 0.5, portadaHeight * 0.5, 0)

    const leftNiche = this.createBlindArchRelief(0.62, 2.15, 0.08, portadaTrim, portadaShadow)
    const rightNiche = this.createBlindArchRelief(0.62, 2.15, 0.08, portadaTrim, portadaShadow)
    leftNiche.position.set(-portadaWingWidth * 0.5, 1.35, -0.16)
    rightNiche.position.set(openingWidth + portadaWingWidth * 0.5, 1.35, -0.16)

    const leftPier = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, openingRectHeight + 0.66, frameDepth + 0.04),
      portadaTrim
    )
    const rightPier = leftPier.clone()
    leftPier.position.set(-frameThickness * 0.5, (openingRectHeight + 0.66) * 0.5, 0)
    rightPier.position.set(openingWidth + frameThickness * 0.5, (openingRectHeight + 0.66) * 0.5, 0)

    const columnLeft = this.createPortadaColumn(openingRectHeight + 0.22, 0.09, portadaStone, portadaTrim)
    const columnRight = this.createPortadaColumn(openingRectHeight + 0.22, 0.09, portadaStone, portadaTrim)
    columnLeft.position.set(-0.22, 0.12, -0.12)
    columnRight.position.set(openingWidth + 0.22, 0.12, -0.12)

    const archRing = new THREE.Mesh(
      new THREE.TorusGeometry(openingWidth * 0.5 + frameThickness * 0.48, frameThickness, 16, 64, Math.PI),
      portadaTrim
    )
    archRing.position.set(openingWidth * 0.5, openingRectHeight, -0.03)

    const corniceMain = new THREE.Mesh(
      new THREE.BoxGeometry(totalPortadaWidth + 0.24, 0.24, 0.44),
      portadaTrim
    )
    corniceMain.position.set(openingWidth * 0.5, openingHeight + 0.07, 0)

    const corniceUpper = new THREE.Mesh(
      new THREE.BoxGeometry(totalPortadaWidth * 0.78, 0.21, 0.36),
      portadaStone
    )
    corniceUpper.position.set(openingWidth * 0.5, openingHeight + 0.27, 0)

    const pediment = this.createPortadaPediment(totalPortadaWidth * 0.62, 0.56, 0.3, portadaStone)
    pediment.position.set(openingWidth * 0.5, openingHeight + 0.37, 0.01)

    const crestBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.16, 18), portadaTrim)
    crestBase.position.set(openingWidth * 0.5, openingHeight + 0.74, -0.03)
    const crestImage = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.24), portadaImageMaterial)
    crestImage.position.set(openingWidth * 0.5, openingHeight + 0.73, -0.16)
    crestImage.rotation.y = Math.PI

    this.doorGroup.add(
      this.doorVoid,
      leftWing,
      rightWing,
      leftNiche,
      rightNiche,
      leftPier,
      rightPier,
      columnLeft,
      columnRight,
      archRing,
      corniceMain,
      corniceUpper,
      pediment,
      crestBase,
      crestImage,
      this.doorPivot
    )

    this.doorGroup.traverse((node) => {
      if (node.isMesh && node !== this.doorVoid) {
        node.castShadow = true
        node.receiveShadow = true
      }
    })

    this.doorGroup.visible = false
    this.add(this.doorGroup)
  }

  createArchedDoorPanel(width, rectHeight, depth, material) {
    const radius = width * 0.5
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(width, 0)
    shape.lineTo(width, rectHeight)
    shape.absarc(width * 0.5, rectHeight, radius, 0, Math.PI, false)
    shape.lineTo(0, 0)

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 28
    })
    geometry.translate(0, 0, -depth * 0.5)
    return new THREE.Mesh(geometry, material)
  }

  createPortadaColumn(height, radius, shaftMaterial, capMaterial) {
    const column = new THREE.Group()
    const shaftHeight = height * 0.72
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.84, radius, shaftHeight, 18),
      shaftMaterial
    )
    shaft.position.y = height * 0.45

    const base = new THREE.Mesh(new THREE.BoxGeometry(radius * 3.2, height * 0.16, 0.18), capMaterial)
    base.position.y = height * 0.08

    const capital = new THREE.Mesh(new THREE.BoxGeometry(radius * 3.5, height * 0.16, 0.2), capMaterial)
    capital.position.y = height * 0.82

    column.add(shaft, base, capital)
    return column
  }

  createBlindArchRelief(width, height, depth, frameMaterial, fillMaterial) {
    const relief = new THREE.Group()
    const panel = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), fillMaterial)
    panel.position.z = -depth * 0.3
    relief.add(panel)

    const postWidth = width * 0.13
    const postHeight = height * 0.58
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(postWidth, postHeight, depth * 1.12), frameMaterial)
    const rightPost = leftPost.clone()
    const postY = -height * 0.19
    leftPost.position.set(-(width * 0.5) + postWidth * 0.5, postY, depth * 0.05)
    rightPost.position.set((width * 0.5) - postWidth * 0.5, postY, depth * 0.05)

    const archRadius = (width - postWidth * 2) * 0.5
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(archRadius, postWidth * 0.48, 12, 32, Math.PI),
      frameMaterial
    )
    arch.position.set(0, postY + postHeight * 0.5, depth * 0.05)

    relief.add(leftPost, rightPost, arch)
    return relief
  }

  createPortadaPediment(width, height, depth, material) {
    const shape = new THREE.Shape()
    shape.moveTo(-width * 0.5, 0)
    shape.lineTo(0, height)
    shape.lineTo(width * 0.5, 0)
    shape.lineTo(-width * 0.5, 0)

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false
    })
    geometry.translate(0, 0, -depth * 0.5)
    return new THREE.Mesh(geometry, material)
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

  setupMusic() {
    // Se prepara el entorno de audio aunque el fichero aun no exista.
    // El navegador solo permite reproducir tras una interaccion del usuario.
    this.musicAudio = new Audio('../audio/operacion_tarasca.mp3')
    this.musicAudio.loop = true
    this.musicAudio.preload = 'none'
    this.musicAudio.volume = THREE.MathUtils.clamp(this.guiControls.volumenMusica, 0, 1)
    this.musicAudio.muted = !this.guiControls.musica

    this.musicAudio.addEventListener('error', () => {
      if (this.musicMissingNotified) {
        return
      }

      this.musicMissingNotified = true
      console.warn('No se pudo cargar ../audio/operacion_tarasca.mp3')
    })
  }

  applyMusicVolume() {
    if (!this.musicAudio) {
      return
    }

    this.musicAudio.volume = THREE.MathUtils.clamp(this.guiControls.volumenMusica, 0, 1)
  }

  setMusicEnabled(enabled) {
    this.guiControls.musica = enabled

    if (!this.musicAudio) {
      return
    }

    this.musicAudio.muted = !enabled

    if (!enabled) {
      this.musicAudio.pause()
      return
    }

    this.ensureMusicStarted()
  }

  ensureMusicStarted() {
    if (!this.musicAudio || !this.guiControls.musica) {
      return
    }

    this.applyMusicVolume()
    const playPromise = this.musicAudio.play()

    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          this.musicStarted = true
        })
        .catch(() => {
          // Se ignora: puede fallar hasta que haya gesto de usuario o si no existe el archivo.
        })
    }
  }

  createGUI() {
    const gui = new GUI({ width: 310 })
    gui.domElement.style.position = 'absolute'
    gui.domElement.style.top = '16px'
    gui.domElement.style.left = '16px'
    gui.domElement.style.right = 'auto'

    gui.add(this.guiControls, 'velocidad', 0.6, 5.0, 0.1)
      .name('Velocidad')

    gui.add(this.guiControls, 'mostrarMiniMapa')
      .name('Mini-mapa')

    gui.add(this.guiControls, 'luzBombillas', 0, 3, 0.05)
      .name('Luz bombillas')

    gui.add(this.guiControls, 'musica')
      .name('Musica')
      .onChange((valor) => this.setMusicEnabled(valor))

    gui.add(this.guiControls, 'volumenMusica', 0, 1, 0.01)
      .name('Volumen musica')
      .onChange(() => this.applyMusicVolume())

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

    this.placePlayerAtEntrance()
    this.placeDoorAtWall(27, 14, 'south')

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

    this.feriaExtras = new FeriaExtras(this.model)
    this.add(this.feriaExtras)
    this.configureTopCamera()
    this.updateHud()
  }

  placePlayerAtCell(fila, columna) {
    this.model.getMundoFromCelda(fila, columna, this.tmpPosition)
    this.camera.position.set(this.tmpPosition.x, this.playerHeight, this.tmpPosition.z)
    this.camera.lookAt(this.tmpPosition.x + 1, this.playerHeight, this.tmpPosition.z)
  }

  placePlayerAtEntrance() {
    const leftOpening = new THREE.Vector3()
    const rightOpening = new THREE.Vector3()
    this.model.getMundoFromCelda(0, 1, leftOpening)
    this.model.getMundoFromCelda(0, 5, rightOpening)

    const entranceX = (leftOpening.x + rightOpening.x) * 0.5
    const entranceZ = leftOpening.z - this.model.anchoBloque * 6

    this.camera.position.set(entranceX, this.playerHeight, entranceZ)
    this.camera.lookAt(entranceX, this.playerHeight, leftOpening.z + this.model.anchoBloque)
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

  checkPickingHighlight() {
    // 1. Apuntamos el raycaster hacia el centro exacto de la pantalla (coordenadas 0,0)
    this.raycasterPicking.setFromCamera(this.centerPointer, this.camera);

    // 2. Buscamos colisiones en nuestro array de pick-ups interactuables
    const intersecciones = this.raycasterPicking.intersectObjects(this.pickups, true);

    if (intersecciones.length > 0) {
      const objetoImpactado = intersecciones[0].object;

      // 3. Escalamos en el árbol jerárquico hasta encontrar el nodo raíz que tenga 'recogible'
      let nodoEstructura = objetoImpactado;
      while (nodoEstructura && !nodoEstructura.userData.recogible) {
        nodoEstructura = nodoEstructura.parent;
      }

      // 4. Si es un pick-up válido y no lo hemos recogido todavía...
      if (nodoEstructura && nodoEstructura.userData.recogible && !nodoEstructura.recogido) {
        
        // Si el objeto es distinto al que mirábamos en el frame anterior:
        if (this.objetoMiradoActual !== nodoEstructura) {
          // Apagamos el brillo del objeto viejo (si había uno)
          this.apagarBrilloObjeto(this.objetoMiradoActual);
          
          // Guardamos y encendemos el nuevo objeto
          this.objetoMiradoActual = nodoEstructura;
          this.encenderBrilloObjeto(this.objetoMiradoActual);
        }
        return; // Salimos de la función (el objeto ya está brillando)
      }
    }

    // 5. Si el rayo no choca con nada interactuable pero teníamos un objeto encendido, lo apagamos
    if (this.objetoMiradoActual) {
      this.apagarBrilloObjeto(this.objetoMiradoActual);
      this.objetoMiradoActual = null;
    }
  }

  encenderBrilloObjeto(objeto) {
    if (!objeto) return;

    objeto.traverse((nodo) => {
      if (nodo.isMesh && nodo.material) {
        // Guardamos el color emissive original en userData para no perderlo
        if (nodo.userData.emissiveOriginal === undefined) {
          nodo.userData.emissiveOriginal = nodo.material.emissive.getHex();
        }
        // Aplicamos un brillo dorado/amarillo suave estilo bombilla de feria
        nodo.material.emissive.setHex(0x443311);
      }
    });
  }

  apagarBrilloObjeto(objeto) {
    if (!objeto) return;

    objeto.traverse((nodo) => {
      if (nodo.isMesh && nodo.material && nodo.userData.emissiveOriginal !== undefined) {
        // Restauramos el color original del material
        nodo.material.emissive.setHex(nodo.userData.emissiveOriginal);
      }
    });
  }

  recogerObjeto(objeto) {
    if (typeof objeto.recoger === 'function') {
      objeto.recoger();
    } else {
      // Si no, aplica la recogida estándar para el resto de pick-ups
      objeto.recogido = true;
      objeto.visible = false;
    }
    
    // Sumamos al contador interno y actualizamos el texto de arriba a la izquierda
    this.registrarPickupRecogido(); 
    
    this.setHudMessage("¡Has recogido un pick-up!");
    
    // Opcional: imprimir en consola para depurar
    console.log("Pickups recogidos:", this.pickupsRecogidosActuales());
  }

  activarEfectoBorrachera() {
    this.borracheraActiva = true;
    this.tiempoBorrachera = 0;
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
    if (pressed) {
      this.ensureMusicStarted()
    }

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
    this.ensureMusicStarted()

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
        // Al abrir completamente la puerta, consideramos el juego terminado.
        this.onGameFinished()
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
      !this.intersectsPickupObstacle(position) &&
      !this.intersectsCrowdObstacle(position)
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

  intersectsCrowdObstacle(position) {
    if (!this.feriaExtras || !Array.isArray(this.feriaExtras.flamencoFigures)) {
      return false
    }

    return this.feriaExtras.flamencoFigures.some((figure) => {
      if (!figure.visible || !figure.userData.obstaculo) {
        return false
      }

      figure.getWorldPosition(this.tmpCrowdPosition)

      const radius = figure.userData.radioObstaculo || 0.17
      const minDistance = this.playerRadius + radius
      const dx = position.x - this.tmpCrowdPosition.x
      const dz = position.z - this.tmpCrowdPosition.z

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
    this.animatedObjects.forEach((object) => object.update(delta, this.camera.position))
  }

  updateLights(delta) {
    this.lightTime += delta
    this.updateSky(delta)

    if (this.dynamicLight) {
      const hue = (0.04 + this.lightTime * 0.05) % 1
      this.dynamicLight.color.setHSL(hue, 0.85, 0.55)
      this.dynamicLight.intensity = 1.25 + Math.sin(this.lightTime * 1.4) * 0.35
    }

    if (this.feriaExtras) {
      this.feriaExtras.update(this.lightTime, this.skyProgress, this.guiControls.luzBombillas)
    }
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

    this.ambientLight.intensity = THREE.MathUtils.lerp(0.38, 0.18, progress)
    this.fillLight.intensity = THREE.MathUtils.lerp(1.15, 1.85, progress)
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

  onGameFinished() {
    if (this.musicAudio) {
      this.musicAudio.pause()
    }

    // Liberar el cursor si estaba bloqueado
    try {
      if (this.cameraControl && this.cameraControl.isLocked) {
        this.cameraControl.unlock()
      }
    } catch (e) {
      // Ignorar si no está disponible
    }

    const end = document.getElementById('EndScreen')
    if (!end) return

    const msg = document.getElementById('EndScreenMessage')
    if (msg) msg.textContent = 'Con estilo y elegancia hoy te vuelves en ambulancia'

    // Mostrar overlay
    end.style.display = 'flex'

    const btn = document.getElementById('RestartButton')
    if (btn) {
      btn.addEventListener('click', () => {
        // Reinicia recargando la página para volver a empezar la escena
        window.location.reload()
      })
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

    this.checkPickingHighlight();

    // Bucle principal de juego: entrada, animaciones, HUD y render.
    this.updatePlayer(delta)
    this.updateDoor(delta)
    this.updateAnimatedObjects(delta)
    this.updateLights(delta)
    this.updatePlayerMarker()
    this.updateHud()

    // =====================================================
    // NUEVO: EFECTO VISUAL PROPIEDAD DE LA BORRACHERA (L4 y L5)
    // =====================================================
    if (this.borracheraActiva) {
      const segundos = delta > 10 ? delta / 1000 : delta;
      this.tiempoBorrachera += segundos;

      if (this.tiempoBorrachera < this.duracionBorrachera) {
        // Mientras dure el efecto, balanceamos la cámara
        this.camera.rotation.z = Math.sin(this.tiempoBorrachera * 3.5) * 0.08; 
        
        if (this.camera.isPerspectiveCamera) {
          this.camera.fov = 65 + Math.sin(this.tiempoBorrachera * 2.0) * 8;
          this.camera.updateProjectionMatrix();
        }
      } else {
        // =====================================================
        // ¡FIN DEL EFECTO!: RESETEO SEGURO Y LIMPIO
        // =====================================================
        this.borracheraActiva = false;
        
        // CORRECCIÓN: Forzamos matemáticamente los 0 radianes en Z
        // para asegurar que el horizonte vuelva a estar completamente recto
        this.camera.rotation.z = 0; 
        
        if (this.camera.isPerspectiveCamera) {
          this.camera.fov = 65; // Tu FOV base de la escena
          this.camera.updateProjectionMatrix();
        }
      }
    }

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
