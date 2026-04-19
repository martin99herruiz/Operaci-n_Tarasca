import * as THREE from 'three';

import { Abanico } from './Abanico.js';
import { Farolillo } from './Farolillo.js';
//import { Castanuelas } from './Castanuelas.js';
//import { Rebujito } from './Rebujito.js';

let renderer, scene, camera;
let objetoActual = null;
let clock;

function init() {
    crearRenderer();
    crearEscena();
    crearCamara();
    crearLuces();

    clock = new THREE.Clock();

    // Cargar objeto inicial
    cambiarObjeto('abanico');

    // Evento del selector
    const selector = document.getElementById('selector');
    selector.addEventListener('change', (event) => {
        cambiarObjeto(event.target.value);
    });

    window.addEventListener('resize', onWindowResize);
}

function crearRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
}

function crearEscena() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2f2f2);

    // Suelo opcional para dar referencia visual
    const suelo = new THREE.Mesh(
        new THREE.CircleGeometry(6, 64),
        new THREE.MeshStandardMaterial({
            color: 0xd9d9d9,
            roughness: 0.9,
            metalness: 0.0
        })
    );
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.y = -0.01;
    scene.add(suelo);
}

function crearCamara() {
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );

    camera.position.set(0, 2.2, 6);
    camera.lookAt(0, 1.2, 0);
}

function crearLuces() {
    const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(luzAmbiente);

    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.9);
    luzDireccional.position.set(5, 8, 6);
    scene.add(luzDireccional);

    const luzRelleno = new THREE.DirectionalLight(0xffffff, 0.35);
    luzRelleno.position.set(-4, 3, -3);
    scene.add(luzRelleno);
}

function limpiarObjetoActual() {
    if (objetoActual !== null) {
        scene.remove(objetoActual);
        objetoActual = null;
    }
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
            objetoActual.position.set(0, 1.5, 0);
            break;

        case 'castanuelas':
            objetoActual = new Castanuelas();
            objetoActual.position.set(0, 1.2, 0);
            break;

        case 'rebujito':
            objetoActual = new Rebujito();
            objetoActual.position.set(0, 0.8, 0);
            break;

        default:
            objetoActual = new Abanico();
            objetoActual.position.set(0, 0.2, 0);
            break;
    }

    scene.add(objetoActual);
}

function update() {
    const delta = clock.getDelta();

    if (objetoActual && typeof objetoActual.update === 'function') {
        objetoActual.update(delta);
    } else if (objetoActual) {
        // Rotación suave si el objeto no tiene animación propia
        objetoActual.rotation.y += 0.01;
    }
}

function render() {
    renderer.render(scene, camera);
}

function animate() {
    requestAnimationFrame(animate);
    update();
    render();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
animate();