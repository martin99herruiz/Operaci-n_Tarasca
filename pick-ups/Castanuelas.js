import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION, ADDITION } from '../libs/three-bvh-csg.js';

class Castanuelas extends THREE.Object3D {

    constructor() {
        super();

        this.tiempo = 0;
        this.rotacionActiva = true;

        // =====================================================
        // MATERIALES
        // =====================================================
        this.materialMadera = new THREE.MeshStandardMaterial({
            map: this.crearTexturaMadera(),
            roughness: 0.55,
            metalness: 0.08,
            side: THREE.DoubleSide
        });

        this.materialRelieve = new THREE.MeshStandardMaterial({
            color: 0x6f3518,
            roughness: 0.55,
            metalness: 0.05,
            side: THREE.DoubleSide
        });

        // =====================================================
        // MODELO
        // =====================================================
        const datosPerfil = this.obtenerDatosPerfil();

        const geometriaMitad = this.crearMediaRevolucionCerrada(datosPerfil);
        const geometriaConcha = this.aplicarConcavidadEsfera(geometriaMitad);

        geometriaConcha.computeBoundingBox();
        const bbox = geometriaConcha.boundingBox;

        // Grupo general de la castañuela
        this.grupoCastanuela = new THREE.Group();
        this.add(this.grupoCastanuela);

        // Pivotes para abrir/cerrar
        this.pivoteA = new THREE.Object3D();
        this.pivoteB = new THREE.Object3D();

        this.grupoCastanuela.add(this.pivoteA);
        this.grupoCastanuela.add(this.pivoteB);

        // Altura aproximada del "eje" del cordel
        const yBisagra = bbox.max.y - 0.02;

        // Creamos las dos conchas
        this.conchaA = new THREE.Mesh(geometriaConcha, this.materialMadera);
        this.conchaB = new THREE.Mesh(geometriaConcha.clone(), this.materialMadera);

        this.conchaA.castShadow = true;
        this.conchaA.receiveShadow = true;
        this.conchaB.castShadow = true;
        this.conchaB.receiveShadow = true;

        // Colocamos los pivotes en la zona superior
        this.pivoteA.position.set(0, yBisagra, 0);
        this.pivoteB.position.set(0, yBisagra, 0);

        // Añadimos las conchas a sus pivotes
        this.pivoteA.add(this.conchaA);
        this.pivoteB.add(this.conchaB);

        // Las dos mitades quedan casi enfrentadas.
        // Separación pequeña: solo para que no se atraviesen.
        this.conchaA.position.set(0, -yBisagra, -0.004);
        this.conchaB.position.set(0, -yBisagra, 0.004);

        // Una mitad normal y la otra girada 180º para quedar enfrentadas
        this.conchaA.rotation.set(0, 0, Math.PI);
        this.conchaB.rotation.set(0, Math.PI, Math.PI);

        // Apertura inicial muy pequeña
        this.pivoteA.rotation.x = 0.1;
        this.pivoteB.rotation.x = -0.1;


        // Cordeles
        this.cordeles = this.crearCordeles(bbox, yBisagra);
        this.cordeles.position.set(0, -yBisagra + 0.05, 0);
        this.grupoCastanuela.add(this.cordeles);

        this.rotation.x = THREE.MathUtils.degToRad(-8);
        this.scale.setScalar(1.0);
    }

    // =====================================================
    // PUNTOS ORIGINALES DEL PERFIL 2D
    // =====================================================
    obtenerDatosPerfil() {
        return [

            [0, 303],
            [9, 322],
            [20, 322],
            [78, 323],
            [86, 298],
            [57, 295],
            [58, 278],
            [58, 251],
            [71, 222],
            [78, 199],
            [89, 169],

            [79, 83],
            [72, 58],
            [54, 38],
            [25, 18],
            [12, 13],
            [0, 12]


        ];
    }
    // =====================================================
    // CONVERTIR PUNTOS A PERFIL DE REVOLUCIÓN
    // =====================================================
    convertirPuntos(datosPerfil) {
        const escala = 0.004;

        const origenX = datosPerfil[0][0];
        const origenY = datosPerfil[0][1];

        let puntos = datosPerfil.map(([x, y]) => new THREE.Vector2(
            Math.max(0, (x - origenX) * escala),
            (origenY - y) * escala
        ));

        puntos[0].x = 0;
        puntos[puntos.length - 1].x = 0;

        puntos = this.limpiarPuntosPerfil(puntos);

        const curva = new THREE.SplineCurve(puntos);

        // Más puntos en el perfil para que el borde sea más suave
        const perfilSuave = curva.getPoints(180);

        return perfilSuave.map(p => new THREE.Vector2(
            Math.max(0, p.x),
            p.y
        ));
    }

