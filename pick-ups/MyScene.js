import * as THREE from 'three';
import { OrbitControls } from '../libs/OrbitControls.js';
import { GUI } from '../libs/dat.gui.module.js';
import { Farolillo } from './Farolillo.js';

let renderer, scene, camera, controls;
let farolillo;
let gui;

// Objeto de control para la interfaz
const effectController = {
  girar: true
};

init();
animate();

function init() {
  // =========================================================
  // Renderizador
  // =========================================================
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // =========================================================
  // Escena
  // =========================================================
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f4f4);

  // =========================================================
  // Cámara
  // =========================================================
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(3.2, 2.0, 4.0);

  // =========================================================
  // Control orbital de cámara
  // =========================================================
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  // =========================================================
  // Suelo
  // =========================================================
  const suelo = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshBasicMaterial({ color: 0xe9e9e9 })
  );
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -1.10;
  scene.add(suelo);

  // =========================================================
  // Modelo del farolillo
  // =========================================================
  farolillo = new Farolillo();
  scene.add(farolillo);

  // =========================================================
  // Interfaz gráfica con checkboxes
  // =========================================================
  createGUI();

  window.addEventListener('resize', onResize);
}

function createGUI() {
  gui = new GUI();

  // Checkbox para activar o desactivar el giro
  gui.add(effectController, 'girar')
    .name('Girar')
    .onChange((valor) => {
      farolillo.setRotacionActiva(valor);
    });

}

function animate(time) {
  requestAnimationFrame(animate);

  farolillo.update(time);

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
