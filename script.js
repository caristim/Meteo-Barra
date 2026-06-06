// CONFIGURACIÓN DE FIREBASE
// IMPORTANTE: Reemplaza con tus credenciales reales
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROJECT_ID.firebaseapp.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_PROJECT_ID.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const medicionesRef = collection(db, "meteorologia");

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error('Error SW', err));
    });
}

window.guardarDatos = async function() {
    const temp = document.getElementById('temperatura').value;
    const hum = document.getElementById('humedad').value;
    const viento = document.getElementById('viento').value;
    const dirViento = document.getElementById('direccionViento').value;
    const presion = document.getElementById('presion').value;
    const lluvia = document.getElementById('lluvia').value;

    if (!temp || !hum) {
        alert("Por favor completa al menos temperatura y humedad.");
        return;
    }

    const ahora = new Date();
    const nuevaMedicion = {
        temperatura: parseInt(temp),
        humedad: parseInt(hum),
        vientoKMH: parseFloat(viento) || 0,
        direccionViento: dirViento,
        presion: parseInt(presion) || 0,
        lluvia: parseInt(lluvia) || 0,
        fecha: ahora.toLocaleDateString(),
        hora: ahora.toLocaleTimeString(),
        timestamp: Date.now(),
        faseLunar: "Calculada por sistema"
    };

    try {
        await addDoc(medicionesRef, nuevaMedicion);
        alert("¡Medición guardada correctamente!");
        limpiarFormulario();
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al conectar con Firebase.");
    }
};

function limpiarFormulario() {
    document.querySelectorAll('input').forEach(input => input.value = '');
}

// ESCUCHAR DATOS
onSnapshot(query(medicionesRef, orderBy("timestamp", "desc"), limit(20)), (snapshot) => {
    const mediciones = [];
    snapshot.forEach((doc) => {
        mediciones.push({ id: doc.id, ...doc.data() });
    });
    actualizarInterfaz(mediciones);
});

function actualizarInterfaz(mediciones) {
    if (mediciones.length === 0) return;

    const ultima = mediciones[0];

    document.getElementById('datosActuales').innerHTML = `
        <strong>🌡 Temp:</strong> ${ultima.temperatura} °C  \n
        <strong>💧 Humedad:</strong> ${ultima.humedad} %  \n
        <strong>💨 Viento:</strong> ${ultima.vientoKMH} km/h (${ultima.direccionViento})  \n
        <strong>⏲ Presión:</strong> ${ultima.presion} hPa  \n
        <strong>🌧 Lluvia:</strong> ${ultima.lluvia} mm  \n
        <small>📅 ${ultima.fecha} - ${ultima.hora}</small>
    `;

    generarPrediccionIA(ultima);

    const historialHTML = mediciones.map(m => `
        <div class="registro">
            <strong>${m.fecha} ${m.hora}</strong>: ${m.temperatura}°C | ${m.humedad}% HR | ${m.vientoKMH} km/h
        </div>
    `).join('');
    document.getElementById('historial').innerHTML = historialHTML;
}

// ── Helpers de predicción ─────────────────────────────────────────────────────

function clasificarTiempo(presion, humedad, vientoKMH) {
    if (presion < 1010 && humedad > 85) {
        return { texto: "⛈ Alta probabilidad de tormentas", color: "#ef4444" };
    } else if (presion < 1015 && humedad > 70) {
        return { texto: "🌧 Cielos cubiertos con lluvias posibles", color: "#f97316" };
    } else if (humedad > 80) {
        return { texto: "🌦 Ambiente húmedo, cielos variables", color: "#facc15" };
    } else if (vientoKMH > 30) {
        return { texto: "💨 Vientos fuertes, tiempo cambiante", color: "#a78bfa" };
    } else {
        return { texto: "☀️ Tiempo despejado y seco", color: "#38bdf8" };
    }
}

function proyectarDatos(datos, horas) {
    // Proyección simple basada en tendencias físicas básicas
    const factorHumedad = horas <= 6 ? 1.02 : horas <= 12 ? 1.04 : 1.06;
    const factorPresion = horas <= 6 ? 0.998 : horas <= 12 ? 0.995 : 0.99;
    const variacionTemp = horas <= 6 ? 0 : horas <= 12 ? -1 : -2;

    return {
        presion: Math.round(datos.presion * factorPresion),
        humedad: Math.min(100, Math.round(datos.humedad * factorHumedad)),
        vientoKMH: datos.vientoKMH,
        temperatura: datos.temperatura + variacionTemp
    };
}

// ── Función principal de IA ────────────────────────────────────────────────────

function generarPrediccionIA(datos) {
    // Predicción actual
    const actual = clasificarTiempo(datos.presion, datos.humedad, datos.vientoKMH);

    document.getElementById('prediccion').innerHTML =
        `<span style="color:${actual.color}; font-weight:bold;">${actual.texto}</span>`;

    // Mostrar contenedores
    document.getElementById('analisisContainer').style.display = 'grid';
    document.getElementById('pronosticoExtendido').style.display = 'block';

    // Índice de estabilidad y frentes
    document.getElementById('estabilidad').innerText =
        datos.humedad > 75 ? "⚠️ Inestable" : "✅ Estable";
    document.getElementById('frentes').innerText =
        datos.vientoKMH > 15 ? "🌬 Frente ventoso detectado" : "✅ Sin frentes significativos";

    // ── Pronóstico extendido: +6h, +12h, +24h ──────────────────────────────
    [6, 12, 24].forEach(horas => {
        const proj = proyectarDatos(datos, horas);
        const pred = clasificarTiempo(proj.presion, proj.humedad, proj.vientoKMH);

        const contenedor = document.querySelector(`#pronostico${horas}h .pronostico-contenido`);
        if (contenedor) {
            contenedor.innerHTML = `
                <span style="color:${pred.color}; font-weight:bold;">${pred.texto}</span><br>
                <small>🌡 ${proj.temperatura}°C &nbsp;|&nbsp; 💧 ${proj.humedad}% &nbsp;|&nbsp; ⏲ ${proj.presion} hPa</small>
            `;
        }
    });
}

// ── Historial toggle ───────────────────────────────────────────────────────────

window.toggleHistorial = function() {
    const contenido = document.getElementById('historialContenido');
    const icono = document.getElementById('historialToggleIcon');
    const visible = contenido.style.display === 'block';
    contenido.style.display = visible ? 'none' : 'block';
    icono.innerText = visible ? "▼ Mostrar" : "▲ Ocultar";
};
