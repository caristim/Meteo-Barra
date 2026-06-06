// CONFIGURACIÓN DE FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCwDBudjX8-PPNwAZ9DX7YhXoOv1J4WbfI",
    authDomain: "meteo-barra.firebaseapp.com",
    projectId: "meteo-barra",
    storageBucket: "meteo-barra.firebasestorage.app",
    messagingSenderId: "147460415233",
    appId: "1:147460415233:web:4301c0ac30259692c40500"
};

// Inicializar Firebase
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

// FUNCIONES DE LA APLICACIÓN
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
    const fechaStr = ahora.toLocaleDateString('es-UY');
    const horaStr = ahora.toLocaleTimeString('es-UY');

    const nuevaMedicion = {
        temperatura: parseFloat(temp),
        humedad: parseFloat(hum),
        vientoKMH: parseFloat(viento) || 0,
        direccionViento: dirViento,
        presion: parseFloat(presion) || 0,
        lluvia: parseFloat(lluvia) || 0,
        fecha: fechaStr,
        hora: horaStr,
        timestamp: Date.now()
    };

    try {
        await addDoc(meteorologiaRef, nuevaMedicion);
        alert("¡Medición guardada correctamente!");
        limpiarFormulario();
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar en Firebase. Revisa la consola.");
    }
};

function limpiarFormulario() {
    document.getElementById('temperatura').value = '';
    document.getElementById('humedad').value = '';
    document.getElementById('viento').value = '';
    document.getElementById('presion').value = '';
    document.getElementById('lluvia').value = '';
}

// ESCUCHAR CAMBIOS EN TIEMPO REAL
// Ordenamos por timestamp (número unix) que es el campo confiable para ordenar
onSnapshot(query(meteorologiaRef, orderBy("timestamp", "desc"), limit(20)), (snapshot) => {
    const mediciones = [];
    snapshot.forEach((doc) => {
        mediciones.push({ id: doc.id, ...doc.data() });
    });
    actualizarInterfaz(mediciones);
}, (error) => {
    console.error("Error al leer Firestore:", error);
    document.getElementById('datosActuales').innerHTML = "<span style='color:red'>Error al conectar con Firebase. Revisá la consola.</span>";
});

function actualizarInterfaz(mediciones) {
    if (mediciones.length === 0) {
        document.getElementById('datosActuales').innerHTML = "Sin datos.";
        return;
    }

    const ultima = mediciones[0];

    // Fecha y hora: usar los campos string tal como están guardados
    const fechaStr = (ultima.fecha && ultima.hora)
        ? `${ultima.fecha} ${ultima.hora}`
        : ultima.timestamp
            ? new Date(ultima.timestamp).toLocaleString('es-UY')
            : "Sin fecha";

    // Viento: el campo se llama vientoKMH en los datos existentes
    const vientoVal = ultima.vientoKMH !== undefined ? ultima.vientoKMH : (ultima.viento || 0);

    document.getElementById('datosActuales').innerHTML = `
        <strong>🌡 Temp:</strong> ${ultima.temperatura} °C<br>
        <strong>💧 Humedad:</strong> ${ultima.humedad} %<br>
        <strong>💨 Viento:</strong> ${vientoVal} km/h (${ultima.direccionViento || '-'})<br>
        <strong>⏲ Presión:</strong> ${ultima.presion} hPa<br>
        <strong>🌧 Lluvia:</strong> ${ultima.lluvia} mm<br>
        ${ultima.faseLunar ? `<strong>🌙 Fase lunar:</strong> ${ultima.faseLunar}<br>` : ''}
        <small>📅 ${fechaStr}</small>
    `;

    generarPrediccionIA(ultima, vientoVal);

    // Historial
    const historialHTML = mediciones.map(m => {
        const f = (m.fecha && m.hora)
            ? `${m.fecha} ${m.hora}`
            : m.timestamp
                ? new Date(m.timestamp).toLocaleString('es-UY')
                : "...";
        const v = m.vientoKMH !== undefined ? m.vientoKMH : (m.viento || 0);
        return `
            <div class="registro">
                <strong>${f}</strong>: ${m.temperatura}°C | ${m.humedad}% HR | ${m.presion} hPa | ${v} km/h
            </div>
        `;
    }).join('');
    document.getElementById('historial').innerHTML = historialHTML;
}

function generarPrediccionIA(datos, vientoVal) {
    let prediccion = "Estable";
    let color = "#38bdf8";

    if (datos.presion < 1000 && datos.humedad > 80) {
        prediccion = "Alta probabilidad de tormenta inminente.";
        color = "#ef4444";
    } else if (datos.presion < 1010) {
        prediccion = "Cielos nubosos con posible lluvia.";
        color = "#f97316";
    } else if (datos.humedad < 30) {
        prediccion = "Ambiente muy seco, riesgo de incendios.";
        color = "#eab308";
    } else {
        prediccion = "Condiciones óptimas y despejado.";
    }

    document.getElementById('prediccion').innerHTML = `<span style="color:${color}; font-weight:bold;">${prediccion}</span>`;

    document.getElementById('analisisContainer').style.display = 'grid';
    document.getElementById('pronosticoExtendido').style.display = 'block';

    document.getElementById('estabilidad').innerText = datos.humedad > 70 ? "Inestable (Humedad alta)" : "Estable";
    document.getElementById('frentes').innerText = vientoVal > 15 ? "Frente de viento detectado" : "Sin frentes activos";
}

window.toggleHistorial = function() {
    const contenido = document.getElementById('historialContenido');
    const icono = document.getElementById('historialToggleIcon');

    if (contenido.classList.contains('historial-oculto')) {
        contenido.classList.remove('historial-oculto');
        contenido.classList.add('historial-visible');
        icono.innerText = "▲ Ocultar";
    } else {
        contenido.classList.remove('historial-visible');
        contenido.classList.add('historial-oculto');
        icono.innerText = "▼ Mostrar";
    }
};
