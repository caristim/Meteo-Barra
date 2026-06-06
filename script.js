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
        presion: parseInt(presion) || 1013,
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

    document.getElementById('datosActuales').innerHTML =
        '<strong>🌡 Temp:</strong> ' + ultima.temperatura + ' °C<br>' +
        '<strong>💧 Humedad:</strong> ' + ultima.humedad + ' %<br>' +
        '<strong>💨 Viento:</strong> ' + ultima.vientoKMH + ' km/h (' + ultima.direccionViento + ')<br>' +
        '<strong>⏲ Presión:</strong> ' + ultima.presion + ' hPa<br>' +
        '<strong>🌧 Lluvia:</strong> ' + ultima.lluvia + ' mm<br>' +
        '<small>📅 ' + ultima.fecha + ' - ' + ultima.hora + '</small>';

    generarPrediccionIA(ultima);

    var historialHTML = mediciones.map(function(m) {
        return '<div class="registro"><strong>' + m.fecha + ' ' + m.hora + '</strong>: ' +
               m.temperatura + '°C | ' + m.humedad + '% HR | ' + m.vientoKMH + ' km/h</div>';
    }).join('');
    document.getElementById('historial').innerHTML = historialHTML;
}

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

function generarPrediccionIA(datos) {
    // Presión base: si viene 0 o undefined, usamos estándar 1013
    var presBase = datos.presion && datos.presion > 0 ? datos.presion : 1013;
    var humBase  = datos.humedad || 0;
    var vienBase = datos.vientoKMH || 0;
    var tempBase = datos.temperatura || 0;

    // Predicción actual
    var actual = clasificarTiempo(presBase, humBase, vienBase);
    document.getElementById('prediccion').innerHTML =
        '<span style="color:' + actual.color + '; font-weight:bold;">' + actual.texto + '</span>';

    // Mostrar contenedores
    document.getElementById('analisisContainer').style.display = 'grid';
    document.getElementById('pronosticoExtendido').style.display = 'block';

    // Estabilidad y frentes
    document.getElementById('estabilidad').innerText = humBase > 75 ? "⚠️ Inestable" : "✅ Estable";
    document.getElementById('frentes').innerText = vienBase > 15 ? "🌬 Frente ventoso detectado" : "✅ Sin frentes significativos";

    // Pronóstico +6h
    var pres6  = Math.round(presBase * 0.998);
    var hum6   = Math.min(100, Math.round(humBase * 1.02));
    var pred6  = clasificarTiempo(pres6, hum6, vienBase);
    var el6    = document.getElementById('pronostico6h');
    el6.querySelector('.pronostico-contenido').innerHTML =
        '<span style="color:' + pred6.color + '; font-weight:bold;">' + pred6.texto + '</span><br>' +
        '<small>🌡 ' + tempBase + '°C &nbsp;|&nbsp; 💧 ' + hum6 + '% &nbsp;|&nbsp; ⏲ ' + pres6 + ' hPa</small>';

    // Pronóstico +12h
    var pres12 = Math.round(presBase * 0.995);
    var hum12  = Math.min(100, Math.round(humBase * 1.04));
    var pred12 = clasificarTiempo(pres12, hum12, vienBase);
    var el12   = document.getElementById('pronostico12h');
    el12.querySelector('.pronostico-contenido').innerHTML =
        '<span style="color:' + pred12.color + '; font-weight:bold;">' + pred12.texto + '</span><br>' +
        '<small>🌡 ' + (tempBase - 1) + '°C &nbsp;|&nbsp; 💧 ' + hum12 + '% &nbsp;|&nbsp; ⏲ ' + pres12 + ' hPa</small>';

    // Pronóstico +24h
    var pres24 = Math.round(presBase * 0.99);
    var hum24  = Math.min(100, Math.round(humBase * 1.06));
    var pred24 = clasificarTiempo(pres24, hum24, vienBase);
    var el24   = document.getElementById('pronostico24h');
    el24.querySelector('.pronostico-contenido').innerHTML =
        '<span style="color:' + pred24.color + '; font-weight:bold;">' + pred24.texto + '</span><br>' +
        '<small>🌡 ' + (tempBase - 2) + '°C &nbsp;|&nbsp; 💧 ' + hum24 + '% &nbsp;|&nbsp; ⏲ ' + pres24 + ' hPa</small>';
}

window.toggleHistorial = function() {
    var contenido = document.getElementById('historialContenido');
    var icono = document.getElementById('historialToggleIcon');
    var visible = contenido.style.display === 'block';
    contenido.style.display = visible ? 'none' : 'block';
    icono.innerText = visible ? "▼ Mostrar" : "▲ Ocultar";
};
