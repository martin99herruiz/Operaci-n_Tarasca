import * as THREE from 'three';

/**
 * Clase Farolillo
 * Representa una entidad híbrida: el cuerpo de un farolillo de feria tradicional
 * que funciona como el mango de una llave antigua ornamentada
 */
class Farolillo extends THREE.Object3D {

    constructor() {
        super();

        // --- PARÁMETROS GEOMÉTRICOS ---
        // radioBase: Radio de la esfera base antes de la deformación
        // pliegues: Cantidad de muescas verticales (estilo acordeón)
        // amplitudPliegue: Profundidad del relieve en los pliegues
        this.radioBase = 1.0;
        this.pliegues = 18;
        this.amplitudPliegue = 0.065;

        // --- CONFIGURACIÓN DE MATERIALES (PBR) ---
        
        // Material Metálico: Simulación de plata pulida con alta reflectividad
        this.materialPlata = new THREE.MeshStandardMaterial({
            color: 0xD1D1D1, 
            metalness: 0.9,
            roughness: 0.1
        });

        // Material Papel: Doble cara para visibilidad total y textura procedural
        this.materialPapel = new THREE.MeshStandardMaterial({
            map: this.crearTexturaPapelConLunares(),
            roughness: 0.95,
            metalness: 0.2,
            side: THREE.DoubleSide
        });

        this.createModel();
    }

    /**
     * Ensambla las partes del objeto en una jerarquía de grupos
     */
    createModel() {
        // 1. Mango: Cuerpo del farolillo generado por revolución
        const mango = this.crearCuerpoPorRevolucion();
        mango.position.y = 2.5; 
        this.add(mango);

        // 2. Estructura de la Llave: Vástago y paletón
        this.add(this.crearPartesLlave());

        // Escala global del componente para facilitar su integración en la escena
        this.scale.set(0.5, 0.5, 0.5);
    }

    /**
     * Genera los componentes metálicos de la llave
     * Utiliza geometrías primitivas y extrusiones de formas 2D
     */
    crearPartesLlave() {
        const grupoLlave = new THREE.Group();

        // Vástago: Eje central de la llave
        const geoVastago = new THREE.CylinderGeometry(0.12, 0.12, 3.5, 20);
        const vastago = new THREE.Mesh(geoVastago, this.materialPlata);
        vastago.position.y = 0.5;
        grupoLlave.add(vastago);

        // Adorno superior: Anillo de transición estética (Toroide)
        const geoAnillo = new THREE.TorusGeometry(0.18, 0.05, 12, 24);
        const anillo = new THREE.Mesh(geoAnillo, this.materialPlata);
        anillo.rotation.x = Math.PI / 2;
        anillo.position.y = 2.1;
        grupoLlave.add(anillo);

        // Paletón: Dientes de la llave creados mediante ExtrudeGeometry
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0.6, 0);
        shape.lineTo(0.6, -0.2);
        shape.lineTo(0.3, -0.2);
        shape.lineTo(0.3, -0.35); 
        shape.lineTo(0.6, -0.35);
        shape.lineTo(0.6, -0.7);
        shape.lineTo(0.4, -0.7);
        shape.lineTo(0.4, -0.85); 
        shape.lineTo(0, -0.85);
        shape.lineTo(0, 0);

        const geoPaleton = new THREE.ExtrudeGeometry(shape, {
            depth: 0.12,
            bevelEnabled: true, // Añade biselado para capturar mejor la luz
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 5
        });
        const paleton = new THREE.Mesh(geoPaleton, this.materialPlata);
        paleton.position.set(0.05, -0.6, -0.06); 
        grupoLlave.add(paleton);

        // Punta: Remate inferior de la llave
        const geoPunta = new THREE.SphereGeometry(0.15, 16, 16);
        const punta = new THREE.Mesh(geoPunta, this.materialPlata);
        punta.position.y = -1.25;
        punta.scale.y = 1.5;
        grupoLlave.add(punta);

        return grupoLlave;
    }

    /**
     * Técnica: Revolución y Deformación Procedural
     * Genera el cuerpo esférico y aplica una función coseno para crear los pliegues
     */
    crearCuerpoPorRevolucion() {
        // Creación del perfil 2D (Media circunferencia)
        const perfil = [];
        for (let i = 0; i <= 180; i++) {
            const t = i / 180;
            const ang = -Math.PI / 2 + t * Math.PI;
            perfil.push(new THREE.Vector2(Math.abs(this.radioBase * Math.cos(ang)), this.radioBase * Math.sin(ang)));
        }

        const geo = new THREE.LatheGeometry(perfil, 96);
        const positions = geo.attributes.position;
        const vertice = new THREE.Vector3();

        // Deformación de vértices: Se altera el radio en función del ángulo theta
        for (let i = 0; i < positions.count; i++) {
            vertice.fromBufferAttribute(positions, i);
            const theta = Math.atan2(vertice.z, vertice.x);
            const yNorm = THREE.MathUtils.clamp(vertice.y / this.radioBase, -1, 1);
            
            // factorPolos: Evita deformación excesiva en los extremos superior e inferior
            const factorPolos = Math.sqrt(1 - yNorm * yNorm);
            const deformacion = 1 + this.amplitudPliegue * Math.cos(this.pliegues * theta) * factorPolos;
            
            vertice.x *= deformacion;
            vertice.z *= deformacion;
            positions.setXYZ(i, vertice.x, vertice.y, vertice.z);
        }

        geo.computeVertexNormals();

        // Mapeado UV Manual: Asegura que los lunares se alineen con los pliegues generados
        const uvs = [];
        for (let i = 0; i < positions.count; i++) {
            vertice.fromBufferAttribute(positions, i);
            let theta = Math.atan2(vertice.z, vertice.x);
            if (theta < 0) theta += 2 * Math.PI;
            const u = ((theta + (Math.PI / this.pliegues)) / (2 * Math.PI)) % 1;
            const v = (vertice.y / this.radioBase + 1) / 2;
            uvs.push(u, v);
        }
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

        return new THREE.Mesh(geo, this.materialPapel);
    }

    /**
     * Técnica: Texturizado Procedural mediante Canvas
     * Genera dinámicamente un patrón de lunares blancos sobre fondo verde
     */
    crearTexturaPapelConLunares() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Color base de feria
        ctx.fillStyle = '#115715';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Algoritmo de distribución de lunares (rejilla alternada)
        const anchoCol = canvas.width / this.pliegues;
        for (let fila = 0; fila < 8; fila++) {
            for (let col = 0; col < this.pliegues; col++) {
                if ((fila + col) % 2 !== 0) continue;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(col * anchoCol + anchoCol * 0.5, (canvas.height / 8) * (fila + 0.5), 15, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        const textura = new THREE.CanvasTexture(canvas);
        textura.wrapS = THREE.RepeatWrapping; // Repetición horizontal
        return textura;
    }

    /**
     * Actualiza el estado de la animación
     */
    update() {
        this.rotation.y += 0.01;
    }
}

export { Farolillo };