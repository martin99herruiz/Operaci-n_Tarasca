import * as THREE from 'three';

class Castanuelas extends THREE.Object3D {

    constructor() {
        super();

        // ==========================================
        // PARÁMETROS
        // ==========================================
        this.tiempo = 0;
        this.aperturaMax = THREE.MathUtils.degToRad(15); // Ángulo de repique
        this.velocidadRepique = 8;

        // ==========================================
        // MATERIALES
        // ==========================================
        // Madera oscura pulida (granadillo/ébano)
        this.materialMadera = new THREE.MeshStandardMaterial({
            color: 0x2a1506,
            roughness: 0.2,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        // Cordón de algodón trenzado rojo
        this.materialCordon = new THREE.MeshStandardMaterial({
            color: 0x8b0000,
            roughness: 0.9
        });

        this.createModel();
        this.grupoCastanuelas.position.y = 1.5;
    }

    createModel() {
        // Contenedor para el modelo jerárquico
        this.grupoCastanuelas = new THREE.Object3D();
        this.add(this.grupoCastanuelas);

        // --- NODOS DE ARTICULACIÓN (Pivotes) ---
        // Situamos el centro de rotación en el "oído" (la parte superior)
        // Siguiendo L4.pdf pg. 67 sobre Modelos Jerárquicos
        this.pivotSuperior = new THREE.Object3D();
        this.pivotInferior = new THREE.Object3D();

        // Creamos las dos conchas (hojas)
        this.hojaSuperior = this.crearConcha();
        this.hojaInferior = this.crearConcha();

        // Posicionamiento relativo al pivote (Traspasamos el origen al eje de giro)
        // La hoja superior "cuelga" hacia abajo desde el pivote
        this.hojaSuperior.position.set(0, -1.2, 0.15);
        
        // La hoja inferior es simétrica
        this.hojaInferior.position.set(0, -1.2, -0.15);
        this.hojaInferior.rotation.x = Math.PI; 

        // Ensamblaje de la jerarquía
        this.pivotSuperior.add(this.hojaSuperior);
        this.pivotInferior.add(this.hojaInferior);
        
        this.grupoCastanuelas.add(this.pivotSuperior);
        this.grupoCastanuelas.add(this.pivotInferior);

        // Añadimos detalles: el cordón que une los "oídos"
        const cordones = this.crearDetalleCordon();
        this.grupoCastanuelas.add(cordones);
    }

    // =========================================================
    // TÉCNICA: EXTRUSIÓN Y SHAPES (L4.pdf pg. 20)
    // =========================================================
    crearConcha() {
        const shape = new THREE.Shape();

        // Perfil exterior de la castanuela
        shape.moveTo(0, 1.2); 
        shape.bezierCurveTo(0.6, 1.2, 1.0, 0.8, 1.0, 0.2);
        shape.bezierCurveTo(1.0, -0.8, 0.5, -1.2, 0, -1.2);
        shape.bezierCurveTo(-0.5, -1.2, -1.0, -0.8, -1.0, 0.2);
        shape.bezierCurveTo(-1.0, 0.8, -0.6, 1.2, 0, 1.2);

        // Hueco interior (Cuchara)
        // Añadimos un agujero al shape para que la extrusión sea hueca
        const holePath = new THREE.Path();
        holePath.absarc(0, 0, 0.7, 0, Math.PI * 2, true);
        shape.holes.push(holePath);

        const extrudeSettings = {
            depth: 0.2,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,
            bevelSegments: 8
        };

        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        // Centramos la geometría para que el "oído" sea el punto 0,0
        geo.translate(0, 0, -0.1);

        const mesh = new THREE.Mesh(geo, this.materialMadera);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }

    crearDetalleCordon() {
        const grupoCordon = new THREE.Group();

        // Simulamos los nudos superiores con toroides
        const geoNudo = new THREE.TorusGeometry(0.15, 0.04, 12, 24);
        const nudo1 = new THREE.Mesh(geoNudo, this.materialCordon);
        const nudo2 = nudo1.clone();

        nudo1.position.set(-0.3, 0, 0);
        nudo2.position.set(0.3, 0, 0);
        
        // Un arco que une los dos lados (el cordón que va al dedo)
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.3, 0, 0),
            new THREE.Vector3(0, 0.5, 0),
            new THREE.Vector3(0.3, 0, 0)
        ]);
        const geoTubo = new THREE.TubeGeometry(curve, 20, 0.03, 8, false);
        const cordel = new THREE.Mesh(geoTubo, this.materialCordon);

        grupoCordon.add(nudo1, nudo2, cordel);
        grupoCordon.position.y = 0.1; // Encima de los pivotes

        return grupoCordon;
    }

    // =========================================================
    // ANIMACIÓN: REPIQUE (L4.pdf pg. 66)
    // =========================================================
    update(delta) {
        this.tiempo += delta * this.velocidadRepique;

        // Movimiento de apertura/cierre oscilante
        // Usamos Math.abs para que siempre estén abiertas o cerradas, nunca se crucen
        const angulo = Math.abs(Math.sin(this.tiempo)) * this.aperturaMax;

        // Aplicamos la rotación a los pivotes (Modelado Jerárquico)
        this.pivotSuperior.rotation.x = -angulo;
        this.pivotInferior.rotation.x = angulo;

        // Pequeña vibración lateral para dar realismo al toque
        this.rotation.y = Math.sin(this.tiempo * 1.5) * 0.05;
    }
}

export { Castanuelas };