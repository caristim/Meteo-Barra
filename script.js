// CONFIGURACIÓN DE FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCwDBudjX8-PPNwAZ9DX7YhXoOv1J4WbfI",
    authDomain: "meteo-barra.firebaseapp.com",
    projectId: "meteo-barra",
    storageBucket: "meteo-barra.firebasestorage.app",
    messagingSenderId: "147460415233",
    appId: "1:147460415233:web:4301c0ac30259692c40500"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const meteorologiaRef = collection(db, "meteorologia");

// REGISTRAR SERVICE WORKER
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW registrado', reg))
            .catch(err => console.error('Error SW', err));
    });
}

// GUARDAR NUEVA MEDICIÓN
window.guardarDatos = async function() {
    const temp = document.getElementById('temperatura').value;
    const hum  = document.getElementById('humedad').value;
    const viento   = document.getElementById('viento').value;
    const dirViento = document.getElementById('direccionViento').value;
    const presion  = document.getElementById('presion').value;
    const lluvia   = document.getElementById('lluvia').value;

    if (!temp || !hum) {
        alert("Por favor completá al menos temperatura y humedad.");
        return;
    }

    const ahora = new Date();
    const nuevaMedicion = {
        temperatura:    parseFloat(temp),
        humedad:        parseFloat(hum),
        vientoKMH:      parseFloat(viento) || 0,
        direccionViento: dirViento,
        presion:        parseFloat(presion) || 0,
        lluvia:         parseFloat(lluvia)  || 0,
        fecha:          ahora.toLocaleDateString('es-UY'),
        hora:           ahora.toLocaleTimeString('es-UY'),
        timestamp:      Date.now()
    };

    try {
        await addDoc(meteorologiaRef, nuevaMedicion);
        alert("¡Medición guardada correctamente!");
        limpiarFormulario();
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar en Firebase. Revisá la consola.");
    }
};

function limpiarFormulario() {
    ['temperatura','humedad','viento','presion','lluvia'].forEach(id => {
        document.getElementById(id).value = '';
    });
}

// Convierte cualquier documento a un timestamp numérico para ordenar
function resolverTimestamp(doc) {
    if (doc.timestamp && typeof doc.timestamp === 'number') return doc.timestamp;
    if (doc.fecha && doc.hora) {
        // fecha: "26/5/2026", hora: "8:48:34 a.m."
        try {
            const [d, m, y] = doc.fecha.split('/');
            const horaLimpia = doc.hora.replace('a.m.','AM').replace('p.m.','PM');
            return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')} ${horaLimpia}`).getTime();
        } catch(e) { return 0; }
    }
    return 0;
}

function formatearFecha(doc) {
    if (doc.fecha && doc.hora) return `${doc.fecha} ${doc.hora}`;
    const ts = resolverTimestamp(doc);
    return ts ? new Date(ts).toLocaleString('es-UY') : "Sin fecha";
}

// CARGAR DATOS — usamos getDocs sin orderBy para evitar excluir docs sin timestamp,
// y ordenamos en el cliente
async function cargarDatos() {
    try {
        const snapshot = await getDocs(meteorologiaRef);
        const mediciones = [];
        snapshot.forEach(doc => mediciones.push({ id: doc.id, ...doc.data() }));

        // Ordenar por timestamp descendente (cliente)
        mediciones.sort((a, b) => resolverTimestamp(b) - resolverTimestamp(a));

        actualizarInterfaz(mediciones.slice(0, 20));
    } catch (error) {
        console.error("Error al leer Firestore:", error);
        document.getElementById('datosActuales').innerHTML =
            "<span style='color:red'>Error al conectar con Firebase. Revisá la consola.</span>";
    }
}

// ESCUCHAR CAMBIOS EN TIEMPO REAL para nuevas mediciones
onSnapshot(meteorologiaRef, (snapshot) => {
    const mediciones = [];
    snapshot.forEach(doc => mediciones.push({ id: doc.id, ...doc.data() }));
    mediciones.sort((a, b) => resolverTimestamp(b) - resolverTimestamp(a));
    actualizarInterfaz(mediciones.slice(0, 20));
}, (error) => {
    console.error("Error en onSnapshot:", error);
    // Si falla el listener en tiempo real, intentamos carga única
    cargarDatos();
});

