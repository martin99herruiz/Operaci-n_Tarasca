import * as THREE from 'three';

/**
 * Clase Rebujito
 * Representa un sistema de bebida compuesto por múltiples materiales con propiedades
 * ópticas complejas (transmisión, IOR) y elementos animados proceduralmente.
 */
class Rebujito extends THREE.Object3D {

    constructor() {
        super();

        this.tiempo = 0;
        this.hielos = [];
        // Parametros de animacion del liquido: se escala en Y manteniendo la base.
        this.alturaLiquidoBase = 1.8;
        this.alturaLiquidoMin = 0.55;
        this.alturaLiquidoMax = 1.85;
        this.baseLiquidoY = 0.02;
        // Parametros aproximados de colision en planta para los hielos.
        this.radioInteriorVaso = 0.57;
        this.radioColisionHielo = 0.19;
        this.distanciaMinimaHielos = this.radioColisionHielo * 2;
        this.radioOrbitaHielos = 0.25;
        this.amplitudMovimientoHielo = 0.025;

        this.userData.recogible = true;
        this.recogido = false;

        // ==========================================
        // CONFIGURACIÓN DE MATERIALES SIN ILUMINACIÓN
        // ==========================================

        this.materialCristal = new THREE.MeshBasicMaterial({
            color: 0xeaf8ff,
            transparent: true,
            opacity: 0.34,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        // Textura Procedural: Generada en Canvas para simular efervescencia.
        this.texturaBurbujas = this.crearTexturaBurbujas();
        this.texturaLimon = this.crearTexturaLimon();
        this.texturaPajita = this.crearTexturaPajita();

        this.materialLiquido = new THREE.MeshBasicMaterial({
            color: 0xf0d86a,
            transparent: true,
            opacity: 0.82
        });

        this.materialLimon = new THREE.MeshBasicMaterial({
            color: 0xffe055,
            map: this.texturaLimon
        });

        this.materialPajita = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: this.texturaPajita
        });

        this.materialHielo = new THREE.MeshBasicMaterial({
            color: 0xe8fbff,
            transparent: true,
            opacity: 0.48
        });

        this.construir();
    }

    /**
     * Técnica: Generación de textura de ruido mediante Canvas.
     * Crea círculos con gradientes radiales que actúan como mapa de normales/bump.
     */
    crearTexturaBurbujas() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#888888'; // Gris neutro para el Bump Map.
        ctx.fillRect(0, 0, 256, 256);

