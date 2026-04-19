import * as THREE from 'three'

class Laberinto extends THREE.Object3D {

  constructor() {
    super()

    this.createWalls()
  }

  createWalls() {

    const material = new THREE.MeshStandardMaterial({ color: 0x3333aa })

    // Muro simple de prueba
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(10, 3, 0.5),
      material
    )

    wall.position.set(0, 1.5, -5)

    this.add(wall)

    // Otro muro
    const wall2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 3, 10),
      material
    )

    wall2.position.set(-5, 1.5, 0)

    this.add(wall2)
  }
}

export { Laberinto }
