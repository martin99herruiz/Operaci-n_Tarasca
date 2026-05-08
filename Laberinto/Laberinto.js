import * as THREE from 'three'

class Laberinto extends THREE.Object3D {

  static WALL = 'X'
  static FREE = ' '

  constructor(archivo, sincronizacion = null) {
    super()

    this.anchoBloque = 1.0
    this.altoBloque = 2.6
    this.matriz = []
    this.xNumBloques = 0
    this.zNumBloques = 0

    this.bloqueGeo = new THREE.BoxGeometry(
      this.anchoBloque,
      this.altoBloque,
      this.anchoBloque
    )
    this.bloqueGeo.translate(0, this.altoBloque / 2, 0)

    this.bloqueMat = new THREE.MeshStandardMaterial({
      color: 0x7b4a2a,
      roughness: 0.8,
      metalness: 0.05
    })

    const loader = new THREE.FileLoader()
    loader.load(archivo, (file) => {
      this.cargarDesdeTexto(file)

      if (sincronizacion) {
        sincronizacion.resolve()
      }
    })
  }

  cargarDesdeTexto(texto) {
    const lineas = texto
      .replace(/\r/g, '')
      .split('\n')
      .filter((linea, indice, array) => linea.length > 0 || indice < array.length - 1)

    this.zNumBloques = lineas.length
    this.xNumBloques = Math.max(...lineas.map((linea) => linea.length))
    this.matriz = lineas.map((linea) => linea.padEnd(this.xNumBloques, Laberinto.FREE))

    this.crearMuros()
    this.centrarEnOrigen()
  }

  crearMuros() {
    for (let fila = 0; fila < this.zNumBloques; fila++) {
      for (let columna = 0; columna < this.xNumBloques; columna++) {
        if (this.matriz[fila][columna] === Laberinto.WALL) {
          const bloque = new THREE.Mesh(this.bloqueGeo, this.bloqueMat)
          bloque.position.set(
            columna * this.anchoBloque,
            0,
            fila * this.anchoBloque
          )
          bloque.castShadow = true
          bloque.receiveShadow = true
          this.add(bloque)
        }
      }
    }
  }

  centrarEnOrigen() {
    const desfaseX = ((this.xNumBloques - 1) / 2) * this.anchoBloque
    const desfaseZ = ((this.zNumBloques - 1) / 2) * this.anchoBloque

    this.position.x = -desfaseX
    this.position.z = -desfaseZ
  }

  getMundoFromCelda(fila, columna, salida) {
    salida.x = columna * this.anchoBloque + this.position.x
    salida.z = fila * this.anchoBloque + this.position.z
    return salida
  }

  getCeldaFromMundo(posicion) {
    return {
      fila: Math.round((posicion.z - this.position.z) / this.anchoBloque),
      columna: Math.round((posicion.x - this.position.x) / this.anchoBloque)
    }
  }

  esMuro(fila, columna) {
    if (
      fila < 0 ||
      columna < 0 ||
      fila >= this.zNumBloques ||
      columna >= this.xNumBloques
    ) {
      return true
    }

    return this.matriz[fila][columna] === Laberinto.WALL
  }

  puedeMoverseA(posicion, radio = 0.25) {
    const puntos = [
      new THREE.Vector3(posicion.x - radio, posicion.y, posicion.z - radio),
      new THREE.Vector3(posicion.x + radio, posicion.y, posicion.z - radio),
      new THREE.Vector3(posicion.x - radio, posicion.y, posicion.z + radio),
      new THREE.Vector3(posicion.x + radio, posicion.y, posicion.z + radio)
    ]

    return puntos.every((punto) => {
      const celda = this.getCeldaFromMundo(punto)
      return !this.esMuro(celda.fila, celda.columna)
    })
  }

  update() {
  }
}

export { Laberinto }
