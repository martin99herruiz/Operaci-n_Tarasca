import * as THREE from 'three';

class Farolillo extends THREE.Object3D {

    constructor() {
        super();

        // ==========================================
        // PARÁMETROS DE COMPORTAMIENTO
        // ==========================================
        this.rotacionActiva = true;
        this.luzActiva = true;

        // ==========================================
        // PARÁMETROS GEOMÉTRICOS DEL FAROLILLO
        // ==========================================
        this.radioBase = 1.0;
        this.pliegues = 18;
        this.amplitudPliegue = 0.065;

        // ==========================================
        // TÉCNICA: TEXTURA
        // El estampado de lunares forma parte del papel
        // ==========================================
        const texturaPapel = this.crearTexturaPapelConLunares();

        this.materialPapel = new THREE.MeshStandardMaterial({
            map: texturaPapel,
            roughness: 0.95,
            metalness: 0.2,
            transparent: false,
            opacity: 0.90,
            side: THREE.DoubleSide
        });

        this.materialLuz = new THREE.MeshStandardMaterial({
            color: 0xfff1c9,
            emissive: 0xffcc66,
            emissiveIntensity: 1.15,
            transparent: true,
            opacity: 0.28
        });

        this.createModel();
    }

    createModel() {
        // ==========================================
        // TÉCNICA PRINCIPAL: REVOLUCIÓN
        // Cuerpo del farolillo
        // ==========================================
        const cuerpo = this.crearCuerpoPorRevolucion();
        this.add(cuerpo);

        // ==========================================
        // Luz interior
        // ==========================================
        const luzInterior = this.crearLuzInterior();
        this.add(luzInterior);

        // Ligero achatamiento vertical
        this.scale.set(1.0, 0.87, 1.0);
    }

    // =========================================================
    // TÉCNICA: REVOLUCIÓN
    // Se genera un perfil 2D y se gira alrededor del eje Y.
    // Después se deforman los vértices para crear los pliegues.
    // Finalmente se redefinen las UV para reducir deformación
    // del estampado y esconder mejor la costura.
    // =========================================================
    crearCuerpoPorRevolucion() {
        const perfil = [];
        const muestras = 180;

        for (let i = 0; i <= muestras; i++) {
            const t = i / muestras;
            const ang = -Math.PI / 2 + t * Math.PI;

            const x = this.radioBase * Math.cos(ang);
            const y = this.radioBase * Math.sin(ang);

            // LatheGeometry usa radios positivos
            perfil.push(new THREE.Vector2(Math.abs(x), y));
        }

        const geo = new THREE.LatheGeometry(perfil, 96);

        // ------------------------------------------
        // TÉCNICA: DEFORMACIÓN GEOMÉTRICA
        // Simulación de pliegues del papel
        // ------------------------------------------
        const positions = geo.attributes.position;
        const vertice = new THREE.Vector3();

        for (let i = 0; i < positions.count; i++) {
            vertice.fromBufferAttribute(positions, i);

            const theta = Math.atan2(vertice.z, vertice.x);
            const yNorm = THREE.MathUtils.clamp(vertice.y / this.radioBase, -1, 1);

            // Los pliegues se atenúan cerca de polos
            const factorPolos = Math.sqrt(1 - yNorm * yNorm);

            const deformacion =
                1 + this.amplitudPliegue * Math.cos(this.pliegues * theta) * factorPolos;

            vertice.x *= deformacion;
            vertice.z *= deformacion;

            positions.setXYZ(i, vertice.x, vertice.y, vertice.z);
        }

        positions.needsUpdate = true;
        geo.computeVertexNormals();

        // ------------------------------------------
        // TÉCNICA: MAPEADO UV MANUAL
        // Mapeado cilíndrico para reducir deformación
        // del estampado y mover la costura UV fuera
        // de la pared principal visible.
        // ------------------------------------------
        const uvs = [];
        const puntoUV = new THREE.Vector3();

        for (let i = 0; i < positions.count; i++) {
            puntoUV.fromBufferAttribute(positions, i);

            let theta = Math.atan2(puntoUV.z, puntoUV.x);
            if (theta < 0) theta += 2 * Math.PI;

            // Desplazamos la costura media franja
            // para que no quede en mitad de una pared
            const offset = Math.PI / this.pliegues;

            let u = (theta + offset) / (2 * Math.PI);
            u = u % 1;

            const v = (puntoUV.y / this.radioBase + 1) / 2;

            uvs.push(u, v);
        }

        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

        const mesh = new THREE.Mesh(geo, this.materialPapel);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    }

    // =========================================================
    // TÉCNICA: TEXTURA PROCEDURAL
    // Dibujamos el estampado del papel del farolillo.
    //
    // LÓGICA:
    // - Cada pliegue genera una pared vertical visible.
    // - Cada lunar se coloca centrado en una de esas paredes.
    // - Además, si cae cerca del borde del canvas,
    //   se replica al lado contrario para evitar
    //   que se note la unión de la textura.
    // =========================================================
    crearTexturaPapelConLunares() {
        const canvas = document.createElement('canvas');
        canvas.width = 4096;
        canvas.height = 2048;

        const ctx = canvas.getContext('2d');

        // Fondo del papel
        ctx.fillStyle = '#115715';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ligera variación para que no parezca totalmente plano
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i < 120; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const w = 15 + Math.random() * 60;
            const h = 6 + Math.random() * 14;
            ctx.fillRect(x, y, w, h);
        }

        // ---------------------------------------------------------
        // Cada pliegue genera una pared vertical visible.
        // En la textura, eso se traduce en columnas periódicas.
        // Colocamos los lunares en el centro de cada columna.
        // ---------------------------------------------------------
        const columnas = this.pliegues;
        const anchoColumna = canvas.width / columnas;

        // Filas verticales del estampado
        const filas = 15;
        const margenSuperior = 170;
        const margenInferior = 170;
        const altoUtil = canvas.height - margenSuperior - margenInferior;
        const pasoY = altoUtil / filas;

        for (let fila = 0; fila < filas; fila++) {
            const yBase = margenSuperior + fila * pasoY + pasoY * 0.5;
            const vNorm = yBase / canvas.height;

            for (let col = 0; col < columnas; col++) {
                // alternamos para no llenar todas las paredes en todas las filas
                if ((fila + col) % 2 !== 0) continue;

                // Centro exacto de la pared del pliegue
                const xCentro = col * anchoColumna + anchoColumna * 0.5;

                // Variación vertical pequeña
                const cy = yBase + (Math.random() - 0.5) * 12;

                // Muy poca variación horizontal, para que
                // el lunar siga pegado a la pared del pliegue
                const cx = xCentro + (Math.random() - 0.5) * anchoColumna * 0.08;

                const rBase = 33 + Math.random() * 4;

                // Lunar principal
                this.dibujarLunarCompensado(ctx, cx, cy, rBase, vNorm);

                // -------------------------------------------------
                // Hacemos la textura periódica horizontalmente
                // para que no se vea la unión al cerrar la revolución
                // -------------------------------------------------
                const margenCostura = 80;

                if (cx < margenCostura) {
                    this.dibujarLunarCompensado(ctx, cx + canvas.width, cy, rBase, vNorm);
                }

                if (cx > canvas.width - margenCostura) {
                    this.dibujarLunarCompensado(ctx, cx - canvas.width, cy, rBase, vNorm);
                }
            }
        }

        const textura = new THREE.CanvasTexture(canvas);
        textura.wrapS = THREE.RepeatWrapping;
        textura.wrapT = THREE.ClampToEdgeWrapping;
        textura.colorSpace = THREE.SRGBColorSpace;
        textura.needsUpdate = true;

        return textura;
    }

    // =========================================================
    // Dibuja un lunar del estampado.
    // Se compensa en vertical para que sobre la geometría
    // abombada se vea más redondo.
    // =========================================================
    dibujarLunarCompensado(ctx, cx, cy, rBase, vNorm) {
        ctx.save();

        // Distancia a la franja central:
        // 0 en el centro, 1 cerca de polos
        const dCentro = Math.abs(vNorm - 0.5) / 0.5;

        // Compensación para corregir deformación visual
        const escalaY = 1.0 + 0.5 * dCentro * dCentro;
        const escalaX = 1.0 - 0.08 * dCentro;

        ctx.translate(cx, cy);
        ctx.scale(escalaX, escalaY);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();

        const puntos = 32;
        for (let i = 0; i <= puntos; i++) {
            const t = (i / puntos) * Math.PI * 2;

            const ruido =
                1
                + 0.035 * Math.sin(3 * t)
                + 0.020 * Math.sin(5 * t + 0.6);

            const r = rBase * ruido;
            const x = r * Math.cos(t);
            const y = r * Math.sin(t);

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.fill();

        // Ligera variación interna de color
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.beginPath();
        ctx.arc(-rBase * 0.05, -rBase * 0.04, rBase * 0.68, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // =========================================================
    // Luz interior
    // Guardamos referencias para poder activarla/desactivarla
    // =========================================================
    crearLuzInterior() {
        const grupo = new THREE.Object3D();

        this.esferaLuz = new THREE.Mesh(
            new THREE.SphereGeometry(0.55, 32, 32),
            this.materialLuz
        );

        this.pointLight = new THREE.PointLight(0xffd27a, 1.35, 6, 2);
        this.pointLight.position.set(0, 0, 0);

        grupo.add(this.esferaLuz);
        grupo.add(this.pointLight);

        return grupo;
    }

    // =========================================================
    // Control de rotación
    // =========================================================
    setRotacionActiva(valor) {
        this.rotacionActiva = valor;
    }

    // =========================================================
    // Control de luz
    // =========================================================
    setLuzActiva(valor) {
        this.luzActiva = valor;

        if (this.pointLight) {
            this.pointLight.visible = valor;
        }

        if (this.esferaLuz) {
            this.esferaLuz.visible = valor;
        }
    }

    update(delta) {
    if (this.rotacionActiva) {
        this.rotation.y += this.velocidadRotacion ?? 0.01;
    }
}
}

export { Farolillo };