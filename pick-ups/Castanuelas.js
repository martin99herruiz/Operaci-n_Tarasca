import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
//  CASTAÑUELAS — Pick-Up para "Operación Tarasca: Laberinto de Volantes"
//
//  Técnicas de modelado:
//    1. LatheGeometry   → cuerpo cóncavo (revolución de perfil 2D)
//    2. ExtrudeGeometry → orejas laterales con agujero (extrusión de Shape)
//    3. CSG (simulado)  → hueco interior resonante (BackSide inner shell)
//    4. TubeGeometry    → cordel (barrido sobre CatmullRomCurve3)
//
//  Modelo jerárquico:
//    Castanuelas (Group) ← posición en escena
//    ├── pivotGroup      ← rotación general (DOF rotación Y)
//    │   ├── castLeft    ← DOF 1: rot.Z apertura  (>0)
//    │   └── castRight   ← DOF 1: rot.Z apertura  (<0)  (dependiente: −castLeft.rotation.z)
//    │       castLeft/Right.rotation.X  ← DOF 2: vibración choque (dependiente de DOF1)
//
//  Interfaz pública (compatible con index.js):
//    update(delta)
//    setRotacionActiva(bool)
//    setLuzActiva(bool)        (no-op – las castañuelas no tienen luz propia)
//    setVelocidadRepique(v)    → frecuencia de apertura/cierre
//    setAperturaMax(v)         → ángulo máximo de apertura (radianes)
// ─────────────────────────────────────────────────────────────────────────────

export class Castanuelas extends THREE.Group {

    constructor() {
        super();

        // ── Parámetros animables (expuestos a la GUI) ──────────────────────
        this.rotacionActiva   = true;
        this.luzActiva        = true;   // sin efecto real; cumple interfaz
        this.velocidadRepique = 5.0;    // Hz aprox. del repique
        this.aperturaMax      = 0.22;   // radianes (~12.5°)

        // Estado interno
        this._tiempo = 0;

        // ── Construir geometría y escena ────────────────────────────────────
        this._buildTextures();
        this._buildMaterials();
        this._buildGeometries();
        this._buildScene();
    }

    // ════════════════════════════════════════════════════════════════════════
    //  INTERFAZ PÚBLICA
    // ════════════════════════════════════════════════════════════════════════

    update(delta) {
        this._tiempo += delta;
        const t = this._tiempo;

        // ── Rotación lenta del conjunto (DOF display) ──────────────────────
        if (this.rotacionActiva) {
            this._pivotGroup.rotation.y += delta * 0.6;
        }

        // ── DOF 1: apertura / cierre ───────────────────────────────────────
        // Oscilación asimétrica: cierre rápido (golpe), apertura lenta
        const raw = Math.abs(Math.sin(t * this.velocidadRepique));
        const openAngle = this.aperturaMax * raw;

        this._castLeft.rotation.z  =  openAngle;
        this._castRight.rotation.z = -openAngle;   // dependiente: simétr.

        // ── DOF 2: vibración en el choque (dependiente de DOF 1) ──────────
        // Solo activa cuando openAngle ≈ 0 (momento del contacto)
        const contactFactor = Math.max(0, 0.035 - openAngle) / 0.035;
        const vibracion = contactFactor * 0.045 * Math.sin(t * 35);
        this._castLeft.rotation.x  = vibracion;
        this._castRight.rotation.x = vibracion;
    }

    setRotacionActiva(v) { this.rotacionActiva = v; }
    setLuzActiva(v)      { this.luzActiva = v; }      // interfaz cumplida

    setVelocidadRepique(v) { this.velocidadRepique = v; }
    setAperturaMax(v)      { this.aperturaMax = v; }

    // ════════════════════════════════════════════════════════════════════════
    //  CONSTRUCCIÓN INTERNA
    // ════════════════════════════════════════════════════════════════════════

    _buildTextures() {
        // Textura de color: veteado de madera (canvas procedural)
        this._woodColorTex = this._makeWoodColorCanvas(512, 512, 42);
        this._woodColorTex.wrapS = this._woodColorTex.wrapT = THREE.RepeatWrapping;

        // Bump map: relieve del veteado (canal de relieve, requisito mínimo)
        this._woodBumpTex = this._makeWoodBumpCanvas(512, 512, 77);
        this._woodBumpTex.wrapS = this._woodBumpTex.wrapT = THREE.RepeatWrapping;
    }

