import * as THREE from 'three';
import { OrbitControls } from '../libs/OrbitControls.js';
import { Farolillo } from './Farolillo.js';

let renderer, scene, camera, controls;
let farolillo;

init();
animate();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2f2f2);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(3, 2, 4);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.2, 0);
  controls.update();

  const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(luzAmbiente);

  const luzDir = new THREE.DirectionalLight(0xffffff, 1.1);
  luzDir.position.set(5, 8, 4);
  luzDir.castShadow = true;
  scene.add(luzDir);

  const suelo = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0xe5e5e5 })
  );
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -1.3;
  suelo.receiveShadow = true;
  scene.add(suelo);

  farolillo = new Farolillo();
  scene.add(farolillo);

  window.addEventListener('resize', onResize);
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