    areaPerfil(perfil) {
        let area = 0;

        for (let i = 0; i < perfil.length - 1; i++) {
            const p1 = perfil[i];
            const p2 = perfil[i + 1];

            area += p1.x * p2.y - p2.x * p1.y;
        }

        return area * 0.5;
    }
    limpiarPuntosPerfil(puntos) {
        const toleranciaDistancia = 0.01;
        const toleranciaColineal = 0.015;

        // 1. Eliminar puntos demasiado cercanos
        let limpios = [puntos[0]];

        for (let i = 1; i < puntos.length; i++) {
            const ultimo = limpios[limpios.length - 1];

            if (puntos[i].distanceTo(ultimo) > toleranciaDistancia) {
                limpios.push(puntos[i]);
            }
        }

        if (limpios.length < 3) {
            return limpios;
        }

        // 2. Eliminar puntos casi alineados
        const simplificados = [limpios[0]];

        for (let i = 1; i < limpios.length - 1; i++) {
            const a = simplificados[simplificados.length - 1];
            const b = limpios[i];
            const c = limpios[i + 1];

            const ab = new THREE.Vector2().subVectors(b, a).normalize();
            const bc = new THREE.Vector2().subVectors(c, b).normalize();

            const cruz = Math.abs(ab.x * bc.y - ab.y * bc.x);

            if (cruz > toleranciaColineal) {
                simplificados.push(b);
            }
        }

        simplificados.push(limpios[limpios.length - 1]);

        return simplificados;
    }
    // =====================================================
    // 1. REVOLUCIÓN CERRADA MANUAL
    // =====================================================
    crearMediaRevolucionCerrada(datosPerfil) {
        const perfil = this.convertirPuntos(datosPerfil);

        const segmentos = 220;
        const puntosPorPerfil = perfil.length;

        const vertices = [];
        const indices = [];
        const uvs = [];

        /*
         * Media revolución:
         * ángulo desde PI hasta 2PI.
         * Así nos quedamos con la mitad de Z negativa
         * y la cara plana queda en Z = 0.
         */
        const anguloInicio = Math.PI;
        const anguloTotal = Math.PI;

        // =====================================================
        // 1. VÉRTICES DE LA MEDIA REVOLUCIÓN
        // =====================================================
        for (let i = 0; i <= segmentos; i++) {
            const u = i / segmentos;
            const angulo = anguloInicio + u * anguloTotal;

            const cos = Math.cos(angulo);
            const sin = Math.sin(angulo);

            for (let j = 0; j < puntosPorPerfil; j++) {
                const v = j / (puntosPorPerfil - 1);

                const radio = perfil[j].x;
                const altura = perfil[j].y;

                const x = radio * cos;
                const y = altura;
                const z = radio * sin;

                vertices.push(x, y, z);
                uvs.push(u, v);
            }
        }

        // =====================================================
        // 2. CARAS CURVAS EXTERIORES
        // =====================================================
        for (let i = 0; i < segmentos; i++) {
            for (let j = 0; j < puntosPorPerfil - 1; j++) {
                const a = i * puntosPorPerfil + j;
                const b = (i + 1) * puntosPorPerfil + j;
                const c = (i + 1) * puntosPorPerfil + j + 1;
                const d = i * puntosPorPerfil + j + 1;

                indices.push(a, d, b);
                indices.push(b, d, c);
            }
        }

        // =====================================================
        // 3. CERRAR LA CARA PLANA DE LA SECCIÓN
        // =====================================================
        const inicio = 0;
        const fin = segmentos;

        for (let j = 0; j < puntosPorPerfil - 1; j++) {
            const a = inicio * puntosPorPerfil + j;
            const b = inicio * puntosPorPerfil + j + 1;
            const c = fin * puntosPorPerfil + j;
            const d = fin * puntosPorPerfil + j + 1;

            indices.push(a, c, b);
            indices.push(c, d, b);
        }

        const geometria = new THREE.BufferGeometry();

        geometria.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(vertices, 3)
        );

        geometria.setAttribute(
            'uv',
            new THREE.Float32BufferAttribute(uvs, 2)
        );

        geometria.setIndex(indices);

        geometria.computeVertexNormals();
        geometria.computeBoundingBox();
        geometria.computeBoundingSphere();

