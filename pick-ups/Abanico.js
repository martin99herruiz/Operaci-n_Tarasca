import * as THREE from 'three';

/**
 * Clase Abanico
 * Representa un objeto paramétrico articulado compuesto por varillas rígidas
 * y secciones de tela dinámicas que se recalculan según el ángulo de apertura.
 */
class Abanico extends THREE.Object3D {

    constructor() {
        super();

        // --- CONFIGURACIÓN DE TEXTURAS ---
        const texturaColor = this.cargarTexturaRepetida('../imgs/tela.jpeg', 2, 2);
        const texturaMadera = this.cargarTexturaRepetida('../imgs/wood.jpg', 1.2, 3.5);
        const texturaRelieveTela = new THREE.CanvasTexture(this.crearRelieveTela());
        texturaRelieveTela.wrapS = THREE.RepeatWrapping;
        texturaRelieveTela.wrapT = THREE.RepeatWrapping;
        texturaRelieveTela.repeat.set(4, 4);

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

        // --- DEFINICIÓN DE MATERIALES ---
        
        this.materialVarilla = new THREE.MeshStandardMaterial({
            color: 0x8a4a1f,
            map: texturaMadera,
            roughness: 0.62,
            metalness: 0.0
        });

        this.materialTela = new THREE.MeshStandardMaterial({
            color: 0xf8efd8,
            map: texturaColor,
            // Configuración oficial según la diapositiva L8:
            normalMap: texturaRelieveTela,
            normalScale: new THREE.Vector2(2.8, 2.8), 
            roughness: 0.82,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        this.materialBorde = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            roughness: 0.32,
            metalness: 0.65
        });

        // --- INICIALIZACIÓN DE ESTRUCTURA ---
        this.grupo = new THREE.Object3D();
        this.add(this.grupo);
        this.modulos = [];

        this.userData.recogible = true; 
        this.recogido = false;

        this.velocidadHuida = 1.8; // metros por segundo
        this.distanciaMiedo = 2; // Distancia a la que el abanico empieza a correr
        this.direccionHuida = new THREE.Vector3();
        this.rayoParedes = new THREE.Raycaster();
        this.rayoParedes.far = 0.5;

        this.construir();
        this.actualizar();
    }