        for (let i = 0; i < 60; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const r = Math.random() * 2 + 1;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, '#ffffff'); // Elevación máxima.
            grad.addColorStop(1, '#888888'); // Base plana.

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        const textura = new THREE.CanvasTexture(canvas);
        textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
        return textura;
    }

    crearTexturaLimon() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffe156';
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 10;
        for (let i = 0; i < 12; i++) {
            const angulo = (i / 12) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(256, 256);
            ctx.lineTo(256 + Math.cos(angulo) * 250, 256 + Math.sin(angulo) * 250);
            ctx.stroke();
        }

        ctx.strokeStyle = '#f0b900';
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.arc(256, 256, 232, 0, Math.PI * 2);
        ctx.stroke();

        const textura = new THREE.CanvasTexture(canvas);
        return textura;
    }

    crearTexturaPajita() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#fff5e8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#d92828';
        for (let y = -128; y < canvas.height + 128; y += 96) {
            ctx.save();
            ctx.translate(canvas.width / 2, y);
            ctx.rotate(-Math.PI / 5);
            ctx.fillRect(-canvas.width, -15, canvas.width * 2, 30);
            ctx.restore();
        }

        const textura = new THREE.CanvasTexture(canvas);
        textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
        textura.repeat.set(1, 3);
        return textura;
    }

    // =========================================================
    // CONSTRUCCIÓN DE GEOMETRÍA
    // =========================================================

    /**
     * Vaso: Generado mediante LatheGeometry (revolución) a partir
     * de un perfil 2D que define suelo y paredes.
     */
    crearVaso() {
        const puntos = [];
        const radio = 0.6;
        const altura = 2.4;

        puntos.push(new THREE.Vector2(0, 0));       // Centro base.
        puntos.push(new THREE.Vector2(radio, 0));   // Borde base.
        puntos.push(new THREE.Vector2(radio, altura)); // Borde superior.

        const geo = new THREE.LatheGeometry(puntos, 32);
        const mesh = new THREE.Mesh(geo, this.materialCristal);
        // renderOrder alto para asegurar que el cristal se dibuje tras el líquido.
        mesh.renderOrder = 10; 
        return mesh;
    }

    crearLiquido() {
        // El cilindro se crea con una altura base; durante la animacion solo se
        // modifica su escala vertical.
        const geo = new THREE.CylinderGeometry(0.57, 0.57, this.alturaLiquidoBase, 32);
        const liquido = new THREE.Mesh(geo, this.materialLiquido);
        liquido.position.y = this.baseLiquidoY + this.alturaLiquidoBase / 2;
        liquido.renderOrder = 1;
        return liquido;
    }

    /**
     * Limón: Modelado mediante Shape y ExtrudeGeometry.
     * Representa una rodaja con biselado (bevel) para suavizar bordes.
     */
    crearLimon() {
        const shape = new THREE.Shape();
        shape.absarc(0, 0, 0.4, 0, Math.PI * 2, false);

        const geo = new THREE.ExtrudeGeometry(shape, {
            depth: 0.06,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02
        });

        const limon = new THREE.Mesh(geo, this.materialLimon);
        limon.rotation.z = Math.PI / 2;
        limon.rotation.y = Math.PI / 2;
        limon.position.set(0, 2.3, 0.6);
        limon.renderOrder = 5;
        return limon;
    }

    /**
     * Pajita: Generada mediante TubeGeometry siguiendo una curva de Catmull-Rom.
     */
    crearPajita() {
        const puntos = [
            new THREE.Vector3(0, 0.1, 0),
            new THREE.Vector3(-0.1, 2.2, 0),
            new THREE.Vector3(0.1, 2.5, 0),
            new THREE.Vector3(0.5, 2.6, 0)
        ];
        const curva = new THREE.CatmullRomCurve3(puntos);

        const geo = new THREE.TubeGeometry(curva, 64, 0.04, 12, false);
        const pajita = new THREE.Mesh(geo, this.materialPajita);
        pajita.renderOrder = 4;

        // TubeGeometry queda abierto por los extremos; se cierran con discos
        // planos orientados con la tangente de la pajita.
        const grupo = new THREE.Group();
        const tapaInferior = this.crearTapaPajita(puntos[0], puntos[1]);
        const tapaSuperior = this.crearTapaPajita(puntos[puntos.length - 1], puntos[puntos.length - 2]);
        tapaInferior.renderOrder = 4;
        tapaSuperior.renderOrder = 4;

        grupo.add(pajita, tapaInferior, tapaSuperior);
        grupo.position.set(0.5, 0, 0);
        return grupo;
    }

    crearTapaPajita(posicion, puntoVecino) {
        const geo = new THREE.CircleGeometry(0.041, 24);
        const tapa = new THREE.Mesh(geo, this.materialPajita);
        const direccion = new THREE.Vector3().subVectors(posicion, puntoVecino).normalize();
        tapa.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direccion);
        tapa.position.copy(posicion);
        return tapa;
    }

    /**
     * Hielo: Cubos parametrizados con datos de fase para animación sinusoidal.
     */
    crearHielo(x, y, z, rotX = 0, rotY = 0, rotZ = 0, escala = 1, indice = 0) {
        const geo = new THREE.BoxGeometry(0.32, 0.52, 0.32);
        const hielo = new THREE.Mesh(geo, this.materialHielo);

        hielo.position.set(x, y, z);
        hielo.rotation.set(rotX, rotY, rotZ);
        hielo.scale.set(escala, escala, escala);
        hielo.renderOrder = 3;

        // Los hielos se reparten en cuadrantes distintos para que parezcan bloques
        // solidos y no se atraviesen entre si.
        hielo.userData = {
            baseY: y,
            anguloBase: indice * Math.PI * 0.5 + Math.PI * 0.25,
            fase: Math.random() * Math.PI * 2,
            velRot: 0.4 + Math.random() * 0.6
        };

        return hielo;
    }

    crearHielos() {
        const grupo = new THREE.Group();
        // La altura inicial varia para que no todos los hielos floten exactamente
        // en el mismo plano.
        const config = [
            [-0.18, 1.25, 0.12, 0.4, 0.2, 0.1, 1.0],
            [0.16, 1.8, -0.10, 0.2, 0.7, 0.3, 0.9],
            [0.05, 1.05, 0.20, 0.6, 0.1, 0.5, 1.1],
            [-0.10, 1.60, -0.18, 0.3, 0.5, 0.2, 0.85]
        ];

        config.forEach((c, indice) => {
            const h = this.crearHielo(...c, indice);
            this.hielos.push(h);
            grupo.add(h);
        });
        return grupo;
    }

    construir() {
        this.add(this.crearVaso());
        this.liquido = this.crearLiquido();
        this.add(this.liquido);
        this.add(this.crearHielos());
        this.add(this.crearLimon());
        this.add(this.crearPajita());
    }

    /**
     * Ciclo de actualización: Gestiona la efervescencia y la flotabilidad dinámica.
     */
    update(delta) {
        this.tiempo += delta;

        // Efervescencia: Desplazamiento de la textura de burbujas en el eje V (UV mapping).
        if (this.texturaBurbujas) {
            this.texturaBurbujas.offset.y -= delta * 0.15;
        }

        const tNivel = 0.5 + 0.5 * Math.sin(this.tiempo * 0.8);
        const alturaLiquido = THREE.MathUtils.lerp(this.alturaLiquidoMin, this.alturaLiquidoMax, tNivel);
        const escalaNivelLiquido = alturaLiquido / this.alturaLiquidoBase;
        // Al escalar y recolocar el cilindro, la base permanece en el fondo del vaso
        // y el nivel superior sube/baja.
        this.liquido.scale.y = alturaLiquido / this.alturaLiquidoBase;
        this.liquido.position.y = this.baseLiquidoY + alturaLiquido / 2;

        // Flotabilidad: Movimiento browniano simulado mediante funciones trigonométricas.
        this.hielos.forEach(hielo => {
            const { baseY, anguloBase, fase, velRot } = hielo.userData;
            const yLiquido = this.baseLiquidoY + baseY * escalaNivelLiquido;
            const angulo = anguloBase + Math.sin(this.tiempo * 0.7 + fase) * 0.08;
            const radio = this.radioOrbitaHielos + Math.sin(this.tiempo * 0.9 + fase) * this.amplitudMovimientoHielo;

            // El hielo acompaña al nivel del liquido y conserva una pequeña flotacion.
            hielo.position.y = yLiquido + Math.sin(this.tiempo * 1.4 + fase) * 0.03;
            hielo.position.x = Math.cos(angulo) * radio;
            hielo.position.z = Math.sin(angulo) * radio;

            // Rotación lenta diferencial.
            hielo.rotation.x += delta * velRot * 0.25;
            hielo.rotation.y += delta * velRot * 0.20;
        });

        for (let i = 0; i < 4; i++) {
            this.separarHielos();
            this.mantenerHielosDentroDelVaso();
        }
    }

    mantenerHielosDentroDelVaso() {
        // Limita cada hielo a un circulo interior. Se resta el radio del hielo para
        // que su volumen no atraviese la pared del vaso.
        const radioMaximoCentro = this.radioInteriorVaso - this.radioColisionHielo;

        this.hielos.forEach(hielo => {
            const distanciaCentro = Math.sqrt(
                hielo.position.x * hielo.position.x +
                hielo.position.z * hielo.position.z
            );

            if (distanciaCentro <= radioMaximoCentro) {
                return;
            }

            const direccionX = distanciaCentro > 0.0001 ? hielo.position.x / distanciaCentro : 1;
            const direccionZ = distanciaCentro > 0.0001 ? hielo.position.z / distanciaCentro : 0;

            hielo.position.x = direccionX * radioMaximoCentro;
            hielo.position.z = direccionZ * radioMaximoCentro;
        });
    }

    separarHielos() {
        // Resolucion simple de colisiones en planta: cada par de hielos se separa
        // hasta mantener una distancia minima entre centros.
        for (let i = 0; i < this.hielos.length; i++) {
            for (let j = i + 1; j < this.hielos.length; j++) {
                const hieloA = this.hielos[i];
                const hieloB = this.hielos[j];
                const dx = hieloB.position.x - hieloA.position.x;
                const dz = hieloB.position.z - hieloA.position.z;
                const distancia = Math.sqrt(dx * dx + dz * dz);

                if (distancia >= this.distanciaMinimaHielos) {
                    continue;
                }

                const direccionX = distancia > 0.0001 ? dx / distancia : 1;
                const direccionZ = distancia > 0.0001 ? dz / distancia : 0;
                const correccion = (this.distanciaMinimaHielos - distancia) * 0.5;

                hieloA.position.x -= direccionX * correccion;
                hieloA.position.z -= direccionZ * correccion;
                hieloB.position.x += direccionX * correccion;
                hieloB.position.z += direccionZ * correccion;
            }
        }
    }
}

export { Rebujito };