        return geometria;
    }

    suavizarGeometria(geometria, tolerancia = 0.0001) {
        const g = geometria.toNonIndexed();

        const pos = g.attributes.position.array;
        const uvAttr = g.attributes.uv;

        const mapa = new Map();
        const nuevosVertices = [];
        const nuevosUVs = [];
        const indices = [];

        const clave = (x, y, z) => {
            return `${Math.round(x / tolerancia)}_${Math.round(y / tolerancia)}_${Math.round(z / tolerancia)}`;
        };

        for (let i = 0; i < pos.length; i += 3) {
            const x = pos[i];
            const y = pos[i + 1];
            const z = pos[i + 2];

            const k = clave(x, y, z);

            let index;

            if (mapa.has(k)) {
                index = mapa.get(k);
            } else {
                index = nuevosVertices.length / 3;
                mapa.set(k, index);

                nuevosVertices.push(x, y, z);

                if (uvAttr) {
                    const uvIndex = (i / 3) * 2;
                    nuevosUVs.push(
                        uvAttr.array[uvIndex],
                        uvAttr.array[uvIndex + 1]
                    );
                }
            }

            indices.push(index);
        }

        const resultado = new THREE.BufferGeometry();

        resultado.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(nuevosVertices, 3)
        );

        if (nuevosUVs.length > 0) {
            resultado.setAttribute(
                'uv',
                new THREE.Float32BufferAttribute(nuevosUVs, 2)
            );
        }

        resultado.setIndex(indices);

        resultado.computeVertexNormals();
        resultado.computeBoundingBox();
        resultado.computeBoundingSphere();

        return resultado;
    }

    // =====================================================
    // 2. CSG: CORTAR LA REVOLUCIÓN PARA QUEDARSE CON MEDIA
    // =====================================================
    aplicarCorteCSG(geometriaOriginal) {
        geometriaOriginal.computeBoundingBox();

        const caja = geometriaOriginal.boundingBox;
        const tam = new THREE.Vector3();
        const centro = new THREE.Vector3();

        caja.getSize(tam);
        caja.getCenter(centro);

        const materialTemporal = new THREE.MeshBasicMaterial();

        const pieza = new Brush(geometriaOriginal, materialTemporal);
        pieza.updateMatrixWorld(true);

        // Caja que elimina la mitad positiva de Z
        const profundidadCorte = tam.z + 0.05;

        const cajaCorteGeo = new THREE.BoxGeometry(
            tam.x * 3.0,
            tam.y * 3.0,
            profundidadCorte
        );

        const cajaCorte = new Brush(cajaCorteGeo, materialTemporal);

        cajaCorte.position.set(
            centro.x,
            centro.y,
            centro.z + profundidadCorte / 2
        );

        cajaCorte.updateMatrixWorld(true);

        const evaluador = new Evaluator();

        const resultado = evaluador.evaluate(
            pieza,
            cajaCorte,
            SUBTRACTION
        );

        resultado.geometry.computeVertexNormals();
        resultado.geometry.computeBoundingBox();
        resultado.geometry.computeBoundingSphere();

        return resultado.geometry;
    }

    // =====================================================
    // 2B. CSG: RESTAR ESFERA AL CUERPO PRINCIPAL
    // =====================================================
    aplicarConcavidadEsfera(geometriaOriginal) {
        geometriaOriginal.computeBoundingBox();

        const bbox = geometriaOriginal.boundingBox;
        const tam = new THREE.Vector3();
        const centro = new THREE.Vector3();

        bbox.getSize(tam);
        bbox.getCenter(centro);

        const materialTemporal = new THREE.MeshBasicMaterial();

        const brushCuerpo = new Brush(geometriaOriginal, materialTemporal);
        brushCuerpo.updateMatrixWorld(true);

        /*
         * Cara plana de la sección.
         * Como hemos cortado la mitad positiva de Z,
         * la cara visible queda en bbox.max.z.
         */
        const caraSeccionZ = bbox.max.z;

        /*
         * Posición vertical del hueco.
         * Puedes ajustar el 0.52:
         * - menor valor: hueco más arriba
         * - mayor valor: hueco más abajo
         */
        const centroHuecoY = bbox.min.y + tam.y * 0.62;

        /*
         * Radio de la esfera.
         * Debe ser grande respecto al ancho de la pieza
         * para que el hueco sea suave y amplio.
         */
        const radioEsfera = tam.x * 0.72;

        const geometriaEsfera = new THREE.SphereGeometry(
            radioEsfera,
            66,
            64
        );

        const brushEsfera = new Brush(geometriaEsfera, materialTemporal);

        /*
         * Escala de la esfera:
         * X: anchura del hueco
         * Y: altura del hueco
         * Z: profundidad del corte
         */
        brushEsfera.scale.set(
            0.85,
            1.18,
            0.75
        );

        /*
         * Profundidad real de entrada de la esfera dentro del cuerpo.
         * Más alto = hueco más profundo.
         */
        const profundidadEntrada = radioEsfera * 0.38;

        /*
         * Colocamos la esfera por delante de la cara cortada.
         * Su parte trasera entra dentro de la castañuela.
         */
        brushEsfera.position.set(
            0,
            centroHuecoY,
            caraSeccionZ + radioEsfera - profundidadEntrada
        );

        brushEsfera.updateMatrixWorld(true);

        const evaluador = new Evaluator();

        const resultado = evaluador.evaluate(
            brushCuerpo,
            brushEsfera,
            SUBTRACTION
        );

        return this.suavizarGeometria(resultado.geometry);
    }

    crearCordeles(bbox, yBisagra) {
        const grupo = new THREE.Group();

        const materialCordel = new THREE.MeshStandardMaterial({
            color: 0x3a1608,
            roughness: 0.9,
            metalness: 0.0
        });

        // Separación lateral de los cordeles
        const xLado = bbox.max.x * 0.45;

        // Separación entre las dos mitades
        const zA = -0.18;
        const zB = 0.18;

        // Cordel más grande y visible
        const alturaArco = 0.16;
        const radioCordel = 0.012;

        // Cordel izquierdo
        const curvaIzq = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-xLado, yBisagra - 0.015, zA),
            new THREE.Vector3(-xLado * 0.8, yBisagra + alturaArco, 0),
            new THREE.Vector3(-xLado, yBisagra - 0.015, zB)
        ]);

        const geoIzq = new THREE.TubeGeometry(curvaIzq, 48, radioCordel, 14, false);
        const cordelIzq = new THREE.Mesh(geoIzq, materialCordel);

        // Cordel derecho
        const curvaDer = new THREE.CatmullRomCurve3([
            new THREE.Vector3(xLado, yBisagra - 0.015, zA),
            new THREE.Vector3(xLado * 0.8, yBisagra + alturaArco, 0),
            new THREE.Vector3(xLado, yBisagra - 0.015, zB)
        ]);

        const geoDer = new THREE.TubeGeometry(curvaDer, 48, radioCordel, 14, false);
        const cordelDer = new THREE.Mesh(geoDer, materialCordel);

        cordelIzq.castShadow = true;
        cordelIzq.receiveShadow = true;
        cordelDer.castShadow = true;
        cordelDer.receiveShadow = true;

        grupo.add(cordelIzq);
        grupo.add(cordelDer);

        return grupo;
    }
    // =====================================================
    // TEXTURA PROCEDURAL DE MADERA
    // =====================================================
    crearTexturaMadera() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;

        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#8b4a20';
        ctx.fillRect(0, 0, 512, 512);

        for (let i = 0; i < 90; i++) {
            const x = Math.random() * 512;

            ctx.strokeStyle = `rgba(60, 25, 8, ${0.08 + Math.random() * 0.15})`;
            ctx.lineWidth = 1 + Math.random() * 4;

            ctx.beginPath();
            ctx.moveTo(x, 0);

            for (let y = 0; y <= 512; y += 15) {
                ctx.lineTo(
                    x + Math.sin(y * 0.035 + i) * 20,
                    y
                );
            }

            ctx.stroke();
        }

        for (let i = 0; i < 25; i++) {
            ctx.strokeStyle = `rgba(180, 100, 40, ${0.05 + Math.random() * 0.08})`;
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.ellipse(
                Math.random() * 512,
                Math.random() * 512,
                40 + Math.random() * 80,
                10 + Math.random() * 25,
                Math.random() * Math.PI,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }

        const textura = new THREE.CanvasTexture(canvas);
        textura.wrapS = THREE.RepeatWrapping;
        textura.wrapT = THREE.RepeatWrapping;
        textura.repeat.set(2, 2);
        textura.needsUpdate = true;

        return textura;
    }

    // =====================================================
    // ANIMACIÓN / INTERFAZ
    // =====================================================
    update(delta) {
        this.tiempo += delta;

        // giro general de exposición
        if (this.rotacionActiva) {
            this.rotation.y += delta * 0.45;
        }

    }

    setRotacionActiva(valor) {
        this.rotacionActiva = valor;
    }

    setLuzActiva(valor) {
        // Las castañuelas no tienen luz propia.
    }
}

export { Castanuelas };