    cargarTexturaRepetida(ruta, repeatX = 1, repeatY = 1) {
        const textura = new THREE.TextureLoader().load(ruta);
        textura.wrapS = THREE.RepeatWrapping;
        textura.wrapT = THREE.RepeatWrapping;
        textura.repeat.set(repeatX, repeatY);
        textura.colorSpace = THREE.SRGBColorSpace;
        return textura;
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
        c.width = c.height = 256;
        const ctx = c.getContext('2d');
        
        // Base neutra de Normal Map
        ctx.fillStyle = '#8080ff'; 
        ctx.fillRect(0, 0, 256, 256);
        
        // Dibujamos estrías tridimensionales alternando inclinaciones de vectores (Rojo y Verde)
        for (let i = 0; i < 256; i += 8) {
            // Inclinación hacia la izquierda/arriba (Tonos rosados/magentas)
            ctx.fillStyle = '#b060ff';
            ctx.fillRect(i, 0, 4, 256);
            ctx.fillRect(0, i, 256, 4);
            
            // Inclinación hacia la derecha/abajo (Tonos verdosos/cianes)
            ctx.fillStyle = '#50a0ff';
            ctx.fillRect(i + 4, 0, 4, 256);
            ctx.fillRect(0, i + 4, 256, 4);
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

    update(delta = 0, playerPos = null) {
        const segundos = delta > 10 ? delta / 1000 : delta;
        this.tiempo += segundos;

        // 1. Giro sobre sí mismo de exposición (lo que ya tenías)
        if (this.rotacionActiva) {
            this.rotation.y += 0.5 * segundos;
        }

        // 2. Animación de abrir/cerrar el abanico (lo que ya tenías)
        if (this.animacionActiva) {
            const t = 0.5 + 0.5 * Math.sin(this.tiempo);
            this.anguloActual = this.anguloMin + t * (this.anguloMax - this.anguloMin);
            this.actualizar();
        }

        // =====================================================
        // 3. LOGICA EXTRA: IA DE HUIDA COBARDE (NUEVO)
        // =====================================================
        // Si ya ha sido recogido o no sabemos dónde está el jugador, no hacemos nada
        if (this.recogido || !playerPos) return;

        // Calculamos la distancia geométrica en el espacio 3D (Lección 6, Pág. 27)
        const distanciaAlJugador = this.position.distanceTo(playerPos);

        // Si el jugador entra dentro de su radio de miedo... ¡a correr!
        if (distanciaAlJugador < this.distanciaMiedo) {
            
            // A) Calculamos el vector de dirección: PosiciónAbanico - PosiciónJugador
            // Esto nos da un vector que apunta exactamente en sentido opuesto a ti
            this.direccionHuida.subVectors(this.position, playerPos);
            
            // B) Anulamos el eje Y para evitar que el abanico flote hacia el cielo o se hunda en el suelo
            this.direccionHuida.y = 0;
            
            // C) Normalizamos el vector para que su longitud sea exactamente 1 (Lección 6, Pág. 30)
            this.direccionHuida.normalize();

            // =====================================================
            // NUEVO: MOVIMIENTO CONTROLADO POR EL LABERINTO (L6)
            // =====================================================
            const espacioAvance = this.velocidadHuida * segundos;
            
            // 1. Calculamos la posición virtual a la que quiere huir
            const nuevaPosicion = this.position.clone();
            nuevaPosicion.x += this.direccionHuida.x * espacioAvance;
            nuevaPosicion.z += this.direccionHuida.z * espacioAvance;

            // 2. Accedemos a la escena global para usar la física del mapa
            const escenaGlobal = window.gameScene;

            // 1. Pasamos el test predictivo: ¿está libre el pasillo en línea recta?
            if (escenaGlobal && escenaGlobal.model && escenaGlobal.model.puedeMoverseA(nuevaPosicion, 0.3)) {
                
                // SI ESTÁ LIBRE: Avanza normalmente en línea recta huyendo de ti
                this.position.x = nuevaPosicion.x;
                this.position.z = nuevaPosicion.z;

                // Se orienta mirando hacia donde corre
                this.lookAt(
                    this.position.x + this.direccionHuida.x,
                    this.position.y,
                    this.position.z + this.direccionHuida.z
                );

            } else {
                // =====================================================
                // ¡ALERTA DE MURO!: El abanico ha chocado, calculamos nueva ruta
                // =====================================================
                
                // Intentamos buscar un desvío rotando el vector de huida 90º o -90º (izquierda o derecha)
                // Elegimos al azar si intentar primero girar a la izquierda o a la derecha
                const girarALaDerecha = Math.random() > 0.5;
                const anguloGiro = girarALaDerecha ? Math.PI / 2 : -Math.PI / 2;

                // Clonamos nuestra dirección actual y le aplicamos la rotación en el plano horizontal (X, Z)
                const direccionDesvio = this.direccionHuida.clone();
                direccionDesvio.applyAxisAngle(new THREE.Vector3(0, 1, 0), anguloGiro);

                // Calculamos una NUEVA posición candidata de escape hacia ese lado
                const posicionDesvio = this.position.clone();
                posicionDesvio.x += direccionDesvio.x * espacioAvance;
                posicionDesvio.z += direccionDesvio.z * espacioAvance;

                // Probamos si este nuevo pasillo lateral está libre de muros
                if (escenaGlobal && escenaGlobal.model && escenaGlobal.model.puedeMoverseA(posicionDesvio, 0.15)) {
                    
                    // ¡Encontró salida! Actualizamos la posición hacia el pasillo libre
                    this.position.x = posicionDesvio.x;
                    this.position.z = posicionDesvio.z;

                    // IMPORTANTE: Sobrescribimos la dirección de huida original por la nueva 
                    // para que el abanico recuerde en el siguiente frame que ahora corre por este pasillo
                    this.direccionHuida.copy(direccionDesvio);

                    // Orientamos el objeto hacia su nuevo camino
                    this.lookAt(
                        this.position.x + this.direccionHuida.x,
                        this.position.y,
                        this.position.z + this.direccionHuida.z
                    );
                } else {
                    // Si el pasillo lateral también estaba bloqueado (una esquina cerrada sin salida),
                    // probamos el lado contrario inmediatamente para dar la vuelta completa
                    const direccionInversa = direccionDesvio.clone().negate();
                    
                    const posicionInversa = this.position.clone();
                    posicionInversa.x += direccionInversa.x * espacioAvance;
                    posicionInversa.z += direccionInversa.z * espacioAvance;

                    if (escenaGlobal && escenaGlobal.model && escenaGlobal.model.puedeMoverseA(posicionInversa, 0.15)) {
                        this.position.x = posicionInversa.x;
                        this.position.z = posicionInversa.z;
                        this.direccionHuida.copy(direccionInversa);
                        
                        this.lookAt(
                            this.position.x + this.direccionHuida.x,
                            this.position.y,
                            this.position.z + this.direccionHuida.z
                        );
                    }
                    // Si está acorralado por los 3 lados, se parará pacientemente hasta que lo alcances
                }
            }
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
