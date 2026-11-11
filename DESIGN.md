---
name: Centro del viajero
description: Preparación del viaje y orientación humana en español.
colors:
  ink: "#173d41"
  muted: "#536b6d"
  paper: "#f7f8f5"
  line: "#d8e2df"
  teal: "#146b63"
  nav: "#153f43"
  soft: "#e7efeb"
  white: "#fff"
  error: "#a42f32"
  focus: "#c4893f"
  primary-hover: "#0e514b"
  input-border: "#aebfbb"
  nav-active: "#dbece5"
  trip-surface: "#e5eee7"
typography:
  display:
    fontFamily: 'Inter, "Segoe UI", sans-serif'
    fontSize: "clamp(2rem,3.5vw,3.4rem)"
    fontWeight: 550
    lineHeight: 1.15
    letterSpacing: "-.035em"
  headline:
    fontSize: "2rem"
    fontWeight: 650
    lineHeight: 1.22
    letterSpacing: "-.035em"
  title:
    fontSize: "1.25rem"
    lineHeight: 1.4
    letterSpacing: "-.02em"
  body:
    fontFamily: 'Inter, "Segoe UI", sans-serif'
    fontSize: "15px"
    lineHeight: 1.65
  label:
    fontSize: ".88rem"
    fontWeight: 550
rounded:
  status: "4px"
  input: "5px"
  button: "6px"
  table: "8px"
  panel: "10px"
  trip: "12px"
spacing:
  field-padding: "12px"
  form-grid-gap: "20px"
  form-gap: "24px"
  panel-padding: "30px"
  workspace-horizontal: "44px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.white}"
    rounded: "{rounded.button}"
    padding: "11px 18px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "11px 18px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "12px"
  navigation:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.nav}"
    rounded: "{rounded.button}"
    padding: "12px 13px"
  status:
    rounded: "{rounded.status}"
    padding: "6px 10px"
  panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.panel}"
    padding: "30px"
---

# Design System: Centro del viajero

## Overview

**Creative North Star: "Preparación clara: Operate / Read"**

Centro del viajero conserva el logo Chambiray y la dirección existente: petróleo para navegar, superficies claras para trabajar y teal para actuar. La interfaz en español reúne preparación, lectura de guías y orientación humana con una jerarquía sobria.

Operate organiza pendientes, formularios y solicitudes; Read reduce la densidad en artículos. Este documento captura la implementación del Sprint 1, sin inventar una marca ni añadir funciones de inteligencia artificial.

**Key Characteristics:**

- Navegación estable y acciones explícitas.
- Listas con divisores y guías de lectura clara.
- Estados expresados con texto y controles nativos.

## Colors

La paleta combina petróleo profundo, teal y neutros ligeramente verdosos. Los nombres conservan el vocabulario de las propiedades CSS existentes.

- nav: navegación y relato de acceso; ink: texto principal.
- teal: acciones, enlaces, checkbox y progreso; primary-hover: énfasis de acción.
- paper: fondo general; white: formularios y tablas; soft: hover secundario; line: divisores.
- muted: ayudas, metadatos y placeholders a opacidad 1; error: errores de formulario.
- focus: contorno de teclado; trip-surface: franja de viaje seleccionado.

Estados de solicitudes: NUEVA usa #f8ecd5 / #775119; ASIGNADA #e8edf6 / #3f5e83; EN_ATENCION #e1eeef / #24656b; RESUELTA #deede1 / #2e663d; CERRADA #e7ebe7 / #526552. Cada par es fondo / texto y siempre incluye una etiqueta textual. Las rampas del sidecar son muestras derivadas para el panel, no tokens implementados adicionales.

## Typography

Inter, con fallback Segoe UI y sans-serif, es una elección deliberada de aplicación funcional: facilita listas, formularios y lectura sin competir con el logo. Dos TTF locales usan font-display: swap. El CSS declara rangos 100–500 y 550–900; los pesos documentados son valores CSS, sin afirmar que los archivos sean variables.

