---
name: "Defensa 3 #4: Sistema de Luces"
about: Implementar luces de diferentes colores con al menos una dinámica
title: "Defensa 3 #4: Sistema de Luces"
labels: "defensa-3,iluminacion"
assignees: "María"

---

## Objetivo

Implementar un sistema de iluminación con múltiples luces de diferentes colores. Al menos una debe ser dinámica (cambiar color, encenderse/apagarse, cambiar intensidad, etc.).

## Tareas

- [ ] Crear luces de al menos 3 colores diferentes (ej: roja, azul, verde/amarillo)
- [ ] Posicionar luces estratégicamente en el laberinto
- [ ] Implementar luz dinámica que cambie en el juego (color, intensidad u on/off)
- [ ] Ajustar parámetros de iluminación (intensidad, rango)
- [ ] Integrar luces con materiales del laberinto y pick-ups
- [ ] Probar iluminación en toda la escena

## Criterios de terminado

- [ ] Compila sin errores
- [ ] Funciona en local
- [ ] Está integrado con el resto del proyecto
- [ ] No rompe funcionalidades anteriores
- [ ] Está documentado si procede

## Notas

- Usar `THREE.PointLight`, `THREE.DirectionalLight` o `THREE.RectAreaLight`
- Mínimo: 1 luz dinámica que cambie cada X segundos
- Ejemplo: luz que cambie color HSL en bucle, o que parpadee
- Considerar usar `THREE.Color(0xFF0000)` para precisión de color
- Posiblemente interactuar con interruptor si se quiere añadir gameplay
