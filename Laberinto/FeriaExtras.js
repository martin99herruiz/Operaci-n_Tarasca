import * as THREE from 'three'

class FeriaExtras extends THREE.Group {

  constructor(laberinto) {
    super()

    this.laberinto = laberinto
    this.garlandBulbs = []
    this.garlandPointLights = []
    this.garlandLightStep = 22
    this.maxGarlandPointLights = 38
    this.garlandCableMaterial = new THREE.LineBasicMaterial({ color: 0x1c1510 })
    this.garlandBulbGeometry = new THREE.SphereGeometry(0.055, 12, 8)
    this.garlandBulbMaterials = [
      this.createBulbMaterial(0xffd36a),
      this.createBulbMaterial(0xff6f5f),
      this.createBulbMaterial(0x67d8ff),
      this.createBulbMaterial(0x82ff9a)
    ]
    this.flamencoFigures = []
    this.flamencoMaxFigures = 160
    this.flamencoSpawnModulo = 2
    this.flamencoGeometries = {
      skirt: new THREE.ConeGeometry(0.2, 0.58, 14),
      ruffle: new THREE.TorusGeometry(0.17, 0.03, 8, 18),
      torso: new THREE.CylinderGeometry(0.09, 0.11, 0.26, 12),
      head: new THREE.SphereGeometry(0.09, 14, 10),
      bun: new THREE.SphereGeometry(0.05, 10, 8),
      arm: new THREE.CylinderGeometry(0.022, 0.022, 0.26, 8),
      sleeve: new THREE.CylinderGeometry(0.033, 0.04, 0.12, 8),
      hand: new THREE.SphereGeometry(0.024, 8, 8)
    }
    this.cortoGeometries = {
      pelvis: new THREE.BoxGeometry(0.22, 0.18, 0.14),
      torso: new THREE.BoxGeometry(0.22, 0.24, 0.14),
      jacket: new THREE.BoxGeometry(0.24, 0.19, 0.16),
      shirt: new THREE.BoxGeometry(0.09, 0.19, 0.02),
      leg: new THREE.CylinderGeometry(0.034, 0.036, 0.3, 10),
      boot: new THREE.BoxGeometry(0.07, 0.075, 0.12),
      hatBrim: new THREE.CylinderGeometry(0.13, 0.13, 0.024, 20),
      hatCrown: new THREE.CylinderGeometry(0.078, 0.078, 0.09, 18)
    }
    this.flamencoSkinMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1c7a5,
      roughness: 0.62
    })
    this.flamencoHairMaterial = new THREE.MeshStandardMaterial({
      color: 0x35231b,
      roughness: 0.8
    })
    this.flamencoFigureShadowMaterial = new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: 0.86
    })
    this.flamencoDressPalette = [
      0xd73e33,
      0x1f4aa8,
      0x1e7a58,
      0x8f2e74,
      0xe28f2f,
      0x222222,
      0xc23d6b
    ]
    this.flamencoShawlPalette = [
      0xf7dec8,
      0xf4f1e5,
      0xc8e6ff,
      0xcfeec8
    ]
    this.cortoJacketMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x2f3448, roughness: 0.62 }),
      new THREE.MeshStandardMaterial({ color: 0x6d5a47, roughness: 0.62 }),
      new THREE.MeshStandardMaterial({ color: 0x454a38, roughness: 0.62 }),
      new THREE.MeshStandardMaterial({ color: 0x1f4b74, roughness: 0.62 })
    ]
    this.cortoPantMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x202022, roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: 0x2d3140, roughness: 0.72 })
    ]
    this.cortoSashMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xbd2d2d, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x4069b5, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x2f8c60, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0xdbc170, roughness: 0.5 })
    ]
    this.cortoShirtMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4efe2,
      roughness: 0.52
    })
    this.cortoHatMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2621,
      roughness: 0.78
    })
    this.cortoBootMaterial = new THREE.MeshStandardMaterial({
      color: 0x161616,
      roughness: 0.85
    })

    this.createEntranceRoad()
    this.createGarlands()
    this.createFairEntrance()
    this.createFlamencoCrowd()
  }

  createBulbMaterial(color) {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2,
      roughness: 0.25
    })
  }

  createGarlands() {
    const horizontalRuns = this.findFreeRuns('horizontal', 3)
    const verticalRuns = this.findFreeRuns('vertical', 3)

    horizontalRuns.forEach((run) => this.addGarlandRun(run, 'horizontal'))
    verticalRuns.forEach((run) => this.addGarlandRun(run, 'vertical'))
  }

  findFreeRuns(direction, minLength) {
    const runs = []

    if (direction === 'horizontal') {
      for (let fila = 1; fila < this.laberinto.zNumBloques - 1; fila++) {
        let start = null

        for (let columna = 1; columna < this.laberinto.xNumBloques - 1; columna++) {
          const isFree = !this.laberinto.esMuro(fila, columna)

          if (isFree && start === null) {
            start = columna
          }

          if ((!isFree || columna === this.laberinto.xNumBloques - 2) && start !== null) {
            const end = isFree && columna === this.laberinto.xNumBloques - 2 ? columna : columna - 1

            if (end - start + 1 >= minLength) {
              runs.push({ fila, start, end })
            }

            start = null
          }
        }
      }
    } else {
      for (let columna = 1; columna < this.laberinto.xNumBloques - 1; columna++) {
        let start = null

        for (let fila = 1; fila < this.laberinto.zNumBloques - 1; fila++) {
          const isFree = !this.laberinto.esMuro(fila, columna)

          if (isFree && start === null) {
            start = fila
          }

          if ((!isFree || fila === this.laberinto.zNumBloques - 2) && start !== null) {
            const end = isFree && fila === this.laberinto.zNumBloques - 2 ? fila : fila - 1

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
      this.laberinto.getMundoFromCelda(run.fila, run.start, startCell)
      this.laberinto.getMundoFromCelda(run.fila, run.end, endCell)
    } else {
      this.laberinto.getMundoFromCelda(run.start, run.columna, startCell)
      this.laberinto.getMundoFromCelda(run.end, run.columna, endCell)
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

    this.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      this.garlandCableMaterial
    ))

    for (let i = 0; i < bulbCount; i++) {
      const t = bulbCount === 1 ? 0.5 : i / (bulbCount - 1)
      const position = new THREE.Vector3().lerpVectors(startCell, endCell, t)
      position.y = y - Math.sin(t * Math.PI) * 0.16 - 0.09
      this.addBulb(position, this.garlandBulbs.length)
    }
  }

  createEntranceRoad() {
    const leftOpening = new THREE.Vector3()
    const rightOpening = new THREE.Vector3()
    this.laberinto.getMundoFromCelda(0, 1, leftOpening)
    this.laberinto.getMundoFromCelda(0, 5, rightOpening)

    const centerX = (leftOpening.x + rightOpening.x) * 0.5
    const entranceZ = leftOpening.z - 0.35
    const startZ = leftOpening.z - this.laberinto.anchoBloque * 6.25
    const length = entranceZ - startZ
    const centerZ = startZ + length * 0.5

    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x8d6a42,
      emissive: 0x34210d,
      emissiveIntensity: 0.06,
      roughness: 0.92
    })
    const borderMaterial = new THREE.MeshStandardMaterial({
      color: 0xd7bd83,
      emissive: 0x3a2b12,
      emissiveIntensity: 0.05,
      roughness: 0.8
    })
    const markMaterial = new THREE.MeshBasicMaterial({ color: 0xf4dfaa })

    const road = new THREE.Mesh(new THREE.PlaneGeometry(3.65, length), roadMaterial)
    road.rotation.x = -Math.PI / 2
    road.position.set(centerX, 0.006, centerZ)
    road.receiveShadow = true
    this.add(road)

    const leftBorder = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, length), borderMaterial)
    const rightBorder = leftBorder.clone()
    leftBorder.position.set(centerX - 1.92, 0.035, centerZ)
    rightBorder.position.set(centerX + 1.92, 0.035, centerZ)
    this.add(leftBorder, rightBorder)

    for (let i = 0; i < 5; i++) {
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.62), markMaterial)
      mark.rotation.x = -Math.PI / 2
      mark.position.set(centerX, 0.012, startZ + 0.85 + i * 1.0)
      this.add(mark)
    }

    for (let i = 0; i < 6; i++) {
      const postLeft = this.createRoadPost(borderMaterial)
      const postRight = this.createRoadPost(borderMaterial)
      const z = startZ + 0.55 + i * 0.95
      postLeft.position.set(centerX - 2.15, 0, z)
      postRight.position.set(centerX + 2.15, 0, z)
      this.add(postLeft, postRight)
    }
  }

  createRoadPost(material) {
    const post = new THREE.Group()
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10), material)
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), this.garlandBulbMaterials[0])
    pole.position.y = 0.21
    cap.position.y = 0.46
    post.add(pole, cap)
    return post
  }

  createFairEntrance() {
    const entrance = new THREE.Group()
    const leftOpening = new THREE.Vector3()
    const rightOpening = new THREE.Vector3()
    this.laberinto.getMundoFromCelda(0, 1, leftOpening)
    this.laberinto.getMundoFromCelda(0, 5, rightOpening)
    entrance.position.set(
      (leftOpening.x + rightOpening.x) * 0.5,
      0,
      leftOpening.z - 0.35
    )

    const red = this.createFacadeMaterial(0xb8322e, 0.16)
    const cream = this.createFacadeMaterial(0xf6e9ca, 0.16)
    const brick = this.createFacadeMaterial(0x9f3f2a, 0.16)
    const tileBlue = new THREE.MeshStandardMaterial({
      color: 0x1e78b4,
      emissive: 0x08233a,
      emissiveIntensity: 0.12,
      roughness: 0.46
    })
    const green = this.createFacadeMaterial(0x3a8b68, 0.14)
    const gold = new THREE.MeshStandardMaterial({
      color: 0xd7a13a,
      emissive: 0x7a4b07,
      emissiveIntensity: 0.18,
      roughness: 0.38,
      metalness: 0.25
    })

    const leftTower = this.createEntranceTower(cream, brick, tileBlue, green)
    const rightTower = this.createEntranceTower(cream, brick, tileBlue, green)
    leftTower.position.set(-2.05, 0, 0)
    rightTower.position.set(2.05, 0, 0)
    entrance.add(leftTower, rightTower)

    const leftPier = this.createStripedColumn(brick, cream, 2.85, 0.36)
    const rightPier = this.createStripedColumn(brick, cream, 2.85, 0.36)
    leftPier.position.set(-0.78, 1.42, 0)
    rightPier.position.set(0.78, 1.42, 0)
    entrance.add(leftPier, rightPier)

    const centralBody = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.1, 0.18), brick)
    centralBody.position.set(0, 2.65, 0.01)
    entrance.add(centralBody)

    const centralPanel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.62, 0.2), cream)
    centralPanel.position.set(0, 2.6, -0.02)
    entrance.add(centralPanel)

    const roof = this.createPyramidRoof(1.92, 0.56, tileBlue)
    roof.position.set(0, 3.45, 0)
    entrance.add(roof)

    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.58, 10), gold)
    flagPole.position.set(0, 3.98, 0)
    entrance.add(flagPole)

    const flag = this.createFlag()
    flag.position.set(0.18, 4.12, 0)
    entrance.add(flag)

    const leftBridge = this.createBridgePanel(cream, brick, green)
    const rightBridge = this.createBridgePanel(cream, brick, green)
    leftBridge.position.set(-1.42, 1.95, 0)
    rightBridge.position.set(1.42, 1.95, 0)
    entrance.add(leftBridge, rightBridge)

    const archCap = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.22, 0.22), cream)
    archCap.position.set(0, 2.16, 0)
    entrance.add(archCap)

    const sign = this.createEntranceSign()
    sign.position.set(0, 2.6, -0.135)
    sign.rotation.y = Math.PI
    entrance.add(sign)

    this.addEntranceBulbs(entrance)
    this.add(entrance)
  }

  createFlamencoCrowd() {
    const candidates = []
    const maxRow = this.laberinto.zNumBloques - 2
    const maxCol = this.laberinto.xNumBloques - 2

    for (let fila = 2; fila <= maxRow; fila++) {
      for (let columna = 2; columna <= maxCol; columna++) {
        if (this.laberinto.esMuro(fila, columna)) {
          continue
        }

        // Evitar la zona de salida para que la portada final destaque visualmente.
        if (fila >= this.laberinto.zNumBloques - 5 && columna >= 11 && columna <= 17) {
          continue
        }

        const wallSide = this.getWallSideDirection(fila, columna)
        if (!wallSide) {
          continue
        }

        if ((fila * 13 + columna * 7) % this.flamencoSpawnModulo === 0) {
          candidates.push({ fila, columna })
        }
      }
    }

    const maxSlots = Math.min(candidates.length, this.flamencoMaxFigures)
    const evenSlots = maxSlots - (maxSlots % 2)
    const slots = candidates.slice(0, evenSlots)

    slots.forEach((slot, index) => {
      const base = new THREE.Vector3()
      this.laberinto.getMundoFromCelda(slot.fila, slot.columna, base)
      const wallSide = this.getWallSideDirection(slot.fila, slot.columna)

      const figure = this.createCrowdFigure(index)
      const jitter = (((slot.fila + slot.columna * 5) % 5) - 2) * 0.016
      const sideOffset = 0.23

      let x = base.x
      let z = base.z

      if (wallSide) {
        x += wallSide.x * sideOffset
        z += wallSide.z * sideOffset

        if (Math.abs(wallSide.x) > 0) {
          z += jitter
        } else {
          x += jitter
        }
      }

      figure.position.set(x, 0, z)
      figure.rotation.y = ((slot.fila * 19 + slot.columna * 11) % 360) * (Math.PI / 180)
      figure.userData.baseY = 0
      figure.userData.baseRotationY = figure.rotation.y
      figure.userData.swingPhase = index * 0.57 + slot.fila * 0.11
      figure.userData.swingIntensity = 0.07 + (index % 5) * 0.01
      figure.userData.obstaculo = true
      figure.userData.radioObstaculo = 0.17

      this.flamencoFigures.push(figure)
      this.add(figure)
    })
  }

  getWallSideDirection(fila, columna) {
    const sides = []

    if (this.laberinto.esMuro(fila - 1, columna)) sides.push({ x: 0, z: -1 })
    if (this.laberinto.esMuro(fila + 1, columna)) sides.push({ x: 0, z: 1 })
    if (this.laberinto.esMuro(fila, columna - 1)) sides.push({ x: -1, z: 0 })
    if (this.laberinto.esMuro(fila, columna + 1)) sides.push({ x: 1, z: 0 })

    if (sides.length === 0) {
      return null
    }

    const pick = (fila * 31 + columna * 17) % sides.length
    return sides[pick]
  }

  createCrowdFigure(index) {
    // Reparto 50/50 exacto: mismo numero de mujeres de flamenca y hombres de corto.
    if (index % 2 === 0) {
      return this.createFlamencoFigure(index)
    }

    return this.createCortoFigure(index)
  }

  createFlamencoFigure(index) {
    const figure = new THREE.Group()
    const dressColor = this.flamencoDressPalette[index % this.flamencoDressPalette.length]
    const shawlColor = this.flamencoShawlPalette[index % this.flamencoShawlPalette.length]
    const dressMaterial = new THREE.MeshStandardMaterial({
      color: dressColor,
      roughness: 0.56
    })
    const shawlMaterial = new THREE.MeshStandardMaterial({
      color: shawlColor,
      roughness: 0.52
    })

    const skirt = new THREE.Mesh(this.flamencoGeometries.skirt, dressMaterial)
    skirt.position.y = 0.29
    skirt.castShadow = true
    skirt.receiveShadow = true
    figure.add(skirt)

    const ruffle = new THREE.Mesh(this.flamencoGeometries.ruffle, shawlMaterial)
    ruffle.rotation.x = Math.PI / 2
    ruffle.position.y = 0.05
    figure.add(ruffle)

    const torso = new THREE.Mesh(this.flamencoGeometries.torso, shawlMaterial)
    torso.position.y = 0.64
    torso.castShadow = true
    torso.receiveShadow = true
    figure.add(torso)

    const head = new THREE.Mesh(this.flamencoGeometries.head, this.flamencoSkinMaterial)
    head.position.y = 0.86
    head.castShadow = true
    figure.add(head)

    const bun = new THREE.Mesh(this.flamencoGeometries.bun, this.flamencoHairMaterial)
    bun.position.set(-0.03, 0.92, -0.045)
    figure.add(bun)

    const shadowCollar = new THREE.Mesh(this.flamencoGeometries.ruffle, this.flamencoFigureShadowMaterial)
    shadowCollar.rotation.x = Math.PI / 2
    shadowCollar.scale.set(0.68, 0.68, 0.68)
    shadowCollar.position.y = 0.73
    figure.add(shadowCollar)

    const leftArmGroup = new THREE.Group()
    const rightArmGroup = new THREE.Group()
    const leftArm = new THREE.Mesh(this.flamencoGeometries.arm, this.flamencoSkinMaterial)
    const rightArm = new THREE.Mesh(this.flamencoGeometries.arm, this.flamencoSkinMaterial)
    const leftSleeve = new THREE.Mesh(this.flamencoGeometries.sleeve, dressMaterial)
    const rightSleeve = new THREE.Mesh(this.flamencoGeometries.sleeve, dressMaterial)
    const leftHand = new THREE.Mesh(this.flamencoGeometries.hand, this.flamencoSkinMaterial)
    const rightHand = new THREE.Mesh(this.flamencoGeometries.hand, this.flamencoSkinMaterial)

    leftArm.position.y = -0.13
    rightArm.position.y = -0.13
    leftSleeve.position.y = -0.04
    rightSleeve.position.y = -0.04
    leftHand.position.y = -0.27
    rightHand.position.y = -0.27

    leftArmGroup.position.set(-0.13, 0.73, 0)
    rightArmGroup.position.set(0.13, 0.73, 0)
    leftArmGroup.rotation.z = 0.32
    rightArmGroup.rotation.z = -0.32

    leftArmGroup.add(leftArm, leftSleeve, leftHand)
    rightArmGroup.add(rightArm, rightSleeve, rightHand)
    figure.add(leftArmGroup, rightArmGroup)

    figure.userData.leftArm = leftArmGroup
    figure.userData.rightArm = rightArmGroup
    figure.userData.leftArmBaseRotation = 0.32
    figure.userData.rightArmBaseRotation = -0.32
    figure.userData.armSwingScale = 0.14
    figure.scale.setScalar(0.74)

    return figure
  }

  createCortoFigure(index) {
    const figure = new THREE.Group()
    const jacketMaterial = this.cortoJacketMaterials[index % this.cortoJacketMaterials.length]
    const pantMaterial = this.cortoPantMaterials[index % this.cortoPantMaterials.length]
    const sashMaterial = this.cortoSashMaterials[index % this.cortoSashMaterials.length]

    const pelvis = new THREE.Mesh(this.cortoGeometries.pelvis, pantMaterial)
    pelvis.position.y = 0.34
    pelvis.castShadow = true
    pelvis.receiveShadow = true
    figure.add(pelvis)

    const torso = new THREE.Mesh(this.cortoGeometries.torso, jacketMaterial)
    torso.position.y = 0.56
    torso.castShadow = true
    torso.receiveShadow = true
    figure.add(torso)

    const jacket = new THREE.Mesh(this.cortoGeometries.jacket, jacketMaterial)
    jacket.position.set(0, 0.6, -0.015)
    jacket.castShadow = true
    figure.add(jacket)

    const shirt = new THREE.Mesh(this.cortoGeometries.shirt, this.cortoShirtMaterial)
    shirt.position.set(0, 0.58, 0.07)
    figure.add(shirt)

    const sash = new THREE.Mesh(this.flamencoGeometries.ruffle, sashMaterial)
    sash.rotation.x = Math.PI / 2
    sash.scale.set(0.62, 0.62, 0.62)
    sash.position.y = 0.44
    figure.add(sash)

    const leftLeg = new THREE.Mesh(this.cortoGeometries.leg, pantMaterial)
    const rightLeg = new THREE.Mesh(this.cortoGeometries.leg, pantMaterial)
    leftLeg.position.set(-0.058, 0.16, 0)
    rightLeg.position.set(0.058, 0.16, 0)
    leftLeg.castShadow = true
    rightLeg.castShadow = true
    figure.add(leftLeg, rightLeg)

    const leftBoot = new THREE.Mesh(this.cortoGeometries.boot, this.cortoBootMaterial)
    const rightBoot = new THREE.Mesh(this.cortoGeometries.boot, this.cortoBootMaterial)
    leftBoot.position.set(-0.058, 0.03, 0.03)
    rightBoot.position.set(0.058, 0.03, 0.03)
    figure.add(leftBoot, rightBoot)

    const head = new THREE.Mesh(this.flamencoGeometries.head, this.flamencoSkinMaterial)
    head.position.y = 0.84
    head.castShadow = true
    figure.add(head)

    const hatBrim = new THREE.Mesh(this.cortoGeometries.hatBrim, this.cortoHatMaterial)
    hatBrim.position.y = 0.92
    figure.add(hatBrim)

    const hatCrown = new THREE.Mesh(this.cortoGeometries.hatCrown, this.cortoHatMaterial)
    hatCrown.position.y = 0.975
    figure.add(hatCrown)

    const leftArmGroup = new THREE.Group()
    const rightArmGroup = new THREE.Group()
    const leftArm = new THREE.Mesh(this.flamencoGeometries.arm, this.flamencoSkinMaterial)
    const rightArm = new THREE.Mesh(this.flamencoGeometries.arm, this.flamencoSkinMaterial)
    const leftSleeve = new THREE.Mesh(this.flamencoGeometries.sleeve, jacketMaterial)
    const rightSleeve = new THREE.Mesh(this.flamencoGeometries.sleeve, jacketMaterial)
    const leftHand = new THREE.Mesh(this.flamencoGeometries.hand, this.flamencoSkinMaterial)
    const rightHand = new THREE.Mesh(this.flamencoGeometries.hand, this.flamencoSkinMaterial)

    leftArm.position.y = -0.13
    rightArm.position.y = -0.13
    leftSleeve.position.y = -0.05
    rightSleeve.position.y = -0.05
    leftHand.position.y = -0.27
    rightHand.position.y = -0.27

    leftArmGroup.position.set(-0.14, 0.68, 0)
    rightArmGroup.position.set(0.14, 0.68, 0)
    leftArmGroup.rotation.z = 0.2
    rightArmGroup.rotation.z = -0.2
    leftArmGroup.add(leftArm, leftSleeve, leftHand)
    rightArmGroup.add(rightArm, rightSleeve, rightHand)
    figure.add(leftArmGroup, rightArmGroup)

    figure.userData.leftArm = leftArmGroup
    figure.userData.rightArm = rightArmGroup
    figure.userData.leftArmBaseRotation = 0.2
    figure.userData.rightArmBaseRotation = -0.2
    figure.userData.armSwingScale = 0.08
    figure.scale.setScalar(0.72)

    return figure
  }

  createFacadeMaterial(color, emissiveIntensity = 0.12) {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity,
      roughness: 0.76,
      side: THREE.DoubleSide
    })
  }

  createEntranceTower(cream, brick, tileBlue, green) {
    const tower = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 3.0, 0.34), cream)
    body.position.y = 1.5
    tower.add(body)

    const lowerPanel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.05, 0.36), green)
    lowerPanel.position.set(0, 0.88, -0.02)
    tower.add(lowerPanel)

    const upperPanel = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.36), brick)
    upperPanel.position.set(0, 2.08, -0.02)
    tower.add(upperPanel)

    for (let i = 0; i < 5; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.55, 0.38), brick)
      stripe.position.set(-0.28 + i * 0.14, 1.46, -0.04)
      tower.add(stripe)
    }

    const window = this.createTripleWindow(cream, brick)
    window.position.set(0, 2.5, -0.08)
    tower.add(window)

    const roof = this.createPyramidRoof(0.96, 0.58, tileBlue)
    roof.position.set(0, 3.28, 0)
    tower.add(roof)

    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 4), tileBlue)
    finial.position.set(0, 3.78, 0)
    tower.add(finial)

    return tower
  }

  createTripleWindow(cream, brick) {
    const window = new THREE.Group()

    for (let i = 0; i < 3; i++) {
      const arch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.035), brick)
      arch.position.set(-0.18 + i * 0.18, 0.08, 0)
      window.add(arch)

      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.24, 0.03), cream)
      pillar.position.set(-0.18 + i * 0.18, -0.08, 0)
      window.add(pillar)
    }

    return window
  }

  createBridgePanel(cream, brick, green) {
    const panel = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.58, 0.18), cream)
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.2), green)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.2), brick)
    trim.position.y = 0.12
    rail.position.y = -0.32
    panel.add(body, trim, rail)

    for (let i = 0; i < 4; i++) {
      const arch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.035), brick)
      arch.position.set(-0.36 + i * 0.24, -0.05, -0.03)
      panel.add(arch)
    }

    return panel
  }

  createPyramidRoof(width, height, material) {
    const geometry = new THREE.ConeGeometry(width * 0.68, height, 4)
    geometry.rotateY(Math.PI / 4)
    const roof = new THREE.Mesh(geometry, material)
    roof.scale.z = 0.78
    return roof
  }

  createFlag() {
    const canvas = document.createElement('canvas')
    canvas.width = 96
    canvas.height = 56
    const context = canvas.getContext('2d')
    context.fillStyle = '#c8232b'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#f4c542'
    context.fillRect(0, 18, canvas.width, 20)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace

    return new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.2),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
    )
  }

  createStripedColumn(red, cream, height = 2.25, width = 0.22) {
    const column = new THREE.Group()
    const stripeHeight = height / 8

    for (let i = 0; i < 8; i++) {
      const material = i % 2 === 0 ? red : cream
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(width, stripeHeight, 0.28), material)
      stripe.position.y = -height / 2 + stripeHeight / 2 + i * stripeHeight
      column.add(stripe)
    }

    return column
  }

  createEntranceSign() {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const context = canvas.getContext('2d')

    context.fillStyle = '#f8e7bd'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = '#b8322e'
    context.lineWidth = 12
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16)
    context.fillStyle = '#243b63'
    context.font = 'bold 44px Arial'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('FERIA TARASCA', canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace

    return new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 0.26),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
    )
  }

  addEntranceBulbs(entrance) {
    const positions = []

    for (let i = 0; i < 18; i++) {
      positions.push(new THREE.Vector3(-2.32 + i * (4.64 / 17), 2.22, -0.03))
    }

    for (let i = 0; i < 15; i++) {
      const angle = Math.PI - i * (Math.PI / 14)
      positions.push(new THREE.Vector3(Math.cos(angle) * 1.12, 1.4 + Math.sin(angle) * 1.12, -0.06))
    }

    for (let i = 0; i < 8; i++) {
      positions.push(new THREE.Vector3(-2.05, 0.7 + i * 0.34, -0.08))
      positions.push(new THREE.Vector3(2.05, 0.7 + i * 0.34, -0.08))
    }

    positions.forEach((position) => {
      const worldPosition = position.clone().add(entrance.position)
      this.addBulb(worldPosition, this.garlandBulbs.length)
    })
  }

  addBulb(position, index) {
    const material = this.garlandBulbMaterials[index % this.garlandBulbMaterials.length]
    const bulb = new THREE.Mesh(this.garlandBulbGeometry, material)

    bulb.position.copy(position)
    bulb.userData.phase = index * 0.41
    this.add(bulb)
    this.garlandBulbs.push(bulb)

    if (this.garlandPointLights.length < this.maxGarlandPointLights && index % this.garlandLightStep === 0) {
      const light = new THREE.PointLight(material.color, 0.5, 12.0, 0.75)
      light.position.copy(position)
      this.add(light)
      this.garlandPointLights.push(light)
    }
  }

  update(lightTime, skyProgress, bulbLightLevel = 1) {
    const nightFactor = THREE.MathUtils.smoothstep(skyProgress, 0.18, 1.0)
    const lightScale = THREE.MathUtils.clamp(bulbLightLevel, 0, 3)
    const emissiveIntensity = THREE.MathUtils.lerp(0.28, 3.35, nightFactor) * lightScale
    const lightIntensity = THREE.MathUtils.lerp(0.0, 2.6, nightFactor) * lightScale

    this.garlandBulbMaterials.forEach((material, index) => {
      const pulse = 0.88 + Math.sin(lightTime * 2.4 + index * 0.9) * 0.12
      material.emissiveIntensity = emissiveIntensity * pulse
    })

    this.garlandBulbs.forEach((bulb) => {
      const pulse = 0.96 + Math.sin(lightTime * 3.1 + bulb.userData.phase) * 0.04
      bulb.scale.setScalar(pulse)
    })

    this.garlandPointLights.forEach((light) => {
      light.intensity = lightIntensity
    })

    this.flamencoFigures.forEach((figure) => {
      const phase = figure.userData.swingPhase
      const sway = Math.sin(lightTime * 1.65 + phase)
      figure.rotation.y = figure.userData.baseRotationY + sway * figure.userData.swingIntensity
      figure.position.y = figure.userData.baseY + Math.sin(lightTime * 2.7 + phase) * 0.015

      if (figure.userData.leftArm && figure.userData.rightArm) {
        const leftBase = figure.userData.leftArmBaseRotation ?? 0.32
        const rightBase = figure.userData.rightArmBaseRotation ?? -0.32
        const armSwingScale = figure.userData.armSwingScale ?? 0.14
        figure.userData.leftArm.rotation.z = leftBase + sway * armSwingScale
        figure.userData.rightArm.rotation.z = rightBase - sway * armSwingScale
      }
    })
  }
}

export { FeriaExtras }
