import * as THREE from 'three';

class Abanico extends THREE.Object3D {

    constructor() {
        super();

        // =========================================================
        // PARÁMETROS GENERALES
        // =========================================================
        this.numModulos = 11;                 // módulos con varilla+tela
        this.numVarillas = this.numModulos + 1; // última varilla sin tela

        this.anguloMin = THREE.MathUtils.degToRad(10);
        this.anguloMax = THREE.MathUtils.degToRad(170);
        this.anguloActual = THREE.MathUtils.degToRad(120);

        this.radioTelaInterior = 0.95;
        this.radioTelaExterior = 3.50;

        this.grosorVarilla = 0.045;
        this.grosorTela = 0.012;

        this.tiempo = 0;

        // =========================================================
        // ESTRUCTURA
        // =========================================================
        this.grupoOscilacion = new THREE.Object3D();
        this.add(this.grupoOscilacion);

        this.grupoAbanico = new THREE.Object3D();
        this.grupoOscilacion.add(this.grupoAbanico);

        this.modulos = [];
        this.varillaFinal = null;

        // =========================================================
        // MATERIALES
        // =========================================================
        this.materialVarilla = new THREE.MeshStandardMaterial({
            color: 0x4a2616,
            roughness: 0.82,
            metalness: 0.08
        });

        this.materialTela = new THREE.MeshStandardMaterial({
            color: 0xb8ae92,
            roughness: 0.96,
            metalness: 0.02,
            side: THREE.DoubleSide
        });

        this.materialBase = new THREE.MeshStandardMaterial({
            color: 0x5a2e1a,
            roughness: 0.78,
            metalness: 0.10
        });

        this.materialRemache = new THREE.MeshStandardMaterial({
            color: 0x7b5a3a,
            roughness: 0.65,
            metalness: 0.20
        });

        this.construirAbanico();
    }

    // =========================================================
    // VARILLA MEDIANTE EXTRUSIÓN
    // Se modela en local con pivote en el origen
    // y creciendo hacia +Y
    // =========================================================
    crearGeometriaVarilla() {
        const shape = new THREE.Shape();

        shape.moveTo(-0.07, 0.0);
        shape.quadraticCurveTo(-0.16, 0.08, -0.11, 0.27);
        shape.lineTo(-0.045, 3.25);
        shape.quadraticCurveTo(0.0, 3.50, 0.045, 3.25);
        shape.lineTo(0.11, 0.27);
        shape.quadraticCurveTo(0.16, 0.08, 0.07, 0.0);

        const geo = new THREE.ExtrudeGeometry(shape, {
            depth: this.grosorVarilla,
            bevelEnabled: false,
            curveSegments: 24
        });

        // Centramos el grosor en Z pero mantenemos la base en Y=0
        geo.translate(0, 0, -this.grosorVarilla * 0.5);

        return geo;
    }

    // =========================================================
    // TELA LOCAL DEL MÓDULO
    // Se genera en el MISMO plano XY que la varilla.
    // El módulo representa la varilla izquierda del sector y su
    // paño hasta la siguiente varilla.
    // =========================================================
    crearGeometriaPanoLocal(anguloSegmento, subdiv = 16) {
        const vertices = [];
        const indices = [];
        const uvs = [];

        // La tela queda ligeramente detrás de la varilla
        const zFront = -0.004;
        const zBack = zFront - this.grosorTela;

        for (let i = 0; i <= subdiv; i++) {
            const t = i / subdiv;
            const ang = t * anguloSegmento;

            const xi = this.radioTelaInterior * Math.sin(ang);
            const yi = this.radioTelaInterior * Math.cos(ang);

            const xe = this.radioTelaExterior * Math.sin(ang);
            const ye = this.radioTelaExterior * Math.cos(ang);

            // cara frontal
            vertices.push(xi, yi, zFront);
            vertices.push(xe, ye, zFront);
            uvs.push(t, 0);
            uvs.push(t, 1);

            // cara trasera
            vertices.push(xi, yi, zBack);
            vertices.push(xe, ye, zBack);
            uvs.push(t, 0);
            uvs.push(t, 1);
        }

        for (let i = 0; i < subdiv; i++) {
            const k = i * 4;

            // frontal
            indices.push(k, k + 1, k + 4);
            indices.push(k + 1, k + 5, k + 4);

            // trasera
            indices.push(k + 2, k + 6, k + 3);
            indices.push(k + 3, k + 6, k + 7);

            // borde interior
            indices.push(k, k + 4, k + 2);
            indices.push(k + 2, k + 4, k + 6);

            // borde exterior
            indices.push(k + 1, k + 3, k + 5);
            indices.push(k + 3, k + 7, k + 5);
        }

        // lateral inicial
        indices.push(0, 2, 1);
        indices.push(1, 2, 3);

        // lateral final
        const f = subdiv * 4;
        indices.push(f, f + 1, f + 2);
        indices.push(f + 1, f + 3, f + 2);

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        return geo;
    }

