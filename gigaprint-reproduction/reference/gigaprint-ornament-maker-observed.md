# GigaPrint reference capture — Christmas Ornament Maker

Status: captured from the publicly rendered GigaPrint page at `https://gigaprint.app/#ornament` on 2026-11-16. This is an observation of browser-visible UI, not the original source code or server implementation.

## Page identity and layout observed

- Tool name: Adornos navideños / Christmas Ornament Maker.
- Public route linked from the catalog: `/christmas-ornament-maker`.
- Main layout in the supplied reference screenshot: narrow, scrollable left configuration column; large 3D viewport to the right; top navigation; printer selector and bed dimensions; viewport camera controls; bottom model/export controls.
- Example viewport shows 9 pieces, including the formed ornament halves, lattice/design components, press components and scale references. The viewport exposes explode/assemble, IDs, bed fit, infill, joint check, section plane, anchors, rotate, print layout, wall/parts view and scale reference.
- Output actions observed: print plate, color 3MF, download 3MF + STL ZIP. The general site also describes per-part STL and multicolor 3MF output.

## Configuration steps captured

### 01 — Forma del adorno

- Mode: Adorno + prensa; Impresión plana; Prensa; Mitad formada; Adorno.
- Ornament shapes: Bola, Huevo, Remate de cebolla, Campana, Estrella, Corazón, Árbol, Bastón de caramelo, Pato, Cerdo.
- Alternate lithophane ornament shortcut for C7/C9/mini/fairy lights.
- Size presets: Mini 60 mm, Mediano 80 mm, Grande 100 mm, Personalizado.
- Custom size in mm (widest dimension).
- Press depth control; explanation says deeper forming stretches the lattice more and makes it thinner.

### 02 — Malla

- Lattice patterns: Panal, Diamante, Agujeros redondos, Cuadrícula cuadrada, Triángulos.
- Dimensions: Grosor de la malla (mm), Ancho de línea (mm), Tamaño del agujero (mm).
- Explanation: flat disk is sized to cover the mold with a flat flange; thicker 2.4 mm rim holds shape and joins halves.

### 03 — Diseño

- Built-in patterns: Copo de nieve, Estrella, Árbol, Corazón, Bastón de caramelo, Campana, Regalo, Muñeco de nieve, Cara de pato, Cara de cerdo, Feliz Navidad, Alegría, Navidad, Rayas de caramelo.
- Custom options: Tu texto, Tu imagen (PRO), Celosía lisa.
- Text input with line break support using slash; optional name/date.
- Image/SVG upload and threshold control.
- Shape styles: Redonda, Grueso, Suave.
- Design size control.
- Placement: Incrustado en la celosía / Sobre la celosía.
- Predistorsionar para la cúpula toggle; explanation describes compensating for stretch and mirroring the design.
- Diseño en ambas mitades / Mitad trasera lisa.

### 04 — Colores

- Independent colors for Celosía, Diseño and Prensa.
- Preset colors: Rojo, Blanco, Oro, Verde, Plata, Azul hielo, Morado, Negro, Amarillo, Rosa.
- Custom color input for each component.
- UI explains that lattice and design are separate parts/materials in the 3MF.

### 05 — Prensa y unión

- Holgura de prensa (mm).
- Join type: Espigas y agujeros / Bordes planos (pegamento).
- Bucle para colgar en la parte superior toggle.
- Displayed computed summary includes press clearance, rim dimensions, pin/hole dimensions, cavity block size, estimated stretch, hole count, number of plates and watertight status.
- Instruction sequence: Imprimir, Cargar la prensa, Calentar, Prensa, Repetir y unir.
- Safety notes for heat gun/hair dryer, heat-resistant surface, hot nozzle and PLA/PETG softening.

## 3D viewport controls observed

- Camera: 3D, Frente, Arriba, Lado, Alambre, Ajuste, home/reset.
- Explode distance slider and Ensamblar.
- IDs, Verificación de cama, Relleno, Verificación de uniones.
- Section axis X/Y/Z and section-position slider.
- Anchors, rotate, print layout, wall/parts view.
- Wall color selector.
- Scale reference selector (coin, toy minifigure, AA battery, mug, can, phone, ball, cat, beagle, child, adult, horse, elephant, giraffe).
- View shows realistic scale references; those are viewport-only and not exported.

## What is not known from the rendered page

- Original private source code, internal geometry algorithms, backend services, exact dependency versions, and server-side implementation are not exposed by this browser-visible capture.
- Exact default values for every control are not reliably present in the text extraction; do not invent them.
- A matching UI alone is not a functional clone. The lattice generation, forming deformation, pins/holes, multi-part solids, plate packing, watertight validation and 3MF metadata/material assignments must be implemented and tested separately.

## Implementation rule

Use this reference as the source of truth for the Ornament Maker page. Do not substitute a generic box or generic dimension panel. Keep each observed control and its grouping; label any unimplemented operation honestly until its geometry/export pipeline is implemented.
