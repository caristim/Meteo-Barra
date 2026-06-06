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

const app = initializeApp(firebaseConfig );
const db = getFirestore(app);
// CAMBIO: Ahora usamos tu colección exacta 'meteorologia'
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
        vientoKMH: parseFloat(viento) || 0, // CAMBIO: Usamos tu nombre de campo vientoKMH
        direccionViento: dirViento,
        presion: parseInt(presion) || 0,
        lluvia: parseInt(lluvia) || 0,
        fecha: ahora.toLocaleDateString(), // Tu formato "D/M/YYYY"
        hora: ahora.toLocaleTimeString(),  // Tu formato de hora
        timestamp: Date.now(),             // Tu formato numérico para ordenar
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

// ESCUCHAR DATOS: Ordenamos por tu campo 'timestamp'
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
    
    // Mostramos tus datos usando tus nombres de campos
    document.getElementById('datosActuales').innerHTML = `
        <strong>🌡 Temp:</strong> ${ultima.temperatura} °C  

        <strong>💧 Humedad:</strong> ${ultima.humedad} %  

        <strong>💨 Viento:</strong> ${ultima.vientoKMH} km/h (${ultima.direccionViento})  

        <strong>⏲ Presión:</strong> ${ultima.presion} hPa  

        <strong>🌧 Lluvia:</strong> ${ultima.lluvia} mm  

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

function generarPrediccionIA(datos) {
    let prediccion = "Condiciones estables.";
    let color = "#38bdf8";

    // Lógica de IA ajustada a tus campos
    if (datos.presion < 1010 && datos.humedad > 85) {
        prediccion = "Alerta: Alta probabilidad de tormentas.";
        color = "#ef4444";
    } else if (datos.presion < 1015) {
        prediccion = "Cielos cubiertos con posibles lluvias aisladas.";
        color = "#f97316";
    } else {
        prediccion = "Tiempo despejado y seco.";
    }

    document.getElementById('prediccion').innerHTML = `<span style="color:${color}; font-weight:bold;">${prediccion}</span>`;
    
    // Activamos los paneles de análisis
    document.getElementById('analisisContainer').style.display = 'grid';
    document.getElementById('pronosticoExtendido').style.display = 'block';
    
    document.getElementById('estabilidad').innerText = datos.humedad > 75 ? "Inestable" : "Estable";
    document.getElementById('frentes').innerText = datos.vientoKMH > 15 ? "Frente ventoso detectado" : "Sin frentes significativos";
}

window.toggleHistorial = function() {
    const contenido = document.getElementById('historialContenido');
    const icono = document.getElementById('historialToggleIcon');
    contenido.classList.toggle('historial-oculto');
    contenido.classList.toggle('historial-visible');
    icono.innerText = contenido.classList.contains('historial-visible') ? "▲ Ocultar" : "▼ Mostrar";
};
