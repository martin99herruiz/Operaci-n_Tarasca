---
name: "Defensa 3 #1: Cámara FP + Movimiento"
about: Implementar cámara en primera persona y movimiento del jugador
title: "Defensa 3 #1: Cámara FP + Movimiento"
labels: "defensa-3,camara"
assignees: "Martin"

---

## Objetivo

Implementar un sistema de cámara en primera persona que permita al jugador moverse por el laberinto usando teclado y controlar la dirección de la mirada con el ratón.

## Tareas

- [ ] Crear cámara perspectiva en primera persona (POV)
- [ ] Implementar controles de movimiento con teclado (avanzar/retroceder)
- [ ] Implementar control de mirada con ratón (PointerLock o similar)
- [ ] Establecer velocidad y sensibilidad de movimiento
- [ ] Integrar controles con el laberinto existente
- [ ] Probar colisiones básicas para que no atraviese paredes

## Criterios de terminado

- [ ] Compila sin errores
- [ ] Funciona en local
- [ ] Está integrado con el resto del proyecto
- [ ] No rompe funcionalidades anteriores
- [ ] Está documentado si procede

## Notas

- Utilizar `PointerLockControls` de Three.js (disponible en libs/)
- O `FirstPersonControls` si se prefiere
- La cámara debe estar en primera persona dentro del laberinto
- Sensibilidad ajustable recomendada
