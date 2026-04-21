import * as THREE from 'three';

class Rebujito extends THREE.Object3D {

    constructor() {
        super();

        this.tiempo = 0;
        this.hielos = [];

        // ==========================================
        // MATERIALES
        // ==========================================

        // CRISTAL
        this.materialCristal = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.05,
            transmission: 0.9,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        // TEXTURA PROCEDURAL DE BURBUJAS
        this.texturaBurbujas = this.crearTexturaBurbujas();

        // LÍQUIDO
        this.materialLiquido = new THREE.MeshStandardMaterial({
            color: 0xf5f2d0,
            transparent: true,
            opacity: 0.75,
            roughness: 0.6,
            metalness: 0.1,
            bumpMap: this.texturaBurbujas,
            bumpScale: 0.02,
        });

        this.materialLimon = new THREE.MeshStandardMaterial({
            color: 0xd4e01b,
            roughness: 0.6
        });

        this.materialPajita = new THREE.MeshStandardMaterial({
            color: 0x00ffaa,
            roughness: 0.3
        });

        // HIELO
        this.materialHielo = new THREE.MeshPhysicalMaterial({
            color: 0xdff7ff,
            transparent: true,
            opacity: 2,
            transmission: 0.85,
            roughness: 0.48,
            metalness: 0.0,
            ior: 1.31,
            thickness: 0.25
        });

        this.construir();
    }

    // =========================================================
    // TEXTURA DE BURBUJAS
    // =========================================================
    crearTexturaBurbujas() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#888888';
        ctx.fillRect(0, 0, 256, 256);

        for (let i = 0; i < 60; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const r = Math.random() * 2 + 1;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, '#888888');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        const textura = new THREE.CanvasTexture(canvas);
        textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
        return textura;
    }

    // =========================================================
    // COMPONENTES
    // =========================================================

    crearVaso() {
        const puntos = [];
        const radio = 0.6;
        const altura = 2.4;

        puntos.push(new THREE.Vector2(0, 0));
        puntos.push(new THREE.Vector2(radio, 0));
        puntos.push(new THREE.Vector2(radio, altura));

        const geo = new THREE.LatheGeometry(puntos, 32);
        const mesh = new THREE.Mesh(geo, this.materialCristal);
        mesh.renderOrder = 10;
        return mesh;
    }

    crearLiquido() {
        const geo = new THREE.CylinderGeometry(0.57, 0.57, 1.8, 32);
        const liquido = new THREE.Mesh(geo, this.materialLiquido);
        liquido.opacity = 0.2;
        liquido.position.y = 0.92;
        liquido.renderOrder = 1;
        return liquido;
    }

    crearLimon() {
        const shape = new THREE.Shape();
        shape.absarc(0, 0, 0.4, 0, Math.PI * 2, false);

        const geo = new THREE.ExtrudeGeometry(shape, {
            depth: 0.06,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02
        });

        const limon = new THREE.Mesh(geo, this.materialLimon);
        limon.rotation.x = Math.PI / 2;
        limon.rotation.y = 1;
        limon.position.set(0, 2.3, 0.6);
        limon.renderOrder = 5;

        return limon;
    }

    crearPajita() {
        const curva = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.1, 0),
            new THREE.Vector3(-0.1, 2.2, 0),
            new THREE.Vector3(0.1, 2.5, 0),
            new THREE.Vector3(0.5, 2.6, 0)
        ]);

        const geo = new THREE.TubeGeometry(curva, 64, 0.04, 12, false);
        const pajita = new THREE.Mesh(geo, this.materialPajita);
        pajita.position.set(0.5, 0, 0);
        pajita.renderOrder = 4;

        return pajita;
    }

    crearHielo(x, y, z, rotX = 0, rotY = 0, rotZ = 0, escala = 1) {
        const geo = new THREE.BoxGeometry(0.32, 0.52, 0.32);
        const hielo = new THREE.Mesh(geo, this.materialHielo);

        hielo.position.set(x, y, z);
        hielo.rotation.set(rotX, rotY, rotZ);
        hielo.scale.set(escala, escala, escala);
        hielo.renderOrder = 3;

        // Guardamos datos para animación suave
        hielo.userData = {
            baseX: x,
            baseY: y,
            baseZ: z,
            fase: Math.random() * Math.PI * 2,
            velRot: 0.4 + Math.random() * 0.6
        };

        return hielo;
    }

    crearHielos() {
        const grupo = new THREE.Group();

        const hielo1 = this.crearHielo(
            -0.18, 1.25, 0.12,
            0.4, 0.2, 0.1, 1.0
        );

        const hielo2 = this.crearHielo(
            0.16, 1.8, -0.10,
            0.2, 0.7, 0.3, 0.9
        );

        const hielo3 = this.crearHielo(
            0.05, 1.05, 0.20,
            0.6, 0.1, 0.5, 1.1
        );

        const hielo4 = this.crearHielo(
            -0.10, 1.60, -0.18,
            0.3, 0.5, 0.2, 0.85
        );

        this.hielos.push(hielo1, hielo2, hielo3, hielo4);
        grupo.add(hielo1, hielo2, hielo3, hielo4);

        return grupo;
    }

    construir() {
        this.add(this.crearVaso());
        this.add(this.crearLiquido());
        this.add(this.crearHielos());
        this.add(this.crearLimon());
        this.add(this.crearPajita());
    }

    // =========================================================
    // ANIMACIÓN
    // =========================================================

    setRotacionActiva(valor) {
        this.rotacionActiva = valor;
    }

    setNivelLiquido(valor) {
        this.nivelLiquido = valor;

        if (this.mallaLiquido) {
            this.mallaLiquido.scale.y = valor;
            this.mallaLiquido.position.y = -0.5 + valor * 0.5;
        }
    }

    setOpacidadLiquido(valor) {
        this.opacidadLiquido = valor;

        if (this.materialLiquido) {
            this.materialLiquido.opacity = valor;
            this.materialLiquido.needsUpdate = true;
        }
    }

    update(delta) {
        this.tiempo += delta;

        // Burbujas subiendo
        if (this.texturaBurbujas) {
            this.texturaBurbujas.offset.y -= delta * 0.15;
        }

        // Pequeño movimiento de flotación y giro de los hielos
        for (let i = 0; i < this.hielos.length; i++) {
            const hielo = this.hielos[i];
            const datos = hielo.userData;

            hielo.position.y = datos.baseY + Math.sin(this.tiempo * 1.4 + datos.fase) * 0.03;
            hielo.position.x = datos.baseX + Math.cos(this.tiempo * 0.9 + datos.fase) * 0.015;
            hielo.position.z = datos.baseZ + Math.sin(this.tiempo * 1.1 + datos.fase) * 0.015;

            hielo.rotation.x += delta * datos.velRot * 0.25;
            hielo.rotation.y += delta * datos.velRot * 0.20;
        }
    }
}

export { Rebujito };