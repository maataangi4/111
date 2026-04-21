# Canspace CRM — Documentación Técnica del Sistema
### Versión 1.0 — Abril 2026

---

> **Propósito de este documento**
> Descripción técnica completa del CRM Canspace para gestión de cultivos de cannabis medicinal,
> cubriendo arquitectura, flujos operativos, parámetros técnicos y lógica de datos.
> Destinado a uso interno del equipo de desarrollo y como base para la redacción de TDR.

---

## Índice

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Arquitectura General](#2-arquitectura-general)
3. [Módulos del Sistema](#3-módulos-del-sistema)
4. [Flujo Completo de Cultivo](#4-flujo-completo-de-cultivo)
5. [Sistema de Identificación: Pulseras, QR e IDs](#5-sistema-de-identificación-pulseras-qr-e-ids)
6. [Sistema de Planta Madre y Clonado](#6-sistema-de-planta-madre-y-clonado)
7. [División de Lotes (Split)](#7-división-de-lotes-split)
8. [Parámetros Técnicos Completos](#8-parámetros-técnicos-completos)
9. [Diario Continuo (Audit Trail)](#9-diario-continuo-audit-trail)
10. [Pipeline Post-Cosecha](#10-pipeline-post-cosecha)
11. [Indicadores en Tarjetas de Cultivo](#11-indicadores-en-tarjetas-de-cultivo)
12. [Otros Módulos del Dashboard](#12-otros-módulos-del-dashboard)
13. [Cumplimiento Legal](#13-cumplimiento-legal)
14. [Estado Actual y Limitaciones](#14-estado-actual-y-limitaciones)

---

## 1. Stack Tecnológico

| Componente | Tecnología | Versión |
|---|---|---|
| Framework UI | React | 19.2.4 |
| Lenguaje | TypeScript | 5.9.3 |
| Build tool | Vite | 8.0.1 |
| Estilos | Tailwind CSS | 4.2.2 |
| Estado global | Zustand (con persistencia localStorage) | 5.0.12 |
| Animaciones | Framer Motion | 12.38.0 |
| Íconos | Lucide React | 1.7.0 |
| Drag & Drop | @dnd-kit (core, sortable, utilities) | — |
| OCR (pulseras) | Tesseract.js | 7.0.0 |
| IA fitosanitaria | Google Gemini API (gemini-2.5-flash-lite) | — |
| Esquema DB (ref.) | Prisma + PostgreSQL | — |
| Internacionalización | Español + Ruso | — |

**Variables de entorno requeridas:**
```
VITE_GEMINI_API_KEY     → API key de Google Gemini (requerida para clínica fitosanitaria)
VITE_GEMINI_MODEL       → Modelo a usar (opcional, default: gemini-2.5-flash-lite)
```

---

## 2. Arquitectura General

### 2.1 Tipo de aplicación

Canspace es una **SPA (Single Page Application) frontend-only**. Actualmente no tiene backend propio. Todo el estado se persiste en `localStorage` del navegador mediante Zustand.

Existe un esquema Prisma/PostgreSQL de referencia preparado (`prisma/schema.prisma`) para una futura integración con backend, pero no está conectado en esta versión.

### 2.2 Estructura de carpetas

```
src/
├── components/
│   ├── cultivo/          → 23 componentes del módulo de cultivo
│   ├── tabs/             → 14 tabs principales del dashboard
│   ├── ui/               → 6 componentes UI reutilizables
│   ├── agronomy/         → Banco de genética y perfiles de cepas
│   ├── diario/           → Registro de actividades
│   ├── location/         → Topología de salas/mesas/niveles
│   ├── settings/         → Configuración del sistema
│   ├── socios/           → Gestión de equipo/pacientes
│   ├── traceability/     → Trazabilidad de lotes (LinajeDelLote)
│   └── branding/         → Logo y marca
├── store/
│   ├── useCultivationStore.ts      → Store principal de cultivo
│   ├── cultivationTypes.ts         → Todos los tipos TypeScript
│   ├── useCrmStore.ts              → Empleados, stock, documentos
│   ├── useLocationTopologyStore.ts → Salas y mesas
│   ├── useSettingsStore.ts         → Configuración
│   ├── useSociosStore.ts           → Socios/pacientes
│   └── useStrainsStore.ts          → Banco de cepas
├── lib/                  → Utilidades y helpers (30+ archivos)
├── data/                 → Perfiles de cepas y síntomas (estático)
└── i18n/                 → Traducciones ES/RU
```

### 2.3 Persistencia de datos

- **Motor:** Zustand con middleware de persistencia JSON en `localStorage`
- **Límite:** Limitado por el almacenamiento del navegador (~5–10 MB)
- **Riesgo:** Las imágenes y fotos se guardan como base64 (Data URLs), lo que puede saturar el storage rápidamente con muchos registros fotográficos
- **Sin sincronización cross-device:** Los datos solo existen en el navegador donde se ingresaron

---

## 3. Módulos del Sistema

El dashboard tiene una barra lateral de navegación con los siguientes módulos:

| ID | Módulo | Descripción |
|---|---|---|
| `dashboard` | Dashboard principal | Widgets de resumen: producción, trazabilidad, alertas |
| `genetics` | Banco de Genética | Librería de cepas con perfiles fitoquímicos |
| `cultivo` | Cultivo | Kanban por etapas: Propagación → Veg → Floración → Cosecha + Post-cosecha |
| `inventory` | Stock | Inventario de producto terminado con precios ARS/USDT |
| `socios` | Socios | Gestión de equipo y pacientes (REPROCANN) |
| `movimientos` | Movimientos | Registro de actividad y transacciones |
| `tools` | Herramientas | OCR con cámara, utilidades |
| `settings` | Configuración | Perfil, empresa, salas, suscripción |

> **Nota:** El módulo de Post-Cosecha fue integrado directamente dentro del tab Cosecha del módulo Cultivo (ya no aparece como sección separada en el sidebar).

---

## 4. Flujo Completo de Cultivo

El núcleo del sistema es el **módulo Cultivo**, organizado como un kanban de 4 etapas:

```
Propagación → Vegetación → Floración → Cosecha
                                           ↓
                                    Post-Cosecha Pipeline
                                  Secado → Curado → Stock
```

---

### 4.1 Etapa 1: Propagación (Germinación / Clonado)

**Descripción:** Punto de entrada del ciclo. Representa semillas en germinación o clones en enraizamiento. Las unidades aún **no tienen pulsera asignada** en esta etapa.

**Datos capturados al crear un lote/planta:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| Cepa (strain) | autocomplete | Sí | Vinculado al banco de genética |
| Tipo de origen | enum | Sí | `Semilla` o `Clon` |
| Tipo genético | enum | Sí | `Fotoperíodica` o `Automática` |
| Cantidad | entero | Sí | ≥2 para lote, =1 para planta individual |
| Modo de cultivo | enum | Sí | `Indoor` o `Outdoor` |
| Fecha de siembra | YYYY-MM-DD | Sí | Fecha de inicio |
| Método de germinación | enum | No | Discos de algodón / agua / pellet de turba / tierra directa / otro |
| Origen del clon | enum | Condicional | Si es Clon: `Propio` o `Externo` |
| Planta madre | ID | Condicional | Si es Clon Propio: ID de planta madre del registro |
| Fuente externa | texto | Condicional | Si es Clon Externo: nombre del proveedor |
| Ubicación | topología | Sí | Sala → Mesa/Fixture → Nivel |

**IDs generados automáticamente:**
- `id`: `L{timestamp}` (lote) o `P{timestamp}` (planta)
- `sourceBatchId`: UUID del lote de origen (para trazabilidad)

**Acciones disponibles:**
- Editar registro
- Eliminar registro
- Ver detalle (slideover lateral con historial completo)
- **Trasplantar a Vegetación** → abre TransplantModal

**Eventos que registra en el diario continuo:**
- `batch_created` (automático al crear)
- Checklists de propagación (aclimatación, pulverización foliar, chequeo de raíces)
- Registros de descarte de plántulas
- Notas libres

---

### 4.2 Etapa 2: Vegetación

**Descripción:** Las plantas son trasplantadas al espacio de crecimiento vegetativo. **Aquí se asignan las pulseras/IDs físicos** por primera vez.

**Modal de Transplante (TransplantModal) — datos capturados:**

| Campo | Descripción |
|---|---|
| Modo de pulsera | ID (QR scan) o Color (pulsera física de color) |
| braceletId por planta | Si modo ID: escaneo QR o ingreso manual por planta |
| Color de pulsera | Si modo Color: selección de color (rojo/azul/verde/amarillo/blanco/negro) + conteo de plantas vivas |
| Plantas perdidas (bajas) | Número + motivo: rechazo / raíces débiles / moho / no germinó / otro |
| Notas de sesión | Comentario libre sobre el transplante |
| Nueva ubicación | Sala → Mesa → Nivel en la topología |

**Indicadores en la tarjeta (CultivoLoteListRow):**
- Nombre de cepa + ID del lote
- Conteo de plantas: activas / total / en cuarentena
- Anillo ámbar si hay plantas en cuarentena
- Fecha inicio vegetación
- Para genética **Automática**: contador regresivo "Floración en X días" (calcula: fecha de siembra + 28 días)
- Para genética **Fotoperíodica**: no muestra countdown (el reloj florece al cambiar fotoperiodo)

**Acciones disponibles:**
- Ver detalle / editar
- Dividir lote (Split)
- Eliminar batch
- **Pasar a Floración** (botón principal) → abre MoveToFlowerModal

---

### 4.3 Etapa 3: Floración

**Descripción:** Período reproductivo de la planta. Se registran datos agronómicos detallados y se monitorea el avance hacia la cosecha.

**Modal de paso a Floración (MoveToFlowerModal) — datos capturados:**

| Campo | Descripción |
|---|---|
| Selección de plantas | Checkbox por planta, con verificación de braceletId. Las no seleccionadas se marcan como baja |
| Fecha inicio floración | YYYY-MM-DD |
| Duración en semanas | **Obligatorio solo para fotoperíodica** (ej: 9 semanas). Define la fecha estimada de corte |
| Tipo de poda aplicada | Ninguna / Lollipopping / Topping / Defoliación |
| Altura promedio | Centímetros al inicio de floración (opcional) |
| Nueva ubicación | Si se trasladan a sala de floración |

**Indicadores en la tarjeta:**
- Nombre cepa + ID + sufijo de segmento si fue dividido (A, B, C...)
- Días de floración (contador desde `floracionStartedAt`)
- **Countdown al corte** (calculado: fechaInicio + semanas × 7 días)
- Sub-etapa opcional: Pre-Flora / Desarrollo / Maduración
- Conteo plantas activas/total/cuarentena

**Registro técnico en el diario continuo (floración):**

| Tipo de entrada | Campos |
|---|---|
| Inspección IPM | Score 1–5, plagas (trips/araña roja/áfidos), enfermedades (oídio/botrytis/def. nitrógeno), etapa de tricomas (transparentes/lechosos/ámbar), foto |
| Riego y nutrición | pH entrada, pH drenaje, EC entrada, EC drenaje, volumen (L), estado de flush (sí/no), receta utilizada |
| Clima | Temperatura (°C), Humedad relativa (%), VPD (kPa), CO2 (ppm), PPFD (μmol/m²/s), DLI |
| Mantenimiento | Defoliación, schwazz, segunda malla (SCROG), notas libres |
| Clínica fitosanitaria AI | Diagnóstico por foto via Google Gemini: identificación de problema, nivel de confianza, tratamiento recomendado |

**Acciones disponibles:**
- Ver detalle / editar
- Dividir lote
- Eliminar batch
- **Cosechar** (botón principal) → abre HarvestModal

---

### 4.4 Etapa 4: Cosecha

**Descripción:** El acto del corte. Las plantas pasan del kanban de floración al kanban de cosecha. Simultáneamente se crea un registro `HarvestBatch` en estado DRYING para iniciar el pipeline de post-cosecha.

**Modal de Cosecha (HarvestModal) — confirmación:**
- Nombre de cepa
- Conteo de plantas (individual o batch completo)
- Ubicación de origen
- Botón de confirmación

**Al confirmar cosecha:**
1. Las tarjetas de plantas se mueven de `floracion[]` a `cosecha[]` en el kanban
2. Se crea un registro `HarvestBatch` con `postHarvestStatus: 'DRYING'`
3. Se registra `cosechaStartedAt` (timestamp ISO)
4. Se agrega evento `moved_to_cosecha` al diario continuo

**El tab Cosecha muestra dos secciones:**
1. **Tarjetas de plantas cosechadas** — historial de qué plantas fueron cortadas y cuándo
2. **Pipeline post-cosecha** — gestión del material tras el corte (ver sección 10)

---

## 5. Sistema de Identificación: Pulseras, QR e IDs

### 5.1 Las tres capas de identificación

```
┌─────────────────────────────────────────────────────────────────┐
│  CAPA 1: id                                                     │
│  ID técnico interno. Formato: L{timestamp} (lote) / P{ts}      │
│  Generado automáticamente. No visible para el operario.         │
├─────────────────────────────────────────────────────────────────┤
│  CAPA 2: sourceBatchId                                          │
│  UUID del lote de origen. Une todos los individuos de un mismo  │
│  lote de siembra, incluso después de divisiones.                │
├─────────────────────────────────────────────────────────────────┤
│  CAPA 3: braceletId                                             │
│  La pulsera física. Asignada en Vegetación. Lo que el operario  │
│  ve y escanea en el invernadero.                                │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Modo ID (QR / código numérico)

- Cada planta recibe un código único alfanumérico (impreso en QR o escrito en pulsera)
- Ingreso: cámara (OCR con Tesseract.js) o teclado manual
- Normalización automática: se elimina `#`, se recortan espacios, se convierte a minúsculas para deduplicación
- Verificación de unicidad: el sistema rechaza IDs duplicados en el mismo batch
- El sistema puede verificar braceletIds al momento de pasar plantas a floración (confirmación de identidad)

### 5.3 Modo Color (pulsera de color físico)

Pensado para operaciones que usan pulseras de colores estándar en lugar de QR individuales.

| Color disponible | Ejemplo de ID generado |
|---|---|
| Rojo | `Red-01`, `Red-02`, ... |
| Azul | `Blue-01`, `Blue-02`, ... |
| Verde | `Green-01`, `Green-02`, ... |
| Amarillo | `Yellow-01`, `Yellow-02`, ... |
| Blanco | `White-01`, `White-02`, ... |
| Negro | `Black-01`, `Black-02`, ... |

El usuario ingresa el recuento de plantas vivas y el sistema genera los IDs secuencialmente.

### 5.4 Escáner OCR (Herramientas)

El módulo **Tools** incluye un escáner de pulseras via cámara del dispositivo:
- Motor: Tesseract.js v7 (OCR en browser, sin backend)
- Reconoce códigos numéricos y alfanuméricos impresos
- Permite corrección manual antes de confirmar
- No requiere hardware especial (funciona con cámara de smartphone/tablet)

---

## 6. Sistema de Planta Madre y Clonado

### 6.1 Designación de planta madre

- Cualquier planta del registro puede ser marcada como `isMotherStock: true`
- Las madres están ubicadas típicamente en una sala dedicada (no de producción)
- Aparecen en un buscador especial (MotherPlantSearchSelect) al crear nuevos clones

### 6.2 Tipos de origen del clon

| Tipo | Campo | Descripción |
|---|---|---|
| **Clon Propio** | `cloneOrigin: 'propio'` | Esqueje tomado de planta madre registrada en el sistema |
| | `motherPlantId` | ID de la planta madre de origen |
| **Clon Externo** | `cloneOrigin: 'externo'` | Esqueje adquirido de proveedor externo |
| | `cloneExternalSource` | Nombre/referencia del proveedor |

### 6.3 Trazabilidad genética

| Campo | Descripción |
|---|---|
| `cloneGeneration` | Generación del clon: F1, Gen 2, Gen 3... |
| `rootingHormone` | Hormona de enraizamiento utilizada |
| `motherPlantId` | Link directo a la planta madre en el registro |
| `sourceBatchId` | Lote de origen de la tanda de clones |

La cadena de trazabilidad completa permite rastrear un gramo de producto terminado hasta el esqueje original y hasta la planta madre que lo produjo.

---

## 7. División de Lotes (Split)

### 7.1 Cuándo se puede dividir

- Solo en Vegetación o Floración
- Requiere mínimo 2 plantas activas en el lote
- Se puede hacer tantas veces como necesario

### 7.2 Datos que captura el modal de división

| Campo | Validación |
|---|---|
| Cantidad de plantas a trasladar | Mín: 1 / Máx: total_activas - 1 |
| Nueva ubicación (sala → mesa → nivel) | Obligatoria |

### 7.3 Qué ocurre al dividir

1. Las N plantas seleccionadas reciben un **nuevo `sourceBatchId`** (UUID nuevo)
2. Las plantas originales conservan sus `braceletId` e `id` técnico — no cambia nada en el tag físico
3. Se asigna un **sufijo de segmento** (`lotSegmentSuffix`): A, B, C, D...
   - El lote original queda como "Cepa"
   - El segmento nuevo aparece como "Cepa — B"
4. El evento queda registrado en el diario continuo:
   ```
   systemKey: 'lote_split'
   movedCount: N
   newBatchId: '...'
   fromBatchId: '...'
   locationLabel: 'Sala X > Mesa Y'
   ```
5. Ambos segmentos son completamente independientes: pueden avanzar de etapa, cosecharse y clasificarse por separado

### 7.4 Trazabilidad post-split

| Campo | Función |
|---|---|
| `sourceBatchId` | ID del segmento actual al que pertenece la planta |
| `splitFromSourceBatchId` | ID del segmento del cual proviene (si fue dividida) |
| `lotSegmentSuffix` | Letra del segmento (A/B/C) |

---

## 8. Parámetros Técnicos Completos

Todo lote/planta puede tener registrados los siguientes parámetros técnicos:

### 8.1 Sustrato y contenedor

| Campo | Opciones / Tipo |
|---|---|
| Tipo de sustrato | Suelo / Coco / Rockwool / Hidro (agua) / Leca / Otro (texto libre) |
| Volumen de maceta | 1L / 3L / 5L / 7L / 11L / 15L / 20L / 50L+ / Personalizado |
| Unidad de volumen | Litros o Galones |
| Link a inventario | Referencia al ítem en el módulo de Stock |

### 8.2 Iluminación

| Campo | Opciones / Tipo |
|---|---|
| Tipo de luz | LED / HPS / CMH / Fluorescente / Solar / Otro |
| PPFD | μmol/m²/s (intensidad lumínica fotosintéticamente activa) |
| Horario | Ej: "18/6" (veg), "12/12" (floración) |
| Link a inventario | Referencia al equipo en Stock |

### 8.3 Riego e irrigación

| Campo | Opciones |
|---|---|
| Método | Manual / Goteo / Ebb & Flow / NFT / Autopot / DWC / Aeroponía / Aspersor / Otro |
| Descripción personalizada | Texto libre si elige "Otro" |

### 8.4 Nutrición

| Campo | Tipo |
|---|---|
| Línea/marca de nutrientes | Texto libre |
| pH de entrada | Decimal (ej: 6.2) |
| EC de entrada | Decimal en mS/cm (ej: 1.8) |
| Temperatura de solución | °C |
| Link a inventario | Referencia al fertilizante en Stock |

### 8.5 Parámetros climáticos (por entrada de diario)

| Campo | Unidad |
|---|---|
| Temperatura | °C |
| Humedad relativa | % |
| VPD (Vapor Pressure Deficit) | kPa |
| CO2 | ppm |
| PPFD | μmol/m²/s |
| DLI (Daily Light Integral) | mol/m²/día |

### 8.6 Parámetros de floración

| Campo | Descripción |
|---|---|
| Duración esperada | Semanas (solo fotoperíodica — base para countdown de cosecha) |
| Altura al inicio | Centímetros (promedio del lote) |
| Tipo de poda aplicada | Ninguna / Lollipopping / Topping / Defoliación |
| Sub-etapa | Pre-Flora / Desarrollo / Maduración |
| Fecha inicio floración | YYYY-MM-DD |

### 8.7 Genética y fenotipos

| Campo | Descripción |
|---|---|
| THC % | Override por batch (puede diferir del perfil del banco) |
| CBD % | Override por batch |
| Sativa % | Porcentaje fenotípico |
| Indica % | Porcentaje fenotípico |
| Ruderalis % | Solo para automáticas |
| Descripción batch | Notas específicas de este cultivo (sobreescribe la ficha del banco) |
| Genética/linaje | Texto libre (ej: "OG Kush x Haze") |
| Breeder | Empresa o persona que generó la variedad |

### 8.8 Salud y estado fitosanitario

| Campo | Opciones / Tipo |
|---|---|
| Estado de la unidad | `active` / `baja` / `quarantine` |
| Score de salud | 1 a 5 (en cada inspección del diario) |
| Plagas detectadas | Trips / Araña roja (spider mite) / Áfidos / Ninguna |
| Enfermedades detectadas | Oídio / Botrytis / Deficiencia de nitrógeno / Ninguna |
| Etapa de tricomas | Transparentes / Lechosos / Ámbar |
| Motivo de cuarentena | Texto libre |
| Fecha de cuarentena | ISO timestamp |
| Diagnóstico AI | Resultado de análisis via Google Gemini (síntoma, confianza %, tratamiento) |

---

## 9. Diario Continuo (Audit Trail)

Cada lote/planta tiene un **diario cronológico inmutable** (`propagacionLog`) que se construye desde la creación hasta la cosecha. Funciona como un libro de campo digital.

### 9.1 Tipos de entradas

| Tipo (`kind`) | Descripción |
|---|---|
| `system` | Eventos automáticos del sistema (creación, cambios de etapa, splits) |
| `note` | Nota libre del operario |
| `measurement` | Medición manual (pH, EC, temperatura) |
| `diario_riego_nutricion` | Registro de riego: receta, volumen, pH/EC entrada-drenaje, flush |
| `diario_inspeccion` | Inspección IPM: score salud, plagas, enfermedades, tricomas, foto |
| `diario_clima` | Registro ambiental: temp, HR, VPD, CO2, PPFD, DLI |
| `diario_mantenimiento` | Tareas: defoliación, schwazz, SCROG, notas |
| `diario_propagacion_checklist` | Checklist de propagación: aclimatación, pulverización foliar, raíces |
| `diario_descarte` | Descarte de plántulas: conteo + motivo |
| `diario_altura_canopy` | Altura del canopy en cm |
| `diario_baja_planta` | Baja oficial de planta: acta, IDs, motivo, peso, método de destrucción |
| `diario_cuarentena` | Inicio de cuarentena: plantas afectadas, motivo, ubicación |
| `diario_reubicacion` | Traslado de plantas: IDs, conteo, nueva ubicación |

### 9.2 Eventos de sistema automáticos

| `systemKey` | Cuándo se dispara |
|---|---|
| `batch_created` | Al crear el lote/planta en propagación |
| `moved_to_vegetacion` | Al confirmar el transplante a veg |
| `moved_to_floracion` | Al confirmar el paso a floración |
| `moved_to_cosecha` | Al confirmar la cosecha |
| `lote_split` | Al dividir un lote |

### 9.3 Estructura de una entrada del diario

```typescript
{
  id: string,               // ID único de la entrada
  at: string,               // ISO timestamp (ej: "2026-03-15T14:32:01.000Z")
  kind: PropagacionLogKind, // Tipo (ver tabla anterior)
  author?: string,          // Usuario que registró la entrada
  text?: string,            // Nota libre

  // Campos adicionales según el tipo:
  ph?: number,
  ec?: number,
  tempC?: number,
  systemKey?: string,       // Solo para kind: 'system'

  // Payload estructurado según kind:
  diarioRiegoNutricion?: { recipeLabel, volumeValue, volumeUnit, inletPh, inletEc, drainPh, drainEc, flushStarted },
  diarioInspeccion?: { healthScore, pests[], diseases[], trichomeStage, photoDataUrl, notes },
  diarioClima?: { tempC, rhPct, vpdKpa, co2Ppm, ppfd, dli },
  // ...etc
}
```

---

## 10. Pipeline Post-Cosecha

Integrado directamente dentro del tab **Cosecha** del módulo Cultivo.

El pipeline gestiona objetos `HarvestBatch` (distintos a las tarjetas de plantas). Cada acto de cosecha crea automáticamente un `HarvestBatch` en estado DRYING.

### 10.1 Las tres columnas del pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   SECANDO    │────▶│   CURADO     │────▶│   STOCK FINAL    │
│   (DRYING)   │     │   (CURING)   │     │   (STOCK)        │
└──────────────┘     └──────────────┘     └──────────────────┘
```

### 10.2 Columna 1: SECANDO (DRYING)

**Información mostrada:**
- Nombre de cepa
- Días desde el corte (calculado desde `harvestDate`)
- Fecha de corte (YYYY-MM-DD)
- Sala de secado (roomLabel + tableLabel)
- Campo editable: **Peso fresco** (gramos)

**Acción disponible:** "Pasar a Curado"

**Modal "Pasar a Curado" captura:**
| Campo | Validación |
|---|---|
| Peso seco total (g) | Requerido, debe ser > 0. Si se ingresó peso fresco, no puede superar ese valor |
| Merma de trim (g) | Opcional, no puede ser negativo |

---

### 10.3 Columna 2: CURADO (CURING)

**Información mostrada:**
- Nombre de cepa
- Peso seco registrado
- Merma de trim (si aplica)
- Días de curado (calculado desde `curingStartedAt`)

**Acción disponible:** "Registrar Stock"

**Modal "Registrar Stock" captura:**
| Campo | Validación |
|---|---|
| Gramos Premium | Numérico ≥ 0 |
| Gramos Popcorn | Numérico ≥ 0 |
| Gramos Biomasa | Numérico ≥ 0 |
| Ubicación vault | Selector de sala existente O texto libre. Obligatorio |

Validación: la suma de Premium + Popcorn + Biomasa debe ser > 0 y ≤ peso seco registrado.

---

### 10.4 Columna 3: STOCK FINAL (STOCK)

**Información mostrada:**
- Nombre de cepa
- Ubicación en vault (depósito)
- Desglose en gramos:
  - Premium (g)
  - Popcorn (g)
  - Biomasa (g)
  - **Total clasificado** (g)

**Acciones:**
- Ver trazabilidad completa (LinajeDelLoteModal — muestra la cadena desde la semilla)

---

### 10.5 Estructura del objeto HarvestBatch

```typescript
HarvestBatch {
  id: string,
  strain: string,
  plantIds: string[],          // IDs de los PlantCardItem cosechados
  plantCount: number,
  harvestDate: string,         // YYYY-MM-DD
  postHarvestStatus: 'DRYING' | 'CURING' | 'STOCK',

  // Pesos
  wetWeight: number | null,    // Peso fresco al corte (g)
  dryWeight: number | null,    // Peso seco tras secado (g)
  trimWasteWeight: number | null, // Merma de trim (g)

  // Curado
  curingStartedAt?: string,    // ISO timestamp inicio curado

  // Clasificación de stock
  stockGradePremiumG: number | null,
  stockGradePopcornG: number | null,
  stockGradeBiomassG: number | null,

  // Ubicación
  roomId: string,
  tableId: string,
  roomLabel: string,
  tableLabel: string,
  vaultLocationLabel?: string, // Ubicación final en depósito

  archived: boolean,
  createdAt: string,
}
```

---

## 11. Indicadores en Tarjetas de Cultivo

### 11.1 Tarjeta de Propagación (PropagacionBatchCard)

```
┌────────────────────────────────────────────────────────┐
│  [Ícono] NOMBRE CEPA                     Día 12        │
│  Lote #L12345  ·  Semilla  ·  ☀ Fotop.                │
│  📍 Sala Madres > Mesa 1 > Nivel 2                     │
│  12 unidades                                           │
│                                                        │
│  [──────────────── Trasplantar a Veg ───────────────]  │
└────────────────────────────────────────────────────────┘
```

| Indicador | Descripción |
|---|---|
| "Día N" | Días desde `propagacionStartedAt` |
| Tipo origen | Ícono semilla o clon |
| Tipo genética | ☀ Fotoperíodica / ⚡ Automática |
| Ubicación | Breadcrumb topológico |
| Cantidad | Número de unidades en el lote |

### 11.2 Tarjeta de Vegetación / Floración (CultivoLoteListRow)

```
┌────────────────────────────────────────────────────────┐
│  NOMBRE CEPA — B          12/14  ⚠️ 1 cuarentena       │
│  Lote #L12345  ·  Clon  ·  ☀ Fotop.                   │
│  📍 Sala Floración > Mesa 3                            │
│                                                        │
│  [VEGETACION]  Inicio: 2026-02-10                      │
│  ⚠ Floración en 3 días (automática)                   │
│                                                        │
│  [FLORACION]  Día 38 de floración  ·  Corte en 25 días │
│  Sub-etapa: Desarrollo                                 │
│                                                        │
│  [─────────── ✂ Cosechar ───────────]                 │
└────────────────────────────────────────────────────────┘
```

| Indicador | Descripción |
|---|---|
| Conteo `X/Y` | Activas / Total |
| Anillo + badge ámbar | Plantas en cuarentena |
| Sufijo "— B" | Si el lote fue dividido, letra del segmento |
| "Floración en X días" | Solo genética automática. Caja ámbar de alerta |
| "Listo para Florecer" | Cuando el countdown llegó a 0 (automática) |
| "Día N de floración" | Días desde `floracionStartedAt` |
| "Corte en N días" | Countdown basado en `floweringStartDate + flowerDurationWeeks` |
| Sub-etapa | Pre-Flora / Desarrollo / Maduración (si está configurado) |

### 11.3 Estados de salud

| Estado | Representación visual |
|---|---|
| `active` | Sin indicadores especiales |
| `quarantine` | Anillo ámbar alrededor de la tarjeta + contador de plantas en cuarentena |
| `baja` | Planta excluida del conteo activo (aún visible en historial) |

---

## 12. Otros Módulos del Dashboard

### 12.1 Banco de Genética (AgronomyTab)

Librería de cepas con fichas completas:
- Nombre, breeder, tipo (fotoperíodica/automática/CBD)
- Porcentajes: THC, CBD, Sativa, Indica, Ruderalis
- Aromas, efectos, propiedades medicinales, terpenos principales
- Descripción detallada y notas de cultivo
- Se integra con el campo Strain del formulario de creación de lotes (autocomplete)

### 12.2 Stock / Inventario

- Gestión de producto terminado
- Precios en ARS (efectivo / transferencia) y USDT
- Vinculación con HarvestBatch (dispensación desde lotes cosechados)
- Ajuste de stock manual
- Event listener: `inventory:restore` para devolver gramos a un HarvestBatch desde una venta cancelada

### 12.3 Socios

- Gestión de miembros del equipo y/o pacientes REPROCANN
- Fotos de perfil (base64 en localStorage)
- Registro de licencias (REPROCANN data URL)
- Notificaciones internas del sistema

### 12.4 Topología de Salas (Settings > Empresa)

- Configuración de salas del establecimiento
- Jerarquía: Sala → Mesa/Fixture → Nivel
- Tipos de sala: producción / cuarentena / secado / madres
- Las salas de cuarentena y secado se excluyen del formulario de creación de lotes
- Se usa en todos los módulos de cultivo para asignar ubicaciones físicas

### 12.5 Herramientas (ToolsTab)

- **Escáner OCR de pulseras**: Lectura de braceletId por cámara (Tesseract.js)
- Útil para operarios que necesitan identificar lotes en el invernadero

### 12.6 Trazabilidad (LinajeDelLoteModal)

- Accesible desde cualquier `HarvestBatch` en la columna Stock
- Muestra la cadena completa: semilla/madre → propagación → vegetación → floración → cosecha → stock
- Incluye fechas, conteos, IDs y transiciones de etapa
- Diseñado para soporte en auditorías regulatorias

---

## 13. Cumplimiento Legal

El sistema está diseñado para cumplir con el marco regulatorio argentino:

| Ley / Norma | Módulo relacionado |
|---|---|
| Ley 27.350 (Cannabis medicinal) | Todo el sistema |
| Ley 27.669 (Regulación cultivo) | Módulos de cultivo y stock |
| REPROCANN (MSAL Res. 1780/2025) | Módulo Socios (150 pacientes por ONG, 1–9 plantas en floración) |
| INASE (Ley 20.247) | Banco de genética, trazabilidad de variedades |
| Ley 23.737 (Control de sustancias) | Límites de transporte (40g), restricción de terminología comercial |
| Ley 25.326 (Protección de datos) | Consentimiento de pacientes, seguridad de almacenamiento |

> **Aviso legal:** Canspace es un sistema de software para organización de datos. No entra en posesión ni gestiona materiales físicos. Toda responsabilidad sobre el cumplimiento operativo recae en el usuario del sistema.

---

## 14. Estado Actual y Limitaciones

### 14.1 Lo que funciona (MVP frontend)

| Funcionalidad | Estado |
|---|---|
| Flujo completo Propagación → Cosecha | ✅ Operativo |
| Sistema de pulseras (ID + Color) | ✅ Operativo |
| Diario continuo (todas las entradas) | ✅ Operativo |
| División de lotes | ✅ Operativo |
| Pipeline Post-Cosecha integrado en Cosecha | ✅ Operativo (integración reciente) |
| Banco de genética | ✅ Operativo |
| Topología de salas | ✅ Operativo |
| Trazabilidad (LinajeDelLote) | ✅ Operativo |
| Clínica fitosanitaria AI (Gemini) | ✅ Operativo (requiere API key) |
| Escáner OCR de pulseras | ✅ Operativo |
| Módulo Socios | ✅ Operativo |
| Módulo Stock / Inventario | ✅ Operativo |
| Tema claro/oscuro + idioma ES/RU | ✅ Operativo |

### 14.2 Limitaciones actuales

| Limitación | Impacto | Prioridad de resolución |
|---|---|---|
| **Sin backend / todo en localStorage** | Sin sincronización cross-device, sin backups, límite de ~5MB | Alta |
| **Autenticación deshabilitada** | Cualquiera que acceda a la URL entra directamente | Alta |
| **Imágenes como base64 en localStorage** | Las fotos saturan rápidamente el almacenamiento del navegador | Alta |
| **Diagnóstico AI cae en mock data sin avisar** | El usuario puede recibir diagnósticos ficticios sin saberlo | Media |
| **Sin base de datos real** | Los datos se pierden si se limpia el navegador | Alta |
| **Sin roles de usuario** | No hay distinción entre administrador / operario / auditor | Media |
| **Sin reportes exportables** | No se puede exportar a PDF/Excel para auditorías | Media |
| **Documentos y Empleados incompletos** | Los módulos existen pero están en estado stub/básico | Baja |

### 14.3 Arquitectura preparada para backend

El proyecto incluye `prisma/schema.prisma` con un esquema PostgreSQL ya diseñado para salas, fixtures, niveles y plantas. La integración futura con backend requeriría:

1. Implementar un API REST o tRPC (Node.js / Express / Fastify)
2. Migrar los stores de Zustand para hacer fetch al API en lugar de leer localStorage
3. Implementar autenticación (JWT o sessions)
4. Mover el almacenamiento de imágenes a un servicio externo (S3, Cloudinary, etc.)
5. Habilitar el proxy para APIs de terceros que tienen restricciones CORS (OpenAI, Claude)

---

*Documento generado el 21 de Abril de 2026.*
*Basado en análisis directo del código fuente del repositorio Canspace v0.0.0.*
