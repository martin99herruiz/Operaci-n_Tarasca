---
name: "Defensa 3 #2: Sistema de Recogida"
about: Implementar sistema de colisión y recogida de pick-ups
title: "Defensa 3 #2: Sistema de Recogida"
labels: "defensa-3,interaccion"
assignees: "María"

---

## Objetivo

Implementar un sistema de detección de colisiones y recogida de pick-ups mediante clicks del ratón. El jugador solo podrá coger pick-ups si está lo suficientemente cerca.

## Tareas

- [ ] Configurar esferas/zonas de colisión para cada pick-up
- [ ] Implementar raycasting desde la cámara para detectar clicks
- [ ] Crear listener para clicks del ratón
- [ ] Detectar distancia jugador-pick-up para validar recogida
- [ ] Implementar lógica de recogida (eliminar objeto de escena, contador)
- [ ] Validar que todos los pick-ups hayan sido recogidos

## Criterios de terminado

- [ ] Compila sin errores
- [ ] Funciona en local
- [ ] Está integrado con el resto del proyecto
- [ ] No rompe funcionalidades anteriores
- [ ] Está documentado si procede

## Notas

- Usar Raycaster de Three.js para detectar intersecciones
- Distancia mínima recomendada: ~3-5 unidades
- Implementar feedback visual (cambio color, sonido si procede)
- Contador de pick-ups recogidos para validar apertura puerta
