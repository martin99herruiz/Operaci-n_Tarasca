Estoy trabajando en una práctica de Sistemas Gráficos en Three.js.

Ya tengo hechos todos los pick-ups excepto las castañuelas. Necesito que me ayudes exclusivamente con ese modelo.

CONTEXTO:
El juego se llama “Operación Tarasca: Laberinto de Volantes”.
Los pick-ups ya hechos son:
- Farolillo / llave
- Abanico articulado
- Vaso de rebujito

FALTA:
Modelar unas castañuelas realistas en Three.js.

REQUISITOS PARA LAS CASTAÑUELAS:
- Deben parecer castañuelas reales, no simples óvalos planos.
- Deben tener volumen redondeado.
- Deben tener una zona interior cóncava visible.
- Deben tener aspecto de madera.
- Deben incluir cordón.
- Deben estar formadas por dos piezas enfrentadas.
- Deben poder animarse con un pequeño movimiento de golpeo entre ambas.

TÉCNICAS DE MODELADO QUE DEBEN APARECER:
- Revolución de una sección curva para crear el cuerpo principal.
- Extrusión para crear las orejas o zona del cordón.
- Sustracción/CSG o una solución geométrica equivalente para simular el hueco cóncavo interior.
- Textura o material procedural de madera.

FORMA DE RESPONDER:
- Dame código Three.js compatible con módulos ES6.
- Crea una clase `Castanuelas extends THREE.Object3D`.
- No dependas de imágenes externas si puedes crear la textura de madera con `CanvasTexture`.
- Evita modelos importados.
- Explica brevemente qué parte usa cada técnica.
- Prioriza que se vea bien y funcione sin errores.

IMPORTANTE:
No quiero una castañuela plana.
Quiero una forma redondeada tipo concha, con borde grueso, interior cóncavo y cordón visible.