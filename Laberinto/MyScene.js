import * as THREE from 'three'
import { GUI } from 'gui'
import { TrackballControls } from 'trackball'

import { Laberinto } from './Laberinto.js'

class MyScene extends THREE.Scene {

  constructor(myCanvas) {
    super()

    this.renderer = this.createRenderer(myCanvas)
    this.gui = this.createGUI()

    this.createLights()
    this.createCamera()
    this.createGround()

    this.axis = new THREE.AxesHelper(2)
    this.add(this.axis)

    this.model = new Laberinto()
    this.add(this.model)
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )

    this.camera.position.set(8, 8, 8)
    const look = new THREE.Vector3(0, 0, 0)
    this.camera.lookAt(look)
    this.add(this.camera)

    this.cameraControl = new TrackballControls(this.camera, this.renderer.domElement)
    this.cameraControl.rotateSpeed = 5
    this.cameraControl.zoomSpeed = -2
    this.cameraControl.panSpeed = 0.5
    this.cameraControl.target = look
  }

  createGround() {
    const geometryGround = new THREE.BoxGeometry(20, 0.2, 20)
    const materialGround = new THREE.MeshStandardMaterial({ color: 0x888888 })

    const ground = new THREE.Mesh(geometryGround, materialGround)
    ground.position.y = -0.1

    this.add(ground)
  }

  createGUI() {
    const gui = new GUI()

    this.guiControls = {
      lightPower: 50.0,
      ambientIntensity: 0.5,
      axisOnOff: true
    }

    const folder = gui.addFolder('Luz y Ejes')

    folder.add(this.guiControls, 'lightPower', 0, 1000, 20)
      .name('Luz puntual : ')
      .onChange((value) => this.setLightPower(value))

    folder.add(this.guiControls, 'ambientIntensity', 0, 1, 0.05)
      .name('Luz ambiental: ')
      .onChange((value) => this.setAmbientIntensity(value))

    folder.add(this.guiControls, 'axisOnOff')
      .name('Mostrar ejes : ')
      .onChange((value) => this.setAxisVisible(value))

    return gui
  }

  createLights() {
    this.ambientLight = new THREE.AmbientLight('white', this.guiControls.ambientIntensity)
    this.add(this.ambientLight)

    this.pointLight = new THREE.SpotLight(0xffffff)
    this.pointLight.power = this.guiControls.lightPower
    this.pointLight.position.set(5, 10, 5)
    this.add(this.pointLight)
  }

  setLightPower(valor) {
    this.pointLight.power = valor
  }

  setAmbientIntensity(valor) {
    this.ambientLight.intensity = valor
  }

  setAxisVisible(valor) {
    this.axis.visible = valor
  }

  createRenderer(myCanvas) {
    const renderer = new THREE.WebGLRenderer()
    renderer.setClearColor(new THREE.Color(0xEEEEEE), 1.0)
    renderer.setSize(window.innerWidth, window.innerHeight)
    $(myCanvas).append(renderer.domElement)
    return renderer
  }

  getCamera() {
    return this.camera
  }

  setCameraAspect(ratio) {
    this.camera.aspect = ratio
    this.camera.updateProjectionMatrix()
  }

  onWindowResize() {
    this.setCameraAspect(window.innerWidth / window.innerHeight)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  update() {
    this.renderer.render(this, this.getCamera())
    this.cameraControl.update()
    requestAnimationFrame(() => this.update())
  }
}

$(function () {
  const scene = new MyScene("#WebGL-output")
  window.addEventListener("resize", () => scene.onWindowResize())
  scene.update()
})