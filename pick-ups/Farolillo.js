import * as THREE from 'three';

class Farolillo extends THREE.Object3D {

    constructor() {
        super();

        this.materialPapel = new THREE.MeshStandardMaterial({
            map: this.crearTexturaLunares(),
            roughness: 0.95,
            metalness: 0.02
        });

        this.materialLuz = new THREE.MeshStandardMaterial({
            color: 0xffe3a1,
            emissive: 0xffaa33,
            emissiveIntensity: 1.4,
            transparent: true,
            opacity: 0.65
        });

        this.createModel();
    }


    crearTexturaLunares() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;

        const ctx = canvas.getContext('2d');

        // fondo blanco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // lunares rojos
        ctx.fillStyle = '#d61f1f';

        const separacion = 110;
        const radioBase = 18;

        for (let y = 90; y < canvas.height; y += separacion) {
            for (let x = 90; x < canvas.width; x += separacion) {
                const dx = (Math.random() - 0.5) * 30;
                const dy = (Math.random() - 0.5) * 30;
                const r = radioBase + (Math.random() - 0.5) * 10;

                ctx.beginPath();
                ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const textura = new THREE.CanvasTexture(canvas);
        textura.wrapS = THREE.RepeatWrapping;
        textura.wrapT = THREE.RepeatWrapping;
        textura.repeat.set(1, 1);

        return textura;
    }
    createModel() {
        const cuerpo = this.crearCuerpoFarolillo();

        const luzInterior = this.crearLuzInterior();

        this.add(cuerpo);

        this.add(luzInterior);

        this.scale.set(0.9, 0.9, 0.9);
    }

    crearCuerpoFarolillo() {
        const radio = 1.0;
        const segmentosVerticales = 64;
        const segmentosHorizontales = 64;

        const geo = new THREE.SphereGeometry(
            radio,
            segmentosVerticales,
            segmentosHorizontales
        );

        const pos = geo.attributes.position;
        const v = new THREE.Vector3();

        const pliegues = 18;
        const amplitud = 0.08;

        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);

            const y = v.y;
            const theta = Math.atan2(v.z, v.x);

            // factor para que en polos casi no haya pliegue
            const factorPolos = Math.sin(Math.acos(THREE.MathUtils.clamp(y / radio, -1, 1)));

            // pliegue radial vertical
            const deformacion = 1 + amplitud * Math.cos(pliegues * theta) * factorPolos;

            v.x *= deformacion;
            v.z *= deformacion;

            pos.setXYZ(i, v.x, v.y, v.z);
        }

        pos.needsUpdate = true;
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, this.materialPapel);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    }



    crearLuzInterior() {
        const grupo = new THREE.Object3D();

        const bombilla = new THREE.Mesh(
            new THREE.SphereGeometry(0.45, 24, 24),
            this.materialLuz
        );

        const puntoLuz = new THREE.PointLight(0xffaa33, 1.6, 5.0, 2);
        puntoLuz.position.set(0, 0, 0);

        grupo.add(bombilla);
        grupo.add(puntoLuz);

        return grupo;
    }

    update(time) {
        this.rotation.y = time * 0.0006;
    }
}

export { Farolillo };