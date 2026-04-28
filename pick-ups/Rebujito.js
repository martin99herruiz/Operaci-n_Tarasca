import * as THREE from 'three';

/**
 * Clase Rebujito
 * Representa un sistema de bebida compuesto por múltiples materiales con propiedades
 * ópticas complejas (transmisión, IOR) y elementos animados proceduralmente.
 */
class Rebujito extends THREE.Object3D {

    constructor() {
        super();

        this.tiempo = 0;
        this.hielos = [];

        // ==========================================
        // CONFIGURACIÓN DE MATERIALES (Físicamente realistas)
        // ==========================================

        // Cristal: Utiliza MeshPhysicalMaterial para simular transmisión de luz.
        // Se desactiva depthWrite para evitar artefactos visuales con transparencias internas.
        this.materialCristal = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.05,
            transmission: 0.9,     // Permite el paso de luz a través del objeto.
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false      // Crítico para el correcto renderizado de capas transparentes.
        });

        // Textura Procedural: Generada en Canvas para simular efervescencia.
        this.texturaBurbujas = this.crearTexturaBurbujas();

        // Líquido: Color amarillento pálido con mapa de rugosidad (Bump) dinámico.
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

        // Hielo: Material físico con Índice de Refracción (IOR) específico.
        this.materialHielo = new THREE.MeshPhysicalMaterial({
            color: 0xdff7ff,
            transparent: true,
            opacity: 2,
            transmission: 0.85,
            roughness: 0.48,
            metalness: 0.0,
            ior: 1.31,            // Índice de refracción del agua sólida.
            thickness: 0.25       // Grosor para el cálculo de absorción de luz.
        });

        this.construir();
    }

    /**
     * Técnica: Generación de textura de ruido mediante Canvas.
     * Crea círculos con gradientes radiales que actúan como mapa de normales/bump.
     */
    crearTexturaBurbujas() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#888888'; // Gris neutro para el Bump Map.
        ctx.fillRect(0, 0, 256, 256);

        for (let i = 0; i < 60; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const r = Math.random() * 2 + 1;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, '#ffffff'); // Elevación máxima.
            grad.addColorStop(1, '#888888'); // Base plana.

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
    // CONSTRUCCIÓN DE GEOMETRÍA
    // =========================================================

    /**
     * Vaso: Generado mediante LatheGeometry (revolución) a partir
     * de un perfil 2D que define suelo y paredes.
     */
    crearVaso() {
        const puntos = [];
        const radio = 0.6;
        const altura = 2.4;

        puntos.push(new THREE.Vector2(0, 0));       // Centro base.
        puntos.push(new THREE.Vector2(radio, 0));   // Borde base.
        puntos.push(new THREE.Vector2(radio, altura)); // Borde superior.

        const geo = new THREE.LatheGeometry(puntos, 32);
        const mesh = new THREE.Mesh(geo, this.materialCristal);
        // renderOrder alto para asegurar que el cristal se dibuje tras el líquido.
        mesh.renderOrder = 10; 
        return mesh;
    }

    crearLiquido() {
        const geo = new THREE.CylinderGeometry(0.57, 0.57, 1.8, 32);
        const liquido = new THREE.Mesh(geo, this.materialLiquido);
        liquido.position.y = 0.92;
        liquido.renderOrder = 1;
        return liquido;
    }

    /**
     * Limón: Modelado mediante Shape y ExtrudeGeometry.
     * Representa una rodaja con biselado (bevel) para suavizar bordes.
     */
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
        limon.rotation.z = Math.PI / 2;
        limon.rotation.y = Math.PI / 2;
        limon.position.set(0, 2.3, 0.6);
        limon.renderOrder = 5;
        return limon;
    }

    /**
     * Pajita: Generada mediante TubeGeometry siguiendo una curva de Catmull-Rom.
     */
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

    /**
     * Hielo: Cubos parametrizados con datos de fase para animación sinusoidal.
     */
    crearHielo(x, y, z, rotX = 0, rotY = 0, rotZ = 0, escala = 1) {
        const geo = new THREE.BoxGeometry(0.32, 0.52, 0.32);
        const hielo = new THREE.Mesh(geo, this.materialHielo);

        hielo.position.set(x, y, z);
        hielo.rotation.set(rotX, rotY, rotZ);
        hielo.scale.set(escala, escala, escala);
        hielo.renderOrder = 3;

        // Almacenamiento de metadatos para la lógica de flotación en update().
        hielo.userData = {
            baseX: x, baseY: y, baseZ: z,
            fase: Math.random() * Math.PI * 2,
            velRot: 0.4 + Math.random() * 0.6
        };

        return hielo;
    }

    crearHielos() {
        const grupo = new THREE.Group();
        const config = [
            [-0.18, 1.25, 0.12, 0.4, 0.2, 0.1, 1.0],
            [0.16, 1.8, -0.10, 0.2, 0.7, 0.3, 0.9],
            [0.05, 1.05, 0.20, 0.6, 0.1, 0.5, 1.1],
            [-0.10, 1.60, -0.18, 0.3, 0.5, 0.2, 0.85]
        ];

        config.forEach(c => {
            const h = this.crearHielo(...c);
            this.hielos.push(h);
            grupo.add(h);
        });
        return grupo;
    }

    construir() {
        this.add(this.crearVaso());
        this.add(this.crearLiquido());
        this.add(this.crearHielos());
        this.add(this.crearLimon());
        this.add(this.crearPajita());
    }

    /**
     * Ciclo de actualización: Gestiona la efervescencia y la flotabilidad dinámica.
     */
    update(delta) {
        this.tiempo += delta;

        // Efervescencia: Desplazamiento de la textura de burbujas en el eje V (UV mapping).
        if (this.texturaBurbujas) {
            this.texturaBurbujas.offset.y -= delta * 0.15;
        }

        // Flotabilidad: Movimiento browniano simulado mediante funciones trigonométricas.
        this.hielos.forEach(hielo => {
            const { baseX, baseY, baseZ, fase, velRot } = hielo.userData;

            hielo.position.y = baseY + Math.sin(this.tiempo * 1.4 + fase) * 0.03;
            hielo.position.x = baseX + Math.cos(this.tiempo * 0.9 + fase) * 0.015;
            hielo.position.z = baseZ + Math.sin(this.tiempo * 1.1 + fase) * 0.015;

            // Rotación lenta diferencial.
            hielo.rotation.x += delta * velRot * 0.25;
            hielo.rotation.y += delta * velRot * 0.20;
        });
    }
}

export { Rebujito };