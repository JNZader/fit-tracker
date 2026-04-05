// ---------------------------------------------------------------------------
// Sistema module — Rules, protocols, and training guidelines
// ---------------------------------------------------------------------------

export function init(container: HTMLElement): void {
  container.innerHTML = `
    <h2>Sistema de Entrenamiento</h2>

    <!-- RPE -->
    <div class="cd mb-4">
      <div class="cd__title" style="margin-bottom:var(--sp3)">RPE — Rate of Perceived Exertion</div>
      <p>Escala subjetiva del 1 al 10 para cuantificar el esfuerzo percibido en cada sesión.</p>
      <table class="tb" style="margin-top:var(--sp3)">
        <thead><tr>
          <th>RPE</th><th>Descripción</th><th>Acción</th>
        </tr></thead>
        <tbody>
          <tr><td>1–3</td><td>Muy fácil — movimiento sin esfuerzo</td><td>Aumentar volumen / intensidad</td></tr>
          <tr><td>4–5</td><td>Moderado — puedo mantener una conversación</td><td>Mantener progresión planificada</td></tr>
          <tr><td>6–7</td><td>Desafiante — respiración elevada</td><td style="color:var(--green)">Zona objetivo de entrenamiento</td></tr>
          <tr><td>8</td><td>Muy duro — pocas reps en reserva</td><td>Aceptable en semanas de carga</td></tr>
          <tr><td>9–10</td><td>Máximo esfuerzo — fallo muscular</td><td style="color:var(--red)">Evitar en entrenamiento de base</td></tr>
        </tbody>
      </table>

      <div class="cd cd--green" style="margin-top:var(--sp4)">
        <div class="cd__title" style="margin-bottom:var(--sp2)">Regla del RPE</div>
        <ul style="list-style:none;color:var(--text);line-height:1.8">
          <li>✓ RPE 6–7 es la zona objetivo para la mayoría de las sesiones</li>
          <li>✓ RPE &gt; 8 dos sesiones seguidas → agregar día de recuperación</li>
          <li>✓ RPE &lt; 5 tres sesiones seguidas → evaluar incremento de carga</li>
          <li>✓ Registrar RPE en <em>cada sesión</em> de tracking</li>
        </ul>
      </div>
    </div>

    <!-- Push:Pull ratio -->
    <div class="cd mb-4">
      <div class="cd__title" style="margin-bottom:var(--sp3)">Ratio Push:Pull — 1:1.5</div>
      <p>
        Por cada unidad de volumen de empuje (push), hacer 1.5 unidades de jalón (pull).
        Esto previene el desequilibrio muscular y reduce el riesgo de lesión de hombro.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp4);margin-top:var(--sp3)">
        <div class="cd cd--red" style="margin-bottom:0">
          <div class="cd__title" style="margin-bottom:var(--sp2)">Push (empuje)</div>
          <ul style="list-style:none;color:var(--text);font-size:0.88rem;line-height:1.7">
            <li>Push-ups y variantes</li>
            <li>Pectorales, tríceps</li>
            <li>Deltoides anterior</li>
          </ul>
        </div>
        <div class="cd cd--blue" style="margin-bottom:0">
          <div class="cd__title" style="margin-bottom:var(--sp2)">Pull (jalón)</div>
          <ul style="list-style:none;color:var(--text);font-size:0.88rem;line-height:1.7">
            <li>Remo y variantes</li>
            <li>Dorsal, romboides</li>
            <li>Bíceps, deltoides posterior</li>
          </ul>
        </div>
      </div>
      <p style="margin-top:var(--sp3);color:var(--text-dim);font-size:0.85rem">
        Ejemplo: 3 series de push-ups → mínimo 4–5 series de remo en la misma semana.
      </p>
    </div>

    <!-- Deload protocol -->
    <div class="cd mb-4">
      <div class="cd__title" style="margin-bottom:var(--sp3)">Protocolo de Deload — Cada 4 semanas</div>
      <p>
        La semana 4 de cada bloque se reduce el volumen al 60% para permitir supercompensación.
        No es una semana de descanso total — el entrenamiento continúa.
      </p>
      <table class="tb" style="margin-top:var(--sp3)">
        <thead><tr>
          <th>Semana</th><th>Volumen relativo</th><th>Intensidad</th><th>Objetivo</th>
        </tr></thead>
        <tbody>
          <tr><td>Semana 1</td><td>Base (100%)</td><td>RPE 6–7</td><td>Establecer línea base</td></tr>
          <tr><td>Semana 2</td><td>+10%</td><td>RPE 6–7</td><td>Progresión lineal</td></tr>
          <tr><td>Semana 3</td><td>+20%</td><td>RPE 7–8</td><td>Sobrecarga controlada</td></tr>
          <tr><td style="color:var(--accent)">Semana 4</td><td style="color:var(--accent)">-40% (60% del total)</td><td style="color:var(--accent)">RPE 4–5</td><td style="color:var(--accent)">Deload — recuperación activa</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Semana de consolidación -->
    <div class="cd mb-4">
      <div class="cd__title" style="margin-bottom:var(--sp3)">Semana de Consolidación — Cada 3 semanas</div>
      <p>
        Cada 3 semanas, una sesión se reemplaza por un trabajo técnico de baja intensidad.
        El objetivo es refinar la técnica antes de continuar con cargas más altas.
      </p>
      <div class="cd cd--blue" style="margin-top:var(--sp3)">
        <ul style="list-style:none;color:var(--text);line-height:1.8">
          <li>✓ Realizar todos los ejercicios al 50% de carga habitual</li>
          <li>✓ Foco total en la calidad del movimiento</li>
          <li>✓ Grabar un ejercicio para analizar la técnica si es posible</li>
          <li>✓ Incorporar variaciones de movilidad</li>
        </ul>
      </div>
    </div>

    <!-- Techo de volumen -->
    <div class="cd mb-4">
      <div class="cd__title" style="margin-bottom:var(--sp3)">Techo de Volumen — Reglas de Progresión</div>
      <table class="tb">
        <thead><tr>
          <th>Regla</th><th>Límite</th><th>Consecuencia si se supera</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>Incremento semanal</td>
            <td style="color:var(--accent)">+10% máximo</td>
            <td>Mayor riesgo de sobreentrenamiento</td>
          </tr>
          <tr>
            <td>Incremento en 3 semanas</td>
            <td style="color:var(--accent)">+30% máximo</td>
            <td>Semana de consolidación obligatoria</td>
          </tr>
          <tr>
            <td>Sesiones/semana</td>
            <td style="color:var(--accent)">3–4 sesiones máximo</td>
            <td>Recuperación insuficiente</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Protocolo de dolor -->
    <div class="cd mb-4">
      <div class="cd__title" style="margin-bottom:var(--sp3)">Protocolo de Dolor por Zona</div>
      <table class="tb">
        <thead><tr>
          <th>Zona</th><th>Dolor leve (1–2)</th><th>Dolor moderado (3–4)</th><th>Dolor severo (5+)</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>Rodilla</td>
            <td>Continuar con menor rango</td>
            <td>Modificar a ejercicio sin impacto</td>
            <td style="color:var(--red)">Detener — consultar</td>
          </tr>
          <tr>
            <td>Hombro</td>
            <td>Reducir rango de movimiento</td>
            <td>Cambiar ángulo de push/pull</td>
            <td style="color:var(--red)">Detener — consultar</td>
          </tr>
          <tr>
            <td>Espalda</td>
            <td>Verificar técnica y postura</td>
            <td>Reducir carga al 50%</td>
            <td style="color:var(--red)">Detener — consultar</td>
          </tr>
          <tr>
            <td>Muñeca</td>
            <td>Usar puños cerrados o antebrazos</td>
            <td>Eliminar ejercicios en apoyo</td>
            <td style="color:var(--red)">Detener — consultar</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Stop rules semaphore -->
    <div class="cd mb-4">
      <div class="cd__title" style="margin-bottom:var(--sp3)">Semáforo de Stop — Sensación durante ejercicio</div>
      <p style="margin-bottom:var(--sp3)">Escala del 1 al 5 para evaluar si continuar o detener el ejercicio:</p>
      <div class="semaphore" style="flex-direction:column;gap:var(--sp2)">
        <div style="display:flex;align-items:center;gap:var(--sp3);padding:var(--sp2) var(--sp3);border-radius:var(--r);background:var(--green-bg)">
          <div class="semaphore__dot semaphore__dot--green"></div>
          <div>
            <strong style="color:var(--green)">1–2 — Verde:</strong>
            <span> Sensación normal de esfuerzo. Continuar sin cambios.</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--sp3);padding:var(--sp2) var(--sp3);border-radius:var(--r);background:var(--orange-bg)">
          <div class="semaphore__dot semaphore__dot--orange"></div>
          <div>
            <strong style="color:var(--orange)">3 — Amarillo:</strong>
            <span> Incomodidad o fatiga notable. Verificar técnica, reducir carga o rango.</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--sp3);padding:var(--sp2) var(--sp3);border-radius:var(--r);background:var(--orange-bg)">
          <div class="semaphore__dot semaphore__dot--orange"></div>
          <div>
            <strong style="color:var(--orange)">4 — Naranja:</strong>
            <span> Dolor agudo localizado. Detener el ejercicio específico, continuar con otros.</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--sp3);padding:var(--sp2) var(--sp3);border-radius:var(--r);background:var(--red-bg)">
          <div class="semaphore__dot semaphore__dot--red"></div>
          <div>
            <strong style="color:var(--red)">5 — Rojo:</strong>
            <span> Dolor severo, sensación de "crac", entumecimiento. Detener toda la sesión — consultar.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Revisión dominical -->
    <div class="cd mb-4">
      <div class="cd__title" style="margin-bottom:var(--sp3)">Semáforo Dominical — Revisión Semanal</div>
      <p style="margin-bottom:var(--sp3)">Cada domingo evaluar tres indicadores para planificar la semana siguiente:</p>
      <table class="tb">
        <thead><tr>
          <th>Indicador</th><th style="color:var(--green)">Verde ✓</th><th style="color:var(--orange)">Amarillo ⚠</th><th style="color:var(--red)">Rojo ✗</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>ΔVolumen semanal</td>
            <td>≤ +10%</td>
            <td>+11–20%</td>
            <td>&gt; +20%</td>
          </tr>
          <tr>
            <td>RPE promedio</td>
            <td>6–7</td>
            <td>7.5–8</td>
            <td>&gt; 8 o &lt; 5 constante</td>
          </tr>
          <tr>
            <td>Señales de dolor</td>
            <td>Sin dolor</td>
            <td>Dolor leve resuelto</td>
            <td>Dolor persistente &gt; 2 días</td>
          </tr>
        </tbody>
      </table>
      <div class="cd cd--green" style="margin-top:var(--sp3)">
        <ul style="list-style:none;color:var(--text);line-height:1.8">
          <li>✓ <strong>Verde:</strong> continuar con la progresión planificada</li>
          <li>⚠ <strong>Amarillo:</strong> mantener volumen, no incrementar</li>
          <li>✗ <strong>Rojo:</strong> reducir al 60% + sesión de consolidación técnica</li>
        </ul>
      </div>
    </div>

    <!-- Microciclo -->
    <div class="cd mb-4">
      <div class="cd__title" style="margin-bottom:var(--sp3)">Microciclo de 4 Semanas</div>
      <table class="tb">
        <thead><tr>
          <th>Semana</th><th>Lunes</th><th>Miércoles</th><th>Viernes</th><th>Volumen</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>Semana 1</td>
            <td>Entrenamiento A</td><td>Entrenamiento B</td><td>Entrenamiento A</td>
            <td>Base</td>
          </tr>
          <tr>
            <td>Semana 2</td>
            <td>Entrenamiento B</td><td>Entrenamiento A</td><td>Entrenamiento B</td>
            <td>Base +10%</td>
          </tr>
          <tr>
            <td>Semana 3</td>
            <td>Entrenamiento A</td><td>Entrenamiento B</td><td>Consolidación</td>
            <td>Base +20%</td>
          </tr>
          <tr style="color:var(--accent)">
            <td>Semana 4 (Deload)</td>
            <td>Entrenamiento ligero</td><td>Movilidad</td><td>Entrenamiento ligero</td>
            <td>-40%</td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top:var(--sp3);color:var(--text-dim);font-size:0.85rem">
        Entrenamiento A: Push-ups + Glute Bridge + Plank + Bird-Dog<br/>
        Entrenamiento B: Remo + Wall Sit + Dead Bug/Superman/Hollow Hold
      </p>
    </div>

    <!-- Respiración -->
    <div class="cd mb-4">
      <div class="cd__title" style="margin-bottom:var(--sp3)">Respiración durante ejercicios</div>
      <table class="tb">
        <thead><tr>
          <th>Tipo de ejercicio</th><th>Patrón de respiración</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>Push-ups</td>
            <td>Inhalar al bajar, exhalar al empujar (fase concéntrica)</td>
          </tr>
          <tr>
            <td>Remo</td>
            <td>Exhalar al jalar hacia el cuerpo, inhalar al alargar</td>
          </tr>
          <tr>
            <td>Glute Bridge</td>
            <td>Exhalar al subir, inhalar al bajar</td>
          </tr>
          <tr>
            <td>Ejercicios isométricos (Plank, Wall Sit)</td>
            <td>Respiración diafragmática continua — NO apnea</td>
          </tr>
          <tr>
            <td>Bird-Dog / Dead Bug</td>
            <td>Exhalar al extender, inhalar al volver al centro</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Recuperación -->
    <div class="cd mb-4">
      <div class="cd__title" style="margin-bottom:var(--sp3)">Guías de Recuperación</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp4)">
        <div>
          <h3>Entre series</h3>
          <ul style="list-style:none;color:var(--text);font-size:0.88rem;line-height:1.8">
            <li>Ejercicios de fuerza: 90–120 segs</li>
            <li>Ejercicios isométricos: 60–90 segs</li>
            <li>Ejercicios de core: 45–60 segs</li>
            <li>Calentamiento: sin descanso</li>
          </ul>
        </div>
        <div>
          <h3>Entre sesiones</h3>
          <ul style="list-style:none;color:var(--text);font-size:0.88rem;line-height:1.8">
            <li>Mínimo 48 hs entre sesiones intensas</li>
            <li>Actividad ligera en días de descanso</li>
            <li>7–9 horas de sueño</li>
            <li>Hidratación: mínimo 2L/día</li>
          </ul>
        </div>
      </div>
      <div class="cd cd--accent" style="margin-top:var(--sp4)">
        <div class="cd__title" style="margin-bottom:var(--sp2)">Señales de sobreentrenamiento</div>
        <ul style="list-style:none;color:var(--text);font-size:0.88rem;line-height:1.8">
          <li>✗ Rendimiento estancado o en descenso por &gt; 2 semanas</li>
          <li>✗ Fatiga persistente incluso después del descanso</li>
          <li>✗ Cambios de humor o irritabilidad inusual</li>
          <li>✗ Dificultad para dormir</li>
          <li>✗ Dolores musculares que no ceden en 72 hs</li>
        </ul>
        <p style="margin-top:var(--sp3);color:var(--accent)">
          Si detectás 3 o más → semana de deload inmediata independientemente del ciclo.
        </p>
      </div>
    </div>
  `
}