    // =========================================================
    // MÓDULO = VARILLA + TELA PEGADA
    // Ambos en local. Luego se rota el módulo entero.
    // =========================================================
    crearModulo(anguloSegmento) {
        const modulo = new THREE.Object3D();

        const varilla = new THREE.Mesh(
            this.crearGeometriaVarilla(),
            this.materialVarilla
        );
        modulo.add(varilla);

        const pano = new THREE.Mesh(
            this.crearGeometriaPanoLocal(anguloSegmento),
            this.materialTela
        );
        modulo.add(pano);

        modulo.userData.varilla = varilla;
        modulo.userData.pano = pano;

        return modulo;
    }

    // =========================================================
    // BASE DEL ABANICO
    // =========================================================
    crearRemache() {
        const geo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 20);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x7a5b3a,
            roughness: 0.7,
            metalness: 0.2
        });

        const remache = new THREE.Mesh(geo, mat);
        remache.rotation.z = Math.PI / 2;
        return remache;
    }


    // =========================================================
    // CONSTRUCCIÓN
    // =========================================================
    construirAbanico() {
        const pasoInicial = this.anguloActual / (this.numVarillas - 1);

        for (let i = 0; i < this.numModulos; i++) {
            const modulo = this.crearModulo(pasoInicial);
            this.modulos.push(modulo);
            this.grupoAbanico.add(modulo);
        }

        this.varillaFinal = new THREE.Object3D();
        const meshFinal = new THREE.Mesh(
            this.crearGeometriaVarilla(),
            this.materialVarilla
        );
        this.varillaFinal.add(meshFinal);
        this.grupoAbanico.add(this.varillaFinal);

        this.base = this.crearRemache();
        this.grupoAbanico.add(this.base);

        this.actualizarGeometria();
    }

    // =========================================================
    // ACTUALIZACIÓN
    // Cada módulo se rota a su ángulo.
    // La tela SIEMPRE se genera en local de 0 a paso.
    // =========================================================
    actualizarGeometria() {
        const anguloTotal = this.anguloActual;
        const anguloInicial = -anguloTotal / 2;
        const paso = anguloTotal / (this.numVarillas - 1);

        for (let i = 0; i < this.numModulos; i++) {
            const ang0 = anguloInicial + i * paso;
            const modulo = this.modulos[i];

            modulo.rotation.z = ang0;

            modulo.userData.pano.geometry.dispose();
            modulo.userData.pano.geometry = this.crearGeometriaPanoLocal(paso, 16);
        }

        const angFinal = anguloInicial + (this.numVarillas - 1) * paso;
        this.varillaFinal.rotation.z = angFinal;
    }

    // =========================================================
    // ANIMACIÓN
    // =========================================================
    update(delta) {
        this.tiempo += delta;

        const t = 0.5 + 0.5 * Math.sin(this.tiempo * 1.8);
        this.anguloActual = this.anguloMin + t * (this.anguloMax - this.anguloMin);

        this.actualizarGeometria();

        this.grupoOscilacion.rotation.y = 0.14 * Math.sin(this.tiempo * 1.8);
    }
}

export { Abanico };