Base de 15px. H1: 2rem, peso 650, línea 1.22; H2: 1.25rem, línea 1.4; H3: 1.04rem, línea 1.45. El destino usa 2.6rem; acceso usa clamp(2rem,3.5vw,3.4rem). Etiquetas .88rem, peso 550; botones .9rem, peso 600. Párrafos con línea 1.65. El contenedor prose declara 1.02rem, línea 1.8 y máximo 70ch, aunque sus párrafos conservan la línea global 1.65.

## Layout

Escritorio: sidebar fija de 246px, topbar de 72px, main con máximo 1500px y padding 42px 44px 60px. Dashboard: minmax(0,1.65fr) / minmax(240px,1fr), gap 42px. Franja del viaje: 1.1fr / 1fr. Acceso: 47% / 53%.

Hasta 1150px: sidebar 215px, main 32px 28px, separaciones menores. Hasta 850px: menú lateral de 246px bajo topbar sticky de 64px; cerrado utiliza visibility:hidden y translateX(-100%), excluyendo sus enlaces del teclado. Acceso pasa a una columna. Hasta 600px: dashboard, franja, formularios y casos pasan a una columna; main 28px 20px 40px; H1 1.7rem. Tablas conservan mínimo 560px dentro de overflow:auto. Desde 1600px cambia el padding del relato de acceso.

Formularios con máximo 650px, o 840px para edición extensa; gap 24px. Acceso de 430px, ampliado a 500px bajo 850px. Artículo de 760px y texto de hasta 70ch.

## Elevation & Depth

Las superficies se distinguen mediante color y bordes de 1px. Paneles habituales sin sombra. Toast: 0 8px 26px #0002; sidebar móvil abierta: 10px 0 30px #0002. Foco visible: contorno de 3px y offset 4px.

Transiciones: fondo del botón .15s, ancho del progreso .2s, transformación del menú .18s. prefers-reduced-motion elimina las transiciones y el desplazamiento suave.

## Shapes

Radios de 4px para estados, 5px para campos, 6px para botones y navegación, 8px para tablas/respuestas/toast, 10px para paneles y 12px para la franja. Avatar circular. Las filas se distinguen por divisores, sin tarjetas decorativas para cada pendiente.

## Components

- Botones primarios teal y secundarios transparentes con borde #a9bfba; mínimo 44px. Deshabilitado: opacidad .6 y cursor de espera. Controles de icono: mínimo 42px.
- Campos blancos con borde #aebfbb, padding 12px, mínimo 46px y etiqueta persistente. Placeholders muted con opacidad 1. Checkbox nativo de 21px.
- Navegación en columna con SVG de 20px, selección visible y aria-current. El botón móvil expone aria-expanded.
- Checklist con categoría y fecha. Guarda en el lugar, conservando el DOM del checkbox; actualiza contador y progreso. Check más tachado indican finalización. Ante error revierte la selección y comunica el problema.
- Guías con categoría, título, resumen, actualización y fuente. Lectura con ayuda humana al final.
- Solicitudes con tabla, estados textuales, respuestas, historial y gestión según rol.
- Feedback: error en formulario, vacío con siguiente acción, carga y toast de 5500ms. La navegación enfoca main al terminar de cargar.

Los ejemplos del sidecar son muestras visuales aisladas; no incluyen API, autenticación ni persistencia.

## Do's and Don'ts

### Do:

- Do conservar el logo original Chambiray y el nombre Centro del viajero.
- Do usar Inter como tipografía funcional y mantener etiquetas visibles.
- Do conservar foco de teclado, estados de guardado y errores.
- Do mostrar fecha, fuente y vigencia editorial cuando exista.

### Don't:

- Don't añadir decoración genérica de IA ni presentar Sprint 2 como disponible.
- Don't comunicar estados únicamente mediante color.
- Don't inventar requisitos de viaje o afirmaciones de marca.

### Extensión turIA en el inicio

El alcance actual incluye turIA, un chat no modal desplegable desde un botón flotante inferior derecho. Usa los colores y tipografía existentes, con panel compacto de 410px en escritorio y ancho adaptable en móvil. La cápsula del botón, el panel de 16px y los tamaños compactos son ajustes específicos de este componente. El selector de viaje es plegable, la conversación tiene desplazamiento propio y el campo de entrada permanece visible. Esta extensión actualiza la exclusión histórica de IA descrita en el alcance del sprint 1.
