---
name: "Defensa 3 #5: Cámara Superior"
about: Implementar vista superior del laberinto y mostrar en pantalla
title: "Defensa 3 #5: Cámara Superior"
labels: "defensa-3,camara"
assignees: "Martin"

---

## Objetivo

Crear una segunda cámara que muestre una vista superior (top-down) del laberinto completo. Mostrar ambas vistas en pantalla simultáneamente de forma legible.

## Tareas

- [ ] Crear cámara ortográfica para vista superior
- [ ] Posicionar cámara arriba del laberinto
- [ ] Configurar render target o viewport separado
- [ ] Mostrar ambas cámaras en pantalla (ej: FP en grande + mini-mapa arriba)
- [ ] Marcar posición del jugador en el mini-mapa
- [ ] Escalar y posicionar vistas para que sea visible claramente
- [ ] Probar que ambas se renderizan sin conflictos

## Criterios de terminado

- [ ] Compila sin errores
- [ ] Funciona en local
- [ ] Está integrado con el resto del proyecto
- [ ] No rompe funcionalidades anteriores
- [ ] Está documentado si procede

## Notas

- Usar viewport para dividir pantalla (ej: viewport 1 = FP full, canvas mini-mapa en esquina)
- O usar RenderTexture si se quiere más control
- Mini-mapa en esquina superior derecha recomendado (25-30% ancho pantalla)
- Mostrar posición jugador (punto/triángulo) en mini-mapa
- Posiblemente mostrar pos pick-ups pendientes de recoger
