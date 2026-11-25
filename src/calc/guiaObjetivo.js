Darbeloguerra
App-Sesiones-Fuerza
Repository navigation
Code
Issues
Pull requests
Actions
Projects
Wiki
Security and quality
Insights
Settings
App-Sesiones-Fuerza/src/calc
/

in
main

Edit

Preview
Indent mode

Indent size

Line wrap mode

Editing guiaObjetivo.js file contents
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
// Guía de %1RM y RIR según el objetivo de la sesión (diseñador).
//
// BASE: la cercanía al fallo (RIR) recomendada por objetivo, según el metaanálisis
// de 55 estudios de Robinson, Pelland, Remmert, Refalo, Jukic, Steele y Zourdos
// (Sports Medicine, 2024, DOI 10.1007/s40279-024-02069-2): fuerza ~3-5
// repeticiones antes del fallo (la cercanía al fallo no mostró efecto claro
// sobre la fuerza); hipertrofia 0-5 (más cerca del fallo tiende a más hipertrofia).
// Respaldo para fuerza: Davies et al. 2016 (Sports Med 46:487-502) y Grgic et al.
// 2022 (J Sport Health Sci): llegar al fallo no es necesario para ganar fuerza.
// Son rangos medios de estudios, amplios, y el RIR lo estima el jugador.
// POTENCIA: no hay un rango de RIR publicado que yo haya podido verificar. Se usa
// un criterio conservador y explícito de la app: RIR >= 3 (lejos del fallo). Lo
// que sí está medido es que la pérdida de velocidad crece con el % de
// repeticiones realizadas respecto al máximo (Rodríguez-Rosell et al., 2020,
// J Strength Cond Res 34:2537-2547), y que parar con poca pérdida de velocidad
// mejoró más el salto (Pareja-Blanco et al., 2017). El %1RM de máxima potencia
// depende del ejercicio (Soriano et al., 2015, Sports Med 45:1191-1205, 27
// estudios): sentadilla en torno a 30-70 %, salto con carga <= ~30 %, cargada
// y cargada colgante >= ~70 %. Son zonas amplias y los cortes son aproximados.
//
// La conversión %1RM <-> repeticiones máximas usa la tabla RTF de e1rm.js
// (válida hasta RTF 10 = 75 %; más allá no se dan cifras).
import { TABLA_PCT_1RM_POR_RTF, pct1RMporRTF } from "./e1rm.js";

export const RTF_TABLA_MAX = 10;
export const OBJETIVOS_SESION = [
  {
    id: "fuerza", etiqueta: "Fuerza", rir: { min: 3, max: 5 }, fuente: "Robinson et al., 2024",
    reps: { max: 8, suave: true, fuente: "López et al., 2021" },
    repsTexto: "Repeticiones: hasta 8 como referencia (carga alta, López et al., 2021). Por encima es un aviso informativo.",
  },
  {
    id: "hipertrofia", etiqueta: "Hipertrofia", rir: { min: 0, max: 5 }, fuente: "Robinson et al., 2024",
    repsTexto: "Repeticiones: sin límite fijo; con series cerca del fallo, un rango amplio de cargas da hipertrofia similar (López et al., 2021; Schoenfeld et al., 2021).",
  },
  {
Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element on the page.