function actualizarInterfaz(mediciones) {
    if (!mediciones || mediciones.length === 0) {
        document.getElementById('datosActuales').innerHTML = "Sin datos.";
        return;
    }

    const ultima = mediciones[0];
    const vientoVal = ultima.vientoKMH !== undefined ? ultima.vientoKMH : (ultima.viento || 0);
    const presionVal = ultima.presion || 0;
    const humedadVal = ultima.humedad || 0;

    // ÚLTIMA MEDICIÓN
    document.getElementById('datosActuales').innerHTML = `
        <strong>🌡 Temp:</strong> ${ultima.temperatura ?? '-'} °C<br>
        <strong>💧 Humedad:</strong> ${humedadVal} %<br>
        <strong>💨 Viento:</strong> ${vientoVal} km/h (${ultima.direccionViento || '-'})<br>
        <strong>⏲ Presión:</strong> ${presionVal} hPa<br>
        <strong>🌧 Lluvia:</strong> ${ultima.lluvia ?? 0} mm<br>
        ${ultima.faseLunar ? `<strong>🌙 Fase lunar:</strong> ${ultima.faseLunar}<br>` : ''}
        <small>📅 ${formatearFecha(ultima)}</small>
    `;

    // IA METEOROLÓGICA
    generarPrediccionIA(ultima, vientoVal, presionVal, humedadVal);

    // HISTORIAL
    const historialHTML = mediciones.map(m => {
        const v = m.vientoKMH !== undefined ? m.vientoKMH : (m.viento || 0);
        return `
            <div class="registro">
                <strong>${formatearFecha(m)}</strong>:
                ${m.temperatura ?? '-'}°C |
                ${m.humedad ?? '-'}% HR |
                ${m.presion ?? '-'} hPa |
                ${v} km/h
                ${m.faseLunar ? '| 🌙 ' + m.faseLunar : ''}
            </div>
        `;
    }).join('');
    document.getElementById('historial').innerHTML = historialHTML || "<p>Sin registros.</p>";
}

function generarPrediccionIA(datos, vientoVal, presionVal, humedadVal) {
    let prediccion = "Condiciones óptimas y despejado.";
    let color = "#38bdf8";

    if (presionVal < 1000 && humedadVal > 80) {
        prediccion = "Alta probabilidad de tormenta inminente.";
        color = "#ef4444";
    } else if (presionVal < 1010) {
        prediccion = "Cielos nubosos con posible lluvia.";
        color = "#f97316";
    } else if (humedadVal < 30) {
        prediccion = "Ambiente muy seco, riesgo de incendios.";
        color = "#eab308";
    }

    document.getElementById('prediccion').innerHTML =
        `<span style="color:${color}; font-weight:bold;">${prediccion}</span>`;

    document.getElementById('analisisContainer').style.display = 'grid';
    document.getElementById('pronosticoExtendido').style.display = 'block';

    document.getElementById('estabilidad').innerText =
        humedadVal > 70 ? "Inestable (Humedad alta)" : "Estable";
    document.getElementById('frentes').innerText =
        vientoVal > 15 ? "Frente de viento detectado" : "Sin frentes activos";
}

// TOGGLE HISTORIAL
window.toggleHistorial = function() {
    const contenido = document.getElementById('historialContenido');
    const icono     = document.getElementById('historialToggleIcon');
    const estaOculto = contenido.style.display === 'none' || contenido.style.display === '';

    contenido.style.display = estaOculto ? 'block' : 'none';
    icono.innerText = estaOculto ? '▲ Ocultar' : '▼ Mostrar';
};

// Arrancar con historial oculto
document.addEventListener('DOMContentLoaded', () => {
    const contenido = document.getElementById('historialContenido');
    if (contenido) contenido.style.display = 'none';
});
