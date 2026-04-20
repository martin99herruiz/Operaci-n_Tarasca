import * as THREE from 'three';

class Rebujito extends THREE.Object3D {

    constructor() {
        super();

        this.tiempo = 0;

        // ==========================================
        // MATERIALES
        // ==========================================
        
        // CRISTAL: Importante el depthWrite: false para ver el interior
        this.materialCristal = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.05,
            transmission: 0.9, 
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false 
        });

        // TEXTURA PROCEDURAL DE BURBUJAS
        this.texturaBurbujas = this.crearTexturaBurbujas();

        // LÍQUIDO ROJO: Con relieve de burbujas
        this.materialLiquido = new THREE.MeshStandardMaterial({
            color: 0xf5f2d0, 
            transparent: true,
            opacity: 0.85,
            roughness: 0.2,
            metalness: 0.1,
            bumpMap: this.texturaBurbujas,
            bumpScale: 0.02,
        });

        this.materialLimon = new THREE.MeshStandardMaterial({
            color: 0xd4e01b,
            roughness: 0.6
        });

        this.materialPajita = new THREE.MeshStandardMaterial({
            color: 0x00ffaa,
            roughness: 0.3
        });

        this.construir();
    }

    // =========================================================
    // TEXTURA DE BURBUJAS (Canvas dinámico)
    // =========================================================
    crearTexturaBurbujas() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#888888'; // Fondo neutro para BumpMap
        ctx.fillRect(0, 0, 256, 256);
        
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const r = Math.random() * 2 + 1;
            
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, '#888888');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const textura = new THREE.CanvasTexture(canvas);
        textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
        return textura;
    }

    // =========================================================
    // COMPONENTES
    // =========================================================
    
    crearVaso() {
        const puntos = [];
        const radio = 0.6;
        const altura = 2.4;
        puntos.push(new THREE.Vector2(0, 0));       
        puntos.push(new THREE.Vector2(radio, 0));    
        puntos.push(new THREE.Vector2(radio, altura)); 

        const geo = new THREE.LatheGeometry(puntos, 32);
        const mesh = new THREE.Mesh(geo, this.materialCristal);
        
        // RenderOrder alto para que el cristal se dibuje después del contenido
        mesh.renderOrder = 10; 
        return mesh;
    }

    crearLiquido() {
        const geo = new THREE.CylinderGeometry(0.57, 0.57, 1.8, 32);
        const liquido = new THREE.Mesh(geo, this.materialLiquido);
        liquido.position.y = 0.92;
        liquido.renderOrder = 1; 
        return liquido;
    }

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
        limon.rotation.x = Math.PI / 2;
        limon.rotation.y = 1;
        limon.position.set(0, 2.3, 0.6); // Posición en el borde
        limon.renderOrder = 5;
        return limon;
    }

    crearPajita() {
        const curva = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.1, 0),
            new THREE.Vector3(-0.1, 2.2, 0),
            new THREE.Vector3(0.1, 2.5, 0),
            new THREE.Vector3(0.5, 2.6, 0)
        ]);
        const geo = new THREE.TubeGeometry(curva, 64, 0.04, 12, false);
        const pajita = new THREE.Mesh(geo, this.materialPajita);
        pajita.position.set(0.2, 0, 0);
        pajita.renderOrder = 4;

        pajita.position.set(0.5, 0, 0);

        return pajita;
    }

    construir() {
        this.add(this.crearVaso());
        this.add(this.crearLiquido());
        this.add(this.crearLimon());
        this.add(this.crearPajita());
    }

    // =========================================================
    // ANIMACIÓN
    // =========================================================
    update(delta) {
        this.tiempo += delta;
        
        // Hace que las burbujas suban
        if (this.texturaBurbujas) {
            this.texturaBurbujas.offset.y -= delta * 0.15;
        }
    }
}

export { Rebujito };