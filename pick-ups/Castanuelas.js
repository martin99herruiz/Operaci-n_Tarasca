import * as THREE from 'three';

class Castanuelas extends THREE.Object3D {

    constructor() {
        super();

        this.tiempo = 0;
        this.rotacionActiva = true;
        this.velocidadRepique = 8;
        this.aperturaMax = THREE.MathUtils.degToRad(15);

        this.materialMadera = new THREE.MeshStandardMaterial({
            map: this.crearTexturaMadera(),
            roughness: 0.55,
            metalness: 0.05
        });

        this.materialCordel = new THREE.MeshStandardMaterial({
            color: 0x2b1a10,
            roughness: 0.9
        });

        this.grupo = new THREE.Group();
        this.add(this.grupo);

        this.izquierda = this.crearPieza();
        this.derecha = this.crearPieza();

        this.izquierda.position.x = -0.18;
        this.derecha.position.x = 0.18;

        this.derecha.rotation.y = Math.PI;

        this.grupo.add(this.izquierda);
        this.grupo.add(this.derecha);

        const cordel = this.crearCordel();
        cordel.position.set(0, 0.45, 0);
        this.grupo.add(cordel);

        this.scale.setScalar(1.5);
    }

    crearPieza() {
        const grupo = new THREE.Group();

        const perfil = [
            new THREE.Vector2(0.00, 0.00),
            new THREE.Vector2(0.18, 0.04),
            new THREE.Vector2(0.30, 0.16),
            new THREE.Vector2(0.34, 0.34),
            new THREE.Vector2(0.27, 0.52),
            new THREE.Vector2(0.14, 0.62),
            new THREE.Vector2(0.04, 0.64)
        ];

        const geo = new THREE.LatheGeometry(perfil, 64);
        geo.computeVertexNormals();

        const cuerpo = new THREE.Mesh(geo, this.materialMadera);
        cuerpo.rotation.x = Math.PI / 2;
        grupo.add(cuerpo);

        const huecoGeo = new THREE.SphereGeometry(0.26, 48, 24);
        const huecoMat = new THREE.MeshStandardMaterial({
            color: 0x3b1708,
            roughness: 0.75,
            side: THREE.BackSide
        });

        const hueco = new THREE.Mesh(huecoGeo, huecoMat);
        hueco.scale.set(1.0, 0.35, 0.75);
        hueco.position.set(0, 0.02, 0.15);
        grupo.add(hueco);

        const oreja = this.crearOreja();
        oreja.position.set(0, 0.38, 0.02);
        grupo.add(oreja);

        return grupo;
    }

    crearOreja() {
        const shape = new THREE.Shape();
        shape.moveTo(-0.08, 0);
        shape.lineTo(-0.08, 0.10);
        shape.quadraticCurveTo(0, 0.17, 0.08, 0.10);
        shape.lineTo(0.08, 0);
        shape.closePath();

        const agujero = new THREE.Path();
        agujero.absarc(0, 0.08, 0.025, 0, Math.PI * 2);
        shape.holes.push(agujero);

        const geo = new THREE.ExtrudeGeometry(shape, {
            depth: 0.04,
            bevelEnabled: true,
            bevelThickness: 0.008,
            bevelSize: 0.008,
            bevelSegments: 3
        });

        const mesh = new THREE.Mesh(geo, this.materialMadera);
        mesh.rotation.x = -Math.PI / 2;
        return mesh;
    }

    crearCordel() {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.18, 0, 0),
            new THREE.Vector3(-0.08, 0.12, 0.02),
            new THREE.Vector3(0, 0.16, 0.04),
            new THREE.Vector3(0.08, 0.12, 0.02),
            new THREE.Vector3(0.18, 0, 0)
        ]);

        const geo = new THREE.TubeGeometry(curve, 40, 0.012, 10, false);
        return new THREE.Mesh(geo, this.materialCordel);
    }

    crearTexturaMadera() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;

        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#8a4b22';
        ctx.fillRect(0, 0, 512, 512);

        for (let i = 0; i < 80; i++) {
            ctx.strokeStyle = `rgba(60, 25, 8, ${0.08 + Math.random() * 0.12})`;
            ctx.lineWidth = 1 + Math.random() * 4;
            ctx.beginPath();

            const x = Math.random() * 512;
            ctx.moveTo(x, 0);

            for (let y = 0; y < 512; y += 20) {
                ctx.lineTo(x + Math.sin(y * 0.04 + i) * 18, y);
            }

            ctx.stroke();
        }

        const textura = new THREE.CanvasTexture(canvas);
        textura.wrapS = THREE.RepeatWrapping;
        textura.wrapT = THREE.RepeatWrapping;
        textura.needsUpdate = true;

        return textura;
    }

    update(delta) {
        this.tiempo += delta;

        if (this.rotacionActiva) {
            this.grupo.rotation.y += delta * 0.4;
        }

        const golpe = Math.abs(Math.sin(this.tiempo * this.velocidadRepique));
        const apertura = golpe * this.aperturaMax;

        this.izquierda.rotation.z = apertura;
        this.derecha.rotation.z = -apertura;
    }

    setRotacionActiva(valor) {
        this.rotacionActiva = valor;
    }

    setLuzActiva(valor) {
        // Las castañuelas no tienen luz propia.
    }
}

export { Castanuelas };