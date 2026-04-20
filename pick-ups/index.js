import * as THREE from 'three';
import { OrbitControls } from '../libs/OrbitControls.js';
import { GUI } from '../libs/dat.gui.module.js';

import { Abanico } from './Abanico.js';
import { Farolillo } from './Farolillo.js';
// import { Castanuelas } from './Castanuelas.js';
// import { Rebujito } from './Rebujito.js';

let renderer, scene, camera, controls;
let objetoActual = null;
let clock;
let gui;

const effectController = {
    girar: true,
    luz: true
};

init();
animate();

function init() {
    crearRenderer();
    crearEscena();
    crearCamara();
    crearControles();
    crearLuces();
    crearSuelo();
    crearGUI();

    clock = new THREE.Clock();

    cambiarObjeto('abanico');

    const selector = document.getElementById('selector');
    if (selector) {
        selector.addEventListener('change', (event) => {
            cambiarObjeto(event.target.value);
        });
    }

    window.addEventListener('resize', onWindowResize);
}

function crearRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(renderer.domElement);
}

function crearEscena() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);
}

function crearCamara() {
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );

    camera.position.set(3.5, 2.5, 5.5);
}

function crearControles() {
    controls = new OrbitControls(camera, renderer.domElement);

    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true;

    controls.minDistance = 2;
    controls.maxDistance = 20;

    controls.update();
}

function crearLuces() {
    const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(luzAmbiente);

    const luzDireccional = new THREE.DirectionalLight(0xffffff, 1.1);
    luzDireccional.position.set(5, 10, 6);
    luzDireccional.castShadow = true;
    scene.add(luzDireccional);

    const luzRelleno = new THREE.DirectionalLight(0xffffff, 0.35);
    luzRelleno.position.set(-4, 3, -3);
    scene.add(luzRelleno);
}

function crearSuelo() {
    const suelo = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({
            color: 0xe9e9e9,
            roughness: 0.95,
            metalness: 0.0
        })
    );

    suelo.rotation.x = -Math.PI / 2;
    suelo.position.y = -1.1;
    suelo.receiveShadow = true;
    scene.add(suelo);
}

function crearGUI() {
    gui = new GUI();

    gui.add(effectController, 'girar')
        .name('Girar')
        .onChange((valor) => {
            if (objetoActual && typeof objetoActual.setRotacionActiva === 'function') {
                objetoActual.setRotacionActiva(valor);
            }
        });

    gui.add(effectController, 'luz')
        .name('Encender luz')
        .onChange((valor) => {
            if (objetoActual && typeof objetoActual.setLuzActiva === 'function') {
                objetoActual.setLuzActiva(valor);
            }
        });
}

function limpiarObjetoActual() {
    if (objetoActual) {
        scene.remove(objetoActual);
        objetoActual = null;
    }
}

function activarSombras(objeto) {
    objeto.traverse((nodo) => {
        if (nodo.isMesh) {
            nodo.castShadow = true;
            nodo.receiveShadow = true;
        }
    });
}

function cambiarObjeto(tipo) {
    limpiarObjetoActual();

    switch (tipo) {
        case 'abanico':
            objetoActual = new Abanico();
            objetoActual.position.set(0, 0.2, 0);
            break;

        case 'farolillo':
            objetoActual = new Farolillo();
            objetoActual.position.set(0, 0, 0);
            break;

        default:
            objetoActual = new Abanico();
            objetoActual.position.set(0, 0.2, 0);
            break;
    }

    activarSombras(objetoActual);

    if (typeof objetoActual.setRotacionActiva === 'function') {
        objetoActual.setRotacionActiva(effectController.girar);
    }

    if (typeof objetoActual.setLuzActiva === 'function') {
        objetoActual.setLuzActiva(effectController.luz);
    }

    scene.add(objetoActual);
    controls.target.copy(objetoActual.position);
    controls.target.y += 1.0;
    controls.update();
}

function update() {
    const delta = clock.getDelta();

    if (controls) controls.update();

    if (objetoActual && typeof objetoActual.update === 'function') {
        objetoActual.update(delta);
    } else if (objetoActual && effectController.girar) {
        objetoActual.rotation.y += 0.01;
    }
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}