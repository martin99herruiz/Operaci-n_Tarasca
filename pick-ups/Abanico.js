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
        const texturaColor = new THREE.CanvasTexture(this.crearTexturaTela());
        const texturaRelieve = new THREE.CanvasTexture(this.crearRelieveTela());

        // --- PARÁMETROS ESTRUCTURALES ---
        this.numModulos = 12;            
        this.numVarillas = this.numModulos + 1;

        this.anguloMin = THREE.MathUtils.degToRad(5);
        this.anguloMax = THREE.MathUtils.degToRad(170);
        this.anguloActual = THREE.MathUtils.degToRad(120);

        this.radioInterior = 0.9;
        this.radioExterior = 3.2;

        this.grosorVarilla = 0.045;
        this.grosorTela = 0.012;
        this.tiempo = 0;

        this.rotacionActiva = true;
        this.animacionActiva = true;

        // --- DEFINICIÓN DE MATERIALES (PBR) ---
        
        this.materialVarilla = new THREE.MeshStandardMaterial({
            color: 0x4a2616,
            roughness: 0.8,
            metalness: 0.1
        });

        this.materialTela = new THREE.MeshStandardMaterial({
            map: texturaColor,
            bumpMap: texturaRelieve,
            bumpScale: 0.05,
            side: THREE.DoubleSide
        });

        this.materialBorde = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.8,
            roughness: 0.3
        });

        // --- INICIALIZACIÓN DE ESTRUCTURA ---
        this.grupo = new THREE.Object3D();
        this.add(this.grupo);
        this.modulos = [];

        this.userData.recogible = true; 
        this.recogido = false;

        this.construir();
        this.actualizar();
    }

    crearTexturaTela() {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#d8ceb0'; 
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#c2b89a';
        ctx.lineWidth = 1;
        for (let i = 0; i < 512; i += 10) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
        }
        return c;
    }

    crearRelieveTela() {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#808080'; 
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#999';
        for (let i = 0; i < 512; i += 10) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
        }
        return c;
    }

    /**
     * Crea la anilla metálica mediante un barrido (TubeGeometry).
     * Se sitúa en la base donde convergen todas las varillas.
     */
    crearAnilla() {
        const radioAnilla = 0.18;
        const radioTubo = 0.025;
        
        // Creamos una trayectoria circular para el barrido
        const curve = new THREE.EllipseCurve(
            0, 0,             // Centro x, y
            radioAnilla, radioAnilla, // Radio x, y
            0, 2 * Math.PI,   // Ángulo inicial y final
            false,            // Sentido horario
            0                 // Rotación
        );

        const puntos = curve.getPoints(50);
        const trayectoria = new THREE.CatmullRomCurve3(puntos.map(p => new THREE.Vector3(p.x, p.y, 0)));
        trayectoria.closed = true;

        // Generación por barrido
        const geoAnilla = new THREE.TubeGeometry(trayectoria, 64, radioTubo, 12, true);
        const anilla = new THREE.Mesh(geoAnilla, this.materialBorde);

        // Posicionamiento en el "ojo" del abanico
        anilla.position.set(0, 0, 0);
        anilla.rotation.y = Math.PI / 2; // Girada para alinearse con las varillas

        return anilla;
    }

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
        geo.translate(0, 0, -this.grosorVarilla / 2); 

        return new THREE.Mesh(geo, this.materialVarilla);
    }

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
            const pliegue = 0.05 * Math.sin(ang * this.numModulos);

            const xi = this.radioInterior * Math.sin(ang);
            const yi = this.radioInterior * Math.cos(ang) + pliegue;
            const xe = this.radioExterior * Math.sin(ang);
            const ye = this.radioExterior * Math.cos(ang) + pliegue * 2;

            vertices.push(xi, yi, z1, xe, ye, z1); 
            vertices.push(xi, yi, z2, xe, ye, z2); 

            uvs.push(t, 0, t, 1, t, 0, t, 1);
        }

        for (let i = 0; i < subdiv; i++) {
            const k = i * 4;
            indices.push(k, k + 1, k + 4, k + 1, k + 5, k + 4); 
            indices.push(k + 2, k + 6, k + 3, k + 3, k + 6, k + 7); 
        }

        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        return new THREE.Mesh(geo, this.materialTela);
    }

    crearModulo(angulo) {
        const obj = new THREE.Object3D();
        const varilla = this.crearVarilla();
        const tela = this.crearTela(angulo);

        obj.add(varilla, tela);
        obj.userData = { varilla, tela };
        return obj;
    }

    construir() {
        const paso = this.anguloActual / this.numVarillas;
        for (let i = 0; i < this.numModulos; i++) {
            const mod = this.crearModulo(paso);
            if (i === 0) { 
                mod.remove(mod.userData.tela);
                mod.userData.tela = null;
            }
            this.modulos.push(mod);
            this.grupo.add(mod);
        }

        // Añadimos la anilla metálica en el eje
        this.anilla = this.crearAnilla();
        this.add(this.anilla);
    }

    actualizar() {
        const total = this.anguloActual;
        const inicio = -total / 2;
        const paso = total / this.numVarillas;

        for (let i = 0; i < this.modulos.length; i++) {
            const ang = inicio + i * paso;
            const mod = this.modulos[i];
            mod.rotation.z = ang;

            if (mod.userData.tela) {
                mod.remove(mod.userData.tela);
                mod.userData.tela.geometry.dispose();
                mod.userData.tela = this.crearTela(paso);
                mod.add(mod.userData.tela);
            }
        }
    }

    update(delta = 0) {
        const segundos = delta > 10 ? delta / 1000 : delta;
        this.tiempo += segundos;

        if (this.rotacionActiva) {
            this.rotation.y += 0.5 * segundos;
        }

        if (this.animacionActiva) {
            const t = 0.5 + 0.5 * Math.sin(this.tiempo);
            this.anguloActual = this.anguloMin + t * (this.anguloMax - this.anguloMin);
            this.actualizar();
        }
    }

    setRotacionActiva(valor) {
        this.rotacionActiva = valor;
    }

    setAnimacionActiva(valor) {
        this.animacionActiva = valor;
    }

    setApertura(valor) {
        this.anguloActual = THREE.MathUtils.clamp(valor, this.anguloMin, this.anguloMax);
        this.actualizar();
    }
}

export { Abanico };