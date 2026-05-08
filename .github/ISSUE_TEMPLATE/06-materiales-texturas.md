---
name: "Defensa 3 #6: Materiales + Texturas"
about: Implementar materiales con color, texturas y relieve
title: "Defensa 3 #6: Materiales + Texturas"
labels: "defensa-3,materiales"
assignees: "María"

---

## Objetivo

Crear materiales variados para el laberinto y elementos: con color base, con texturas en canal de color, y al menos un material con textura en canal de relieve (normal map o bump map).

## Tareas

- [ ] Crear al menos 3 materiales basados en color (MeshPhongMaterial, MeshStandardMaterial)
- [ ] Implementar texturas para canal de color (diffuse/albedo) en paredes/piso
- [ ] Implementar texture de relieve (normal map o bump map) en al menos 1 material
- [ ] Aplicar materiales al laberinto y elementos principales
- [ ] Generar o cargar texturas (pueden ser procedurales con Canvas si no hay imágenes)
- [ ] Ajustar parámetros (roughness, metalness si usas StandardMaterial)
- [ ] Validar que texturas se ven correctamente con iluminación

## Criterios de terminado

- [ ] Compila sin errores
- [ ] Funciona en local
- [ ] Está integrado con el resto del proyecto
- [ ] No rompe funcionalidades anteriores
- [ ] Está documentado si procede

## Notas

- Usar `MeshPhongMaterial` o `MeshStandardMaterial` de Three.js
- Canales: `map` (color), `normalMap` (relieve), `bumpMap` (relieve alternativo)
- Texturas pueden ser:
  - Importadas (jpg/png de carpeta imgs/)
  - Generadas proceduralmente con `CanvasTexture`
- Considerar paredes de piedra, madera, metal, etc.
- Escala UV importante para que se vea bien
