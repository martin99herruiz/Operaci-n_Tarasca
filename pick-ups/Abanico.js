import * as THREE from 'three';

/**
 * Clase Abanico
 * Representa un objeto paramétrico articulado compuesto por varillas rígidas
 * y secciones de tela dinámicas que se recalculan según el ángulo de apertura.
 */
class Abanico extends THREE.Object3D {

    constructor() {
        super();

        // --- CONFIGURACIÓN DE TEXTURAS PROCEDURALES ---
        // Se generan mediante Canvas para simular el tramado de la tela (hilos).
        const texturaColor = new THREE.CanvasTexture(this.crearTexturaTela());
        const texturaRelieve = new THREE.CanvasTexture(this.crearRelieveTela());

        // --- PARÁMETROS ESTRUCTURALES ---
        this.numModulos = 12;            // Secciones de tela.
        this.numVarillas = this.numModulos + 1;

        // Límites cinemáticos en radianes.
        this.anguloMin = THREE.MathUtils.degToRad(5);
        this.anguloMax = THREE.MathUtils.degToRad(170);
        this.anguloActual = THREE.MathUtils.degToRad(120);

        // Dimensiones radiales (del eje al borde).
        this.radioInterior = 0.9;
        this.radioExterior = 3.2;

        this.grosorVarilla = 0.045;
        this.grosorTela = 0.012;
        this.tiempo = 0;

        // Estados de control.
        this.rotacionActiva = true;
        this.animacionActiva = true;

        // --- DEFINICIÓN DE MATERIALES (PBR) ---
        
        // Material Varilla: Madera oscura con baja reflectividad.
        this.materialVarilla = new THREE.MeshStandardMaterial({
            color: 0x4a2616,
            roughness: 0.8,
            metalness: 0.1
        });

        // Material Tela: Implementa Bump Mapping para relieve táctil y doble cara.
        this.materialTela = new THREE.MeshStandardMaterial({
            map: texturaColor,
            bumpMap: texturaRelieve,
            bumpScale: 0.05,
            side: THREE.DoubleSide
        });

        // Material Borde: Acabado metálico dorado para detalles.
        this.materialBorde = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.8,
            roughness: 0.3
        });

        // --- INICIALIZACIÓN DE ESTRUCTURA ---
        this.grupo = new THREE.Object3D();
        this.add(this.grupo);
        this.modulos = [];

        this.construir();
        this.actualizar();
    }

    /**
     * Genera un patrón de rejilla procedural en un Canvas 2D
     * para simular la trama textil (Diffuse Map).
     */
    crearTexturaTela() {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#d8ceb0'; // Color beige base.
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#c2b89a';
        ctx.lineWidth = 1;
        for (let i = 0; i < 512; i += 10) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
        }
        return c;
    }

    /**
     * Genera un mapa de altura (Bump Map) en escala de grises
     * coherente con la textura de color para aportar profundidad.
     */
    crearRelieveTela() {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#808080'; // Gris neutro (sin relieve).
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#999';
        for (let i = 0; i < 512; i += 10) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
        }
        return c;
    }

    /**
     * Modela la varilla utilizando un Shape (curvas cuadráticas) y ExtrudeGeometry.
     * El diseño es ergonómico: más ancho en el centro y estilizado en los extremos.
     */
    crearVarilla() {
        const shape = new THREE.Shape();
        shape.moveTo(-0.07, 0);
        shape.quadraticCurveTo(-0.15, 0.1, -0.1, 0.25);
        shape.lineTo(-0.04, 3.2);
        shape.quadraticCurveTo(0, 3.4, 0.04, 3.2);
        shape.lineTo(0.1, 0.25);
        shape.quadraticCurveTo(0.15, 0.1, 0.07, 0);

        const geo = new THREE.ExtrudeGeometry(shape, {
            depth: this.grosorVarilla,
            bevelEnabled: false
        });
        geo.translate(0, 0, -this.grosorVarilla / 2); // Centrado de masa.

        return new THREE.Mesh(geo, this.materialVarilla);
    }

    /**
     * Genera la geometría de la tela entre dos varillas.
     * Implementa una deformación senoidal en los vértices para simular
     * el pliegue natural del papel/tela al cerrarse.
     */
    crearTela(angulo, subdiv = 20) {
        const geo = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const uvs = [];

        const z1 = -0.001;
        const z2 = -this.grosorTela;

        for (let i = 0; i <= subdiv; i++) {
            const t = i / subdiv;
            const ang = t * angulo;

            // Simulación física de pliegue: Elevación en Z según función seno.
            const pliegue = 0.05 * Math.sin(ang * this.numModulos);

            const xi = this.radioInterior * Math.sin(ang);
            const yi = this.radioInterior * Math.cos(ang) + pliegue;

            const xe = this.radioExterior * Math.sin(ang);
            const ye = this.radioExterior * Math.cos(ang) + pliegue * 2;

            vertices.push(xi, yi, z1, xe, ye, z1); // Cara frontal.
            vertices.push(xi, yi, z2, xe, ye, z2); // Cara trasera.

            uvs.push(t, 0, t, 1, t, 0, t, 1);
        }

        // Generación de caras (triángulos) para ambas caras de la tela.
        for (let i = 0; i < subdiv; i++) {
            const k = i * 4;
            indices.push(k, k + 1, k + 4, k + 1, k + 5, k + 4); // Front.
            indices.push(k + 2, k + 6, k + 3, k + 3, k + 6, k + 7); // Back.
        }

        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        return new THREE.Mesh(geo, this.materialTela);
    }

    /**
     * Ensambla una unidad lógica de varilla + tela.
     */
    crearModulo(angulo) {
        const obj = new THREE.Object3D();
        const varilla = this.crearVarilla();
        const tela = this.crearTela(angulo);

        obj.add(varilla, tela);
        obj.userData = { varilla, tela };
        return obj;
    }

    /**
     * Construcción inicial de la jerarquía. 
     * Se instancian los módulos y se almacenan en un array para su manipulación dinámica.
     */
    construir() {
        const paso = this.anguloActual / this.numVarillas;
        for (let i = 0; i < this.numModulos; i++) {
            const mod = this.crearModulo(paso);
            if (i === 0) { // La primera varilla no necesita tela precedente.
                mod.remove(mod.userData.tela);
                mod.userData.tela = null;
            }
            this.modulos.push(mod);
            this.grupo.add(mod);
        }
    }

    /**
     * Lógica de articulación.
     * Recalcula la rotación de cada varilla y regenera la geometría de la tela
     * para que coincida exactamente con la apertura actual del abanico.
     */
    actualizar() {
        const total = this.anguloActual;
        const inicio = -total / 2;
        const paso = total / this.numVarillas;

        for (let i = 0; i < this.modulos.length; i++) {
            const ang = inicio + i * paso;
            const mod = this.modulos[i];
            mod.rotation.z = ang;

            // La tela se regenera para evitar distorsiones de textura al estirarse.
            if (mod.userData.tela) {
                mod.remove(mod.userData.tela);
                mod.userData.tela.geometry.dispose();
                mod.userData.tela = this.crearTela(paso);
                mod.add(mod.userData.tela);
            }
        }
    }

    /**
     * Ciclo de actualización.
     * Controla la rotación global del objeto y la animación armónica de apertura/cierre.
     */
    update(delta) {
        this.tiempo += delta;
        /**
         * 
         * 
        if (this.rotacionActiva) {
            this.rotation.y += 0.5 * delta;
        }

        if (this.animacionActiva) {
            // Función senoidal para una apertura suave (Ease-in/out).
            const t = 0.5 + 0.5 * Math.sin(this.tiempo);
            this.anguloActual = this.anguloMin + t * (this.anguloMax - this.anguloMin);
            this.actualizar();
        }
         */
       
    }
}

export { Abanico };