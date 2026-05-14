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

        this.userData.recogible = true;
        this.recogido = false;
        this.rotacionActiva = true;
        this.tiempo = 0;
        this.baseAnimacionY = null;
        this.rotacionBaseX = 0;
        this.rotacionBaseZ = 0;

        // --- CONFIGURACIÓN DE MATERIALES SIN ILUMINACIÓN ---
        
        // Metal de la llave: laton envejecido, mas coherente con una llave antigua.
        this.materialPlata = new THREE.MeshBasicMaterial({
            color: 0xc79633
        });

        // Papel de farolillo: rojo con lunares y relieve suave de pliegues.
        this.materialPapel = new THREE.MeshBasicMaterial({
            map: this.crearTexturaPapelConLunares(),
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
            bevelEnabled: true,
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
     * Genera dinámicamente un patrón de lunares blancos sobre fondo rojo.
     */
    crearTexturaPapelConLunares() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 512;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#d83a28');
        grad.addColorStop(0.5, '#b71917');
        grad.addColorStop(1, '#7f1110');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(120, 0, 0, 0.18)';
        ctx.lineWidth = 3;
        for (let col = 0; col <= this.pliegues; col++) {
            const x = (canvas.width / this.pliegues) * col;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

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

    crearRelievePapel() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const anchoCol = canvas.width / this.pliegues;
        for (let col = 0; col <= this.pliegues; col++) {
            const x = anchoCol * col;
            const grad = ctx.createLinearGradient(x - anchoCol * 0.5, 0, x + anchoCol * 0.5, 0);
            grad.addColorStop(0, '#707070');
            grad.addColorStop(0.5, '#9a9a9a');
            grad.addColorStop(1, '#707070');
            ctx.fillStyle = grad;
            ctx.fillRect(x - anchoCol * 0.5, 0, anchoCol, canvas.height);
        }

        const textura = new THREE.CanvasTexture(canvas);
        textura.wrapS = THREE.RepeatWrapping;
        return textura;
    }

    /**
     * Actualiza el estado de la animación
     */
    update(delta) {
        const segundos = delta > 10 ? delta / 1000 : delta;
        this.tiempo += segundos;

        if (this.baseAnimacionY === null) {
            this.baseAnimacionY = this.position.y;
        }

        // Giro, balanceo y flotacion visibles mientras el pick-up espera ser recogido.
        if (this.rotacionActiva) {
            this.rotation.y += segundos * 2.4;
            this.rotation.x = this.rotacionBaseX + Math.sin(this.tiempo * 3.0) * 0.22;
            this.rotation.z = this.rotacionBaseZ + Math.cos(this.tiempo * 2.5) * 0.16;
            this.position.y = this.baseAnimacionY + Math.sin(this.tiempo * 2.4) * 0.14;
        }
    }

    setRotacionActiva(valor) {
        this.rotacionActiva = valor;
    }
}

export { Farolillo };
