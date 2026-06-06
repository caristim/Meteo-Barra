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
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js').catch(function(err) {
            console.error('Error SW', err);
        });
    });
}

window.guardarDatos = async function() {
    var temp     = document.getElementById('temperatura').value;
    var hum      = document.getElementById('humedad').value;
    var viento   = document.getElementById('viento').value;
    var dirViento= document.getElementById('direccionViento').value;
    var presion  = document.getElementById('presion').value;
    var lluvia   = document.getElementById('lluvia').value;

    if (!temp || !hum) {
        alert("Por favor completa al menos temperatura y humedad.");
        return;
    }

    var ahora = new Date();
    var nuevaMedicion = {
        temperatura:    parseInt(temp),
        humedad:        parseInt(hum),
        vientoKMH:      parseFloat(viento) || 0,
        direccionViento: dirViento,
        presion:        parseInt(presion) || 1013,
        lluvia:         parseInt(lluvia) || 0,
        fecha:          ahora.toLocaleDateString(),
        hora:           ahora.toLocaleTimeString(),
        timestamp:      Date.now(),
        faseLunar:      "Calculada por sistema"
    };

    try {
        await addDoc(medicionesRef, nuevaMedicion);
        alert("¡Medición guardada correctamente!");
        document.querySelectorAll('input').forEach(function(i) { i.value = ''; });
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al conectar con Firebase.");
    }
};

onSnapshot(query(medicionesRef, orderBy("timestamp", "desc"), limit(20)), function(snapshot) {
    var mediciones = [];
    snapshot.forEach(function(doc) {
        mediciones.push(Object.assign({ id: doc.id }, doc.data()));
    });
    actualizarInterfaz(mediciones);
});

function actualizarInterfaz(mediciones) {
    if (mediciones.length === 0) return;
    var u = mediciones[0];

    document.getElementById('datosActuales').innerHTML =
        '<strong>🌡 Temp:</strong> ' + u.temperatura + ' °C<br>' +
        '<strong>💧 Humedad:</strong> ' + u.humedad + ' %<br>' +
        '<strong>💨 Viento:</strong> ' + u.vientoKMH + ' km/h (' + u.direccionViento + ')<br>' +
        '<strong>⏲ Presión:</strong> ' + u.presion + ' hPa<br>' +
        '<strong>🌧 Lluvia:</strong> ' + u.lluvia + ' mm<br>' +
        '<small>📅 ' + u.fecha + ' - ' + u.hora + '</small>';

    generarPrediccionIA(u);

    document.getElementById('historial').innerHTML = mediciones.map(function(m) {
        return '<div class="registro"><strong>' + m.fecha + ' ' + m.hora + '</strong>: ' +
               m.temperatura + '°C | ' + m.humedad + '% HR | ' + m.vientoKMH + ' km/h</div>';
    }).join('');
}

function clasificar(presion, humedad, viento) {
    if (presion < 1010 && humedad > 85) return { texto: "⛈ Alta probabilidad de tormentas",        color: "#ef4444" };
    if (presion < 1015 && humedad > 70) return { texto: "🌧 Cielos cubiertos con lluvias posibles", color: "#f97316" };
    if (humedad > 80)                   return { texto: "🌦 Ambiente húmedo, cielos variables",      color: "#facc15" };
    if (viento  > 30)                   return { texto: "💨 Vientos fuertes, tiempo cambiante",      color: "#a78bfa" };
                                        return { texto: "☀️ Tiempo despejado y seco",                color: "#38bdf8" };
}

function tarjetaHTML(pred, temp, hum, pres) {
    return '<span style="color:' + pred.color + '; font-weight:bold;">' + pred.texto + '</span><br>' +
           '<small>🌡 ' + temp + '°C &nbsp;|&nbsp; 💧 ' + hum + '% &nbsp;|&nbsp; ⏲ ' + pres + ' hPa</small>';
}

function generarPrediccionIA(d) {
    var pres = (d.presion  && d.presion  > 0) ? d.presion  : 1013;
    var hum  = (d.humedad  && d.humedad  > 0) ? d.humedad  : 50;
    var vien = (d.vientoKMH) ? d.vientoKMH : 0;
    var temp = (d.temperatura !== undefined) ? d.temperatura : 0;

    // Predicción actual
    var predActual = clasificar(pres, hum, vien);
    document.getElementById('prediccion').innerHTML =
        '<span style="color:' + predActual.color + '; font-weight:bold;">' + predActual.texto + '</span>';

    document.getElementById('analisisContainer').style.display   = 'grid';
    document.getElementById('pronosticoExtendido').style.display = 'block';

    document.getElementById('estabilidad').innerText = hum > 75 ? "⚠️ Inestable" : "✅ Estable";
    document.getElementById('frentes').innerText     = vien > 15 ? "🌬 Frente ventoso detectado" : "✅ Sin frentes significativos";

    // +6 horas
    var p6 = Math.round(pres * 0.998);
    var h6 = Math.min(100, Math.round(hum * 1.02));
    document.getElementById('pronostico6h').getElementsByClassName('pronostico-contenido')[0].innerHTML =
        tarjetaHTML(clasificar(p6, h6, vien), temp, h6, p6);

    // +12 horas
    var p12 = Math.round(pres * 0.995);
    var h12 = Math.min(100, Math.round(hum * 1.04));
    document.getElementById('pronostico12h').getElementsByClassName('pronostico-contenido')[0].innerHTML =
        tarjetaHTML(clasificar(p12, h12, vien), temp - 1, h12, p12);

    // +24 horas
    var p24 = Math.round(pres * 0.990);
    var h24 = Math.min(100, Math.round(hum * 1.06));
    document.getElementById('pronostico24h').getElementsByClassName('pronostico-contenido')[0].innerHTML =
        tarjetaHTML(clasificar(p24, h24, vien), temp - 2, h24, p24);
}

window.toggleHistorial = function() {
    var c = document.getElementById('historialContenido');
    var i = document.getElementById('historialToggleIcon');
    var abierto = c.style.display === 'block';
    c.style.display = abierto ? 'none' : 'block';
    i.innerText     = abierto ? "▼ Mostrar" : "▲ Ocultar";
};
