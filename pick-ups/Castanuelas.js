import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION, ADDITION } from '../libs/three-bvh-csg.js';

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
export class Castanuelas extends THREE.Object3D {
    constructor(opts = {}) {
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
        this.scale.setScalar(1.6);

        // animation state
        this._time = 0;
        this.hitSpeed = opts.hitSpeed || 10; // speed of hit animation
        this.hitAngle = opts.hitAngle || 0.6; // max rotation angle (rad)

        const woodMat = new THREE.MeshStandardMaterial({
            map: createWoodTexture(),
            roughness: 0.7,
            metalness: 0.05
        });

        // create left and right castanuela
        const left = this._makeShell(woodMat);
        const right = left.clone();
        right.rotation.y = Math.PI; // face opposite

        // small separation and pivot setup
        const leftPivot = new THREE.Object3D();
        const rightPivot = new THREE.Object3D();

        left.position.x = -0.17;
        right.position.x = 0.17;

        leftPivot.add(left);
        rightPivot.add(right);

        // add small cord between them
        const cord = this._makeCord();
        cord.position.y = 0.02;

        this.left = leftPivot;
        this.right = rightPivot;

        // group assembly
        this.add(leftPivot);
        this.add(rightPivot);
        this.add(cord);

        // extruded tabs (orejas) near top on both halves
        const tab = this._makeTab(woodMat);
        tab.position.set(-0.02, 0.05, 0.25);
        tab.rotation.x = -0.2;
        this.add(tab);

        const tab2 = tab.clone();
        tab2.position.x = -tab.position.x;
        tab2.rotation.y = Math.PI;
        this.add(tab2);

        // shadows
        this.traverse((n) => {
            if (n.isMesh) {
                n.castShadow = true;
                n.receiveShadow = true;
            }
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
        // expose simple API
        this._rotating = true;
    }

    // crea la cáscara usando Lathe + CSG para hueco interior
    _makeShell(material) {
        // perfil proporcionado por el usuario
        const perfil = [
            new THREE.Vector2(0.00, 0.01),
            new THREE.Vector2(0.31, 0.13),
            new THREE.Vector2(0.42, 0.31),
            new THREE.Vector2(0.34, 0.56),
            new THREE.Vector2(0.18, 0.66),
            new THREE.Vector2(0.19, 0.75),
            new THREE.Vector2(0.33, 0.79),
            new THREE.Vector2(0.32, 0.86),
            new THREE.Vector2(0.00, 0.85),
        ];

        const outerGeo = new THREE.LatheGeometry(perfil, 64, 0, Math.PI * 2);
        outerGeo.computeVertexNormals();

        // inner profile slightly smaller and offset to create concavity
        const innerPerfil = perfil.map(p => new THREE.Vector2(p.x * 0.75, p.y * 0.9 + 0.02));
        const innerGeo = new THREE.LatheGeometry(innerPerfil, 64, 0, Math.PI * 2);
        innerGeo.computeVertexNormals();

        // create Brush meshes for CSG
        const outerBrush = new Brush(outerGeo, material.clone());
        const innerBrush = new Brush(innerGeo, new THREE.MeshStandardMaterial());
        innerBrush.position.z = -0.02; // push slightly to ensure clean subtraction

        // evaluate subtraction (outer - inner)
        const evaluator = new Evaluator();
        const result = evaluator.evaluate(outerBrush, innerBrush, SUBTRACTION);

        // now cut away half the volume using a box (prisma) and CSG subtraction
        // compute bounding box of the current result to position the cutting box precisely
        const posAttr = result.geometry.attributes.position;
        const bbox = new THREE.Box3();
        bbox.setFromBufferAttribute(posAttr);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());

        // create a box that starts at the mid-plane (center.z) and extends to the positive side
        const boxWidth = size.x * 3 + 0.5;
        const boxHeight = size.y * 3 + 0.5;
        const boxDepth = size.z * 1.2 + 0.1; // a bit larger than half depth
 
        const halfBox = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
        const halfBrush = new Brush(halfBox, new THREE.MeshStandardMaterial());
        // position the box so its front face aligns with center.z (cutting plane at center)
        halfBrush.position.z = center.z + boxDepth / 2;
        halfBrush.updateMatrixWorld(true);

        const finalBrush = evaluator.evaluate(result, halfBrush, SUBTRACTION);

        // Tomamos el perfil interior (innerPerfil) y lo reducimos ligeramente radialmente
        const fillPerfil = innerPerfil.map(p => new THREE.Vector2(p.x * 0.98, p.y * 1.0));
        const fillGeo = new THREE.LatheGeometry(fillPerfil, 48, 0, Math.PI * 2);
        fillGeo.computeVertexNormals();
        const fillBrush = new Brush(fillGeo, new THREE.MeshStandardMaterial());
        // desplazar un poco para encajar mejor después del corte
        fillBrush.position.z = -0.01;
        fillBrush.updateMatrixWorld(true);

        const filled = evaluator.evaluate(finalBrush, fillBrush, ADDITION);
        filled.geometry.computeVertexNormals();

        // --- Corte cóncavo interior: restamos una pequeña "copa" para dejar la concavidad ---
        // Usamos una esfera recortada (cap) como sustractor
        const cupGeo = new THREE.SphereGeometry(0.36, 32, 24);
        const cupBrush = new Brush(cupGeo, new THREE.MeshStandardMaterial());
        // posicionar ligeramente hacia el interior (ajusta Y/Z según necesidad)
        cupBrush.position.set(0, 0.06, 0);
        cupBrush.updateMatrixWorld(true);

        const concaveResult = evaluator.evaluate(filled, cupBrush, SUBTRACTION);
        concaveResult.geometry.computeVertexNormals();

        // scale down to comfortable size and orient
        const mesh = new THREE.Mesh(concaveResult.geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.scale.set(0.8, 0.8, 0.8);

        return mesh;
    }

    // extrusión simple para las orejas/soporte de cordón
    _makeTab(material) {
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
        shape.moveTo(0, 0);
        shape.quadraticCurveTo(0.06, 0.02, 0.12, 0.08);
        shape.lineTo(0.12, 0.18);
        shape.quadraticCurveTo(0.06, 0.14, 0, 0.12);

        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.006 });
        const m = material.clone();
        const mesh = new THREE.Mesh(geo, m);
        mesh.rotation.x = -Math.PI / 2;
        mesh.scale.set(0.25, 0.25, 0.25);
        return mesh;
    }

    _makeCord() {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.045,  0.030, 0.002),
            new THREE.Vector3(-0.015,  0.060, 0.012),
            new THREE.Vector3( 0.000,  0.075, 0.014),
            new THREE.Vector3( 0.015,  0.060, 0.012),
            new THREE.Vector3( 0.045,  0.030, 0.002),
            new THREE.Vector3(-0.17, 0.02, 0.05),
            new THREE.Vector3(-0.05, 0.02, 0.08),
            new THREE.Vector3(0.05, 0.02, 0.08),
            new THREE.Vector3(0.17, 0.02, 0.05),
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
        const geo = new THREE.TubeGeometry(curve, 24, 0.01, 8, false);
        const mat = new THREE.MeshStandardMaterial({ color: 0x2b1f12, roughness: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        return mesh;
    }

    setRotacionActiva(flag) {
        this._rotating = flag;
    }

    // called from the scene loop
    update(dt) {
        if (!this._rotating) return;
        this._time += dt * this.hitSpeed;

        // simple oscillation for a subtle idle movement
        const idle = Math.sin(this._time * 0.6) * 0.03;
        this.rotation.y = idle;

        // small hit animation between halves
        const hit = Math.sin(this._time) * this.hitAngle * 0.5;
        this.left.rotation.z = 0.1 + hit;
        this.right.rotation.z = -0.1 - hit;
    }

}

// crea un CanvasTexture procedural tipo madera
function createWoodTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // base
    ctx.fillStyle = '#a06836';
    ctx.fillRect(0, 0, size, size);

    // rings
    for (let i = 0; i < 120; i++) {
        const alpha = 0.03 + Math.random() * 0.05;
        ctx.fillStyle = `rgba(${80 + i % 60}, ${40 + i % 60}, ${20 + i % 40}, ${alpha})`;
        const ry = size * (0.4 + 0.4 * Math.sin(i * 0.12));
        ctx.beginPath();
        ctx.ellipse(size/2, size/2, size * (0.4 - i * 0.002), ry, i * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }

    // slight noise
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
        const v = (Math.random() - 0.5) * 12;
        img.data[i] = Math.max(0, Math.min(255, img.data[i] + v));
        img.data[i+1] = Math.max(0, Math.min(255, img.data[i+1] + v*0.6));
        img.data[i+2] = Math.max(0, Math.min(255, img.data[i+2] + v*0.3));
    }
    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.needsUpdate = true;
    return tex;
}

