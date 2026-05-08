---
name: "Defensa 3 #3: Animaciones + Puerta Salida"
about: Animar pick-ups articulados y puerta de salida
title: "Defensa 3 #3: Animaciones + Puerta Salida"
labels: "defensa-3,animacion"
assignees: "Martin"

---

## Objetivo

Implementar animaciones continuas para los pick-ups articulados y crear el sistema de apertura de la puerta de salida cuando se cumplan las condiciones.

## Tareas

- [ ] Animar pick-ups articulados con movimiento continuo (rotación/articulación)
- [ ] Crear modelo de puerta con mecanismo de apertura
- [ ] Implementar animación de apertura de puerta (rotación o traslación)
- [ ] Vincular apertura puerta a: (todos pick-ups recogidos) AND (click en pomo)
- [ ] Implementar validacion de distancia para click en pomo (~3-5 unidades)
- [ ] Feedback visual de interacción con pomo

## Criterios de terminado

- [ ] Compila sin errores
- [ ] Funciona en local
- [ ] Está integrado con el resto del proyecto
- [ ] No rompe funcionalidades anteriores
- [ ] Está documentado si procede

## Notas

- Usar `THREE.AnimationClip` o Tween.js para animaciones
- Pick-ups deben animar en loop infinito
- Puerta solo se abre si: (todos recogidos) AND (click del usuario)
- Animación puerta debe ser suave (~500-1000ms)
- Considerar pomo como zona interaccionable pequeña
