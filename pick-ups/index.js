import * as THREE from 'three';
import { OrbitControls } from '../libs/OrbitControls.js';
import { GUI } from '../libs/dat.gui.module.js';

import { Abanico } from './Abanico.js';
import { Farolillo } from './Farolillo.js';
import { Castanuelas } from './Castanuelas.js';
import { Rebujito } from './Rebujito.js';

let renderer, scene, camera, controls;
let objetoActual = null;
let clock;
let gui;
let carpetaGeneral = null;
let carpetaObjeto = null;

const effectController = {
    objeto: 'abanico',
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

    cambiarObjeto(effectController.objeto);

    const selector = document.getElementById('selector');
    if (selector) {
        selector.value = effectController.objeto;
        selector.addEventListener('change', (event) => {
            effectController.objeto = event.target.value;
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
    gui = new GUI({ width: 320 });
    gui.domElement.style.zIndex = '20';

    carpetaGeneral = gui.addFolder('Controles generales');
    carpetaGeneral.add(effectController, 'girar')
        .name('Activar giro')
        .onChange((valor) => {
            if (objetoActual && typeof objetoActual.setRotacionActiva === 'function') {
                objetoActual.setRotacionActiva(valor);
            }
        });

    carpetaGeneral.add(effectController, 'luz')
        .name('Activar luz')
        .onChange((valor) => {
            if (objetoActual && typeof objetoActual.setLuzActiva === 'function') {
                objetoActual.setLuzActiva(valor);
            }
        });

    carpetaGeneral.open();
}

function reconstruirPanelObjeto() {
    if (carpetaObjeto) {
        gui.removeFolder?.(carpetaObjeto);
    }

    // Compatibilidad con versiones donde removeFolder no existe
    if (carpetaObjeto && carpetaObjeto.domElement && carpetaObjeto.domElement.parentNode) {
        carpetaObjeto.domElement.parentNode.removeChild(carpetaObjeto.domElement);
        gui.onResize();
    }

    carpetaObjeto = gui.addFolder(`Panel de ${effectController.objeto}`);
    const ctrl = objetoActual;

    // -------------------------------------------------
    // CONTROLES ESPECÍFICOS SEGÚN MÉTODOS DISPONIBLES
    // -------------------------------------------------

    // Velocidad de giro genérica
    if ('velocidadRotacion' in ctrl) {
        carpetaObjeto.add(ctrl, 'velocidadRotacion', 0, 0.2, 0.005).name('Vel. giro');
    }

    // Abanico: apertura / animación
    if ('anguloApertura' in ctrl) {
        carpetaObjeto.add(ctrl, 'anguloApertura', 0, Math.PI / 2, 0.01).name('Apertura');
    }
    if ('aperturaMaxima' in ctrl) {
        carpetaObjeto.add(ctrl, 'aperturaMaxima', 0, Math.PI / 2, 0.01).name('Apertura máx.');
    }
    if ('animacionActiva' in ctrl) {
        carpetaObjeto.add(ctrl, 'animacionActiva').name('Animación');
    }

    // Farolillo: luz / pliegues / amplitud
    if ('rotacionActiva' in ctrl) {
        carpetaObjeto.add(ctrl, 'rotacionActiva').name('Rotación propia');
    }
    if ('luzActiva' in ctrl) {
        carpetaObjeto.add(ctrl, 'luzActiva').name('Luz propia');
    }
    if ('pliegues' in ctrl) {
        carpetaObjeto.add(ctrl, 'pliegues', 6, 40, 1).name('Pliegues');
    }
    if ('amplitudPliegue' in ctrl) {
        carpetaObjeto.add(ctrl, 'amplitudPliegue', 0, 0.2, 0.005).name('Amplitud');
    }

    // Castañuelas: repique / apertura
    if ('velocidadRepique' in ctrl) {
        carpetaObjeto.add(ctrl, 'velocidadRepique', 0, 20, 0.1).name('Vel. repique');
    }
    if ('aperturaMax' in ctrl) {
        carpetaObjeto.add(ctrl, 'aperturaMax', 0, Math.PI / 4, 0.01).name('Apertura máx.');
    }

    // Rebujito: burbujas / nivel / transparencia
    if ('nivelLiquido' in ctrl) {
        carpetaObjeto.add(ctrl, 'nivelLiquido', 0.1, 1.0, 0.01).name('Nivel líquido');
    }
    if ('velocidadBurbujas' in ctrl) {
        carpetaObjeto.add(ctrl, 'velocidadBurbujas', 0, 5, 0.05).name('Vel. burbujas');
    }
    if ('opacidadLiquido' in ctrl) {
        carpetaObjeto.add(ctrl, 'opacidadLiquido', 0.1, 1.0, 0.01).name('Opacidad');
    }

    // Métodos tipo acción
    if (typeof ctrl.reset === 'function') {
        carpetaObjeto.add({ reset: () => ctrl.reset() }, 'reset').name('Reset');
    }

    carpetaObjeto.open();
}

function limpiarObjetoActual() {
    if (objetoActual) {
        scene.remove(objetoActual);
        objetoActual.traverse((nodo) => {
            if (nodo.isMesh) {
                nodo.geometry?.dispose?.();

                if (Array.isArray(nodo.material)) {
                    nodo.material.forEach(m => m?.dispose?.());
                } else {
                    nodo.material?.dispose?.();
                }
            }
        });
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

        case 'castanuelas':
            objetoActual = new Castanuelas();
            objetoActual.position.set(0, 0.2, 0);
            break;

        case 'rebujito':
            objetoActual = new Rebujito();
            objetoActual.position.set(0, 0.2, 0);
            break;

        default:
            objetoActual = new Abanico();
            objetoActual.position.set(0, 0.2, 0);
            break;
    }

    activarSombras(objetoActual);

    // Sincronizar panel general con los setters del objeto
    if (typeof objetoActual.setRotacionActiva === 'function') {
        objetoActual.setRotacionActiva(effectController.girar);
    } else if ('rotacionActiva' in objetoActual) {
        objetoActual.rotacionActiva = effectController.girar;
    }

    if (typeof objetoActual.setLuzActiva === 'function') {
        objetoActual.setLuzActiva(effectController.luz);
    } else if ('luzActiva' in objetoActual) {
        objetoActual.luzActiva = effectController.luz;
    }

    scene.add(objetoActual);

    controls.target.copy(objetoActual.position);
    controls.target.y += 1.0;
    controls.update();

    reconstruirPanelObjeto();
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