import * as THREE from 'three';

class Castanuelas extends THREE.Object3D {

    constructor() {
        super();

        this.tiempo = 0;
        this.aperturaMax = THREE.MathUtils.degToRad(15);
        this.velocidadRepique = 8;

        this.materialMadera = new THREE.MeshStandardMaterial({
            color: 0x2a1506,
            roughness: 0.22,
            metalness: 0.08,
            side: THREE.DoubleSide
        });

        this.materialCordon = new THREE.MeshStandardMaterial({
            color: 0x8b0000,
            roughness: 0.85
        });

        this.createModel();
        this.grupoCastanuelas.position.y = 1.5;
    }

    createModel() {
        this.grupoCastanuelas = new THREE.Object3D();
        this.add(this.grupoCastanuelas);

        this.pivotSuperior = new THREE.Object3D();
        this.pivotInferior = new THREE.Object3D();

        this.hojaSuperior = this.crearConcha();
        this.hojaInferior = this.crearConcha();

        this.hojaSuperior.position.set(0, -1.1, 0.14);
        this.hojaInferior.position.set(0, -1.1, -0.14);
        this.hojaInferior.rotation.x = Math.PI;

        this.pivotSuperior.add(this.hojaSuperior);
        this.pivotInferior.add(this.hojaInferior);

        this.grupoCastanuelas.add(this.pivotSuperior);
        this.grupoCastanuelas.add(this.pivotInferior);

        const cordones = this.crearDetalleCordon();
        this.grupoCastanuelas.add(cordones);
    }

    crearConcha() {
        const grupo = new THREE.Group();

        // EXTERIOR CONVEXO
        const geoExterior = new THREE.SphereGeometry(1.0, 90, 40);
        geoExterior.scale(0.95, 1.2, 0.42);

        const exterior = new THREE.Mesh(geoExterior, this.materialMadera);
        exterior.castShadow = true;
        exterior.receiveShadow = true;

        // INTERIOR CÓNCAVO
        const geoInterior = new THREE.SphereGeometry(0.82, 40, 40);
        geoInterior.scale(0.78, 1.00, 0.20);

        const materialInterior = new THREE.MeshStandardMaterial({
            color: 0x1a0b03,
            roughness: 0.28,
            metalness: 0.05,
            side: THREE.DoubleSide
        });

        const interior = new THREE.Mesh(geoInterior, materialInterior);
        interior.position.z = 0.10;
        interior.castShadow = true;
        interior.receiveShadow = true;

        // BORDE PERIMETRAL
        const geoBorde = new THREE.TorusGeometry(0.72, 0.10, 20, 80);
        geoBorde.scale(1.18, 1.45, 1.0);

        const borde = new THREE.Mesh(geoBorde, this.materialMadera);
        borde.rotation.x = Math.PI / 2;
        borde.position.z = 0.02;
        borde.castShadow = true;
        borde.receiveShadow = true;

        // OREJA SUPERIOR
        const orejaShape = new THREE.Shape();
        orejaShape.moveTo(-0.18, 0);
        orejaShape.quadraticCurveTo(-0.18, 0.22, 0, 0.28);
        orejaShape.quadraticCurveTo(0.18, 0.22, 0.18, 0);
        orejaShape.lineTo(0.12, -0.18);
        orejaShape.quadraticCurveTo(0, -0.10, -0.12, -0.18);
        //orejaShape.closePath();

        const extrudeSettings = {
            depth: 0.16,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 3
        };

        const geoOreja = new THREE.ExtrudeGeometry(orejaShape, extrudeSettings);
        geoOreja.center();

        const oreja = new THREE.Mesh(geoOreja, this.materialMadera);
        oreja.position.set(0, 1.18, 0.02);
        oreja.castShadow = true;
        oreja.receiveShadow = true;

        grupo.add(exterior);
        grupo.add(interior);
        grupo.add(borde);
        grupo.add(oreja);

        return grupo;
    }

    crearConcha() {
        const grupo = new THREE.Group();

        // =========================================================
        // EXTERIOR (forma principal)
        // =========================================================
        const geoExterior = new THREE.SphereGeometry(1, 40, 40);
        geoExterior.scale(0.85, 1.15, 0.35); // menos profundo → más real

        const exterior = new THREE.Mesh(geoExterior, this.materialMadera);

        // =========================================================
        // INTERIOR (concavidad real)
        // =========================================================
        const geoInterior = new THREE.SphereGeometry(0.78, 40, 40);
        geoInterior.scale(0.75, 1.0, 0.20);

        const interior = new THREE.Mesh(
            geoInterior,
            new THREE.MeshStandardMaterial({
                color: 0x140803,
                roughness: 0.3,
                metalness: 0.05,
                side: THREE.DoubleSide
            })
        );


        interior.position.z = 0.52;

        // =========================================================
        // APLASTAR BASE (forma real de castañuela)
        // =========================================================
        exterior.scale.x = 0.85; // menos circular
        interior.scale.x = 0.85;

        // =========================================================
        // OREJA (simplificada pero integrada)
        // =========================================================
        const geoOreja = new THREE.BoxGeometry(0.25, 0.2, 0.15);
        const oreja = new THREE.Mesh(geoOreja, this.materialMadera);
        oreja.position.set(0, 1.15, 0.05);

        grupo.add(exterior);
        grupo.add(interior);
        grupo.add(oreja);

        return grupo;
    }
    crearDetalleCordon() {
        const grupoCordon = new THREE.Group();

        const geoNudo = new THREE.TorusGeometry(0.12, 0.035, 12, 24);
        const nudo1 = new THREE.Mesh(geoNudo, this.materialCordon);
        const nudo2 = new THREE.Mesh(geoNudo, this.materialCordon);

        nudo1.rotation.y = Math.PI / 2;
        nudo2.rotation.y = Math.PI / 2;

        nudo1.position.set(-0.18, 0.05, 0);
        nudo2.position.set(0.18, 0.05, 0);

        const curva = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.18, 0.05, 0),
            new THREE.Vector3(0, 0.38, 0),
            new THREE.Vector3(0.18, 0.05, 0)
        ]);

        const geoCordel = new THREE.TubeGeometry(curva, 20, 0.025, 8, false);
        const cordel = new THREE.Mesh(geoCordel, this.materialCordon);

        grupoCordon.add(nudo1);
        grupoCordon.add(nudo2);
        grupoCordon.add(cordel);

        grupoCordon.position.y = 0.05;

        return grupoCordon;
    }
    update(delta) {
        this.tiempo += delta * this.velocidadRepique;

        const angulo = Math.abs(Math.sin(this.tiempo)) * this.aperturaMax;

        this.pivotSuperior.rotation.x = -angulo*2;
        this.pivotInferior.rotation.x = angulo*2;

        this.rotation.y = Math.sin(this.tiempo * 0.5) * 0.05;
    }
}

export { Castanuelas };