    _buildMaterials() {
        // Material con textura de color + bump map (madera caoba)
        this._matMadera = new THREE.MeshStandardMaterial({
            map:       this._woodColorTex,
            bumpMap:   this._woodBumpTex,
            bumpScale: 0.004,
            roughness: 0.60,
            metalness: 0.04,
            side: THREE.DoubleSide,
        });

        // Material interior (BackSide) para simular el hueco resonante (CSG)
        this._matHueco = new THREE.MeshStandardMaterial({
            map:       this._woodColorTex,
            bumpMap:   this._woodBumpTex,
            bumpScale: 0.002,
            roughness: 0.75,
            metalness: 0.02,
            side: THREE.BackSide,
            color: 0x3a1505,   // más oscuro por dentro
        });

        // Material del cordel (color rojo, sin textura)
        this._matCordel = new THREE.MeshStandardMaterial({
            color:     0xcc1111,
            roughness: 0.85,
            metalness: 0.0,
        });
    }

    _buildGeometries() {
        // Precalcular geometrías reutilizables entre las dos castañuelas
        this._geoExterior = this._makeCuerpoExteriorGeo();
        this._geoHueco    = this._makeCuerpoHuecoGeo();
        this._geoOreja    = this._makeOrejaGeo();
    }

    _buildScene() {
        // Grupo pivote (soporta la rotación de presentación)
        this._pivotGroup = new THREE.Group();
        this.add(this._pivotGroup);

        // Construir las dos castañuelas
        this._castLeft  = this._buildOneCastanuela();
        this._castRight = this._buildOneCastanuela();

        // Posición y orientación: separadas simétricamente
        // Las castañuelas reales se sostienen en la mano: eje vertical
        const sep = 0.20;  // separación entre centros (escala ~1 m = real)
        this._castLeft.position.set(-sep / 2, 0, 0);
        this._castRight.position.set( sep / 2, 0, 0);
        this._castRight.rotation.z = Math.PI;   // girada boca abajo (simétrica)

        this._pivotGroup.add(this._castLeft);
        this._pivotGroup.add(this._castRight);

        // Inclinación del conjunto para vista más natural
        this._pivotGroup.rotation.x = 0.2;
    }

    // ── Construir una castañuela individual ──────────────────────────────────
    _buildOneCastanuela() {
        const group = new THREE.Group();

        // 1. REVOLUCIÓN — cuerpo exterior (concha)
        const cuerpoExt = new THREE.Mesh(this._geoExterior, this._matMadera);
        group.add(cuerpoExt);

        // 3. CSG SIMULADO — hueco interior resonante (BackSide shell)
        const cuerpoHueco = new THREE.Mesh(this._geoHueco, this._matHueco);
        group.add(cuerpoHueco);

        // 2. EXTRUSIÓN — orejas × 2 (simétricas en X)
        [-1, 1].forEach(sign => {
            const oreja = new THREE.Mesh(this._geoOreja, this._matMadera);
            // Posición: borde lateral de la concha
            oreja.position.set(sign * 0.055, 0, 0);
            oreja.rotation.x = -Math.PI / 2;
            group.add(oreja);
        });

        // 4. BARRIDO (TubeGeometry) — cordel
        const cordel = this._buildCordel();
        group.add(cordel);

        return group;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  GEOMETRÍAS DETALLADAS
    // ════════════════════════════════════════════════════════════════════════

    // Técnica 1: REVOLUCIÓN — perfil del casquete esférico aplanado
    _makeCuerpoExteriorGeo() {
        const N = 32;
        const pts = [];
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const a = t * Math.PI;
            // Radio: máximo en el ecuador, cero en los polos
            const r = 0.075 * Math.sin(a * 0.92 + 0.08);
            // Profundidad: casquete aplanado (máx ~2 cm)
            const y = -0.045 * Math.pow(Math.sin(a), 1.3);
            pts.push(new THREE.Vector2(r, y));
        }
        return new THREE.LatheGeometry(pts, 80);
    }

    // Técnica 3: CSG SIMULADO — shell interno más pequeño con BackSide
    _makeCuerpoHuecoGeo() {
        const N = 28;
        const pts = [];
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const a = t * Math.PI;
            const r = 0.062 * Math.sin(a * 0.92 + 0.08);
            const y = -0.032 * Math.pow(Math.sin(a), 1.3) + 0.003;
            pts.push(new THREE.Vector2(r, y));
        }
        return new THREE.LatheGeometry(pts, 72);
    }

    // Técnica 2: EXTRUSIÓN — oreja con agujero para el cordel
    _makeOrejaGeo() {
        const shape = new THREE.Shape();
        // Perfil: rectángulo con semicírculo en la punta
        shape.moveTo(-0.010, 0.000);
        shape.lineTo(-0.010, 0.028);
        shape.absarc(0, 0.028, 0.010, Math.PI, 0, false);
        shape.lineTo( 0.010, 0.000);
        shape.closePath();

        // Agujero circular para el cordel
        const agujero = new THREE.Path();
        agujero.absarc(0, 0.028, 0.005, 0, Math.PI * 2);
        shape.holes.push(agujero);

        return new THREE.ExtrudeGeometry(shape, {
            depth:            0.008,
            bevelEnabled:     true,
            bevelThickness:   0.0015,
            bevelSize:        0.0015,
            bevelSegments:    3,
        });
    }

    // Técnica 4: BARRIDO — cordel (TubeGeometry sobre CatmullRomCurve3)
    _buildCordel() {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.045,  0.030, 0.002),
            new THREE.Vector3(-0.015,  0.060, 0.012),
            new THREE.Vector3( 0.000,  0.075, 0.014),
            new THREE.Vector3( 0.015,  0.060, 0.012),
            new THREE.Vector3( 0.045,  0.030, 0.002),
        ]);
        const geo = new THREE.TubeGeometry(curve, 40, 0.003, 8, false);
        return new THREE.Mesh(geo, this._matCordel);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  TEXTURAS PROCEDURALES
    // ════════════════════════════════════════════════════════════════════════

    _makeWoodColorCanvas(w, h, seed) {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');

        // Fondo base: caoba oscura
        ctx.fillStyle = '#6B2F0F';
        ctx.fillRect(0, 0, w, h);

        let rng = seed >>> 0;
        const rand = () => {
            rng = Math.imul(rng, 1664525) + 1013904223 >>> 0;
            return rng / 0xFFFFFFFF;
        };

        // Vetas longitudinales
        for (let i = 0; i < 55; i++) {
            const x0 = rand() * w;
            const alpha = 0.04 + rand() * 0.18;
            const r = Math.floor(120 + rand() * 80);
            const g = Math.floor(40  + rand() * 45);
            const b = Math.floor(5   + rand() * 20);
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.lineWidth = 0.5 + rand() * 3.5;
            ctx.beginPath();
            ctx.moveTo(x0, 0);
            for (let y = 0; y <= h; y += 3) {
                ctx.lineTo(x0 + Math.sin(y * 0.03 + rand() * 0.4) * 14, y);
            }
            ctx.stroke();
        }
        return new THREE.CanvasTexture(canvas);
    }

    _makeWoodBumpCanvas(w, h, seed) {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, w, h);

        let rng = seed >>> 0;
        const rand = () => {
            rng = Math.imul(rng, 1664525) + 1013904223 >>> 0;
            return rng / 0xFFFFFFFF;
        };

        for (let i = 0; i < 40; i++) {
            const x0 = rand() * w;
            const v = Math.floor(45 + rand() * 150);
            ctx.strokeStyle = `rgb(${v},${v},${v})`;
            ctx.lineWidth = 0.5 + rand() * 2.5;
            ctx.beginPath();
            ctx.moveTo(x0, 0);
            for (let y = 0; y <= h; y += 3) {
                ctx.lineTo(x0 + Math.sin(y * 0.04 + rand() * 0.3) * 10, y);
            }
            ctx.stroke();
        }
        return new THREE.CanvasTexture(canvas);
    }
}