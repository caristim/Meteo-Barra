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

// ---------- GUARDAR DATOS (con decimales en temperatura y conversión de viento) ----------
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
        temperatura:    parseFloat(temp),          // ← permite decimales
        humedad:        parseInt(hum),
        vientoKMH:      (parseFloat(viento) || 0) * 3.6, // convierte m/s → km/h
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

// ---------- FUNCIÓN PARA CALCULAR SENSACIÓN TÉRMICA ----------
function calcularSensacionTermica(temp, humedad, viento_kmh) {
    // Wind Chill (para temp ≤ 10°C y viento > 4.8 km/h)
    if (temp <= 10 && viento_kmh > 4.8) {
        const v = Math.pow(viento_kmh, 0.16);
        const wc = 13.12 + 0.6215 * temp - 11.37 * v + 0.3965 * temp * v;
        return { valor: wc, label: "viento" };
    }
    // Heat Index (para temp ≥ 26°C y humedad > 40%)
    if (temp >= 26 && humedad > 40) {
        // Convertir temp a °F para la fórmula
        const Tf = temp * 9/5 + 32;
        const H = humedad;
        // Fórmula de la NOAA (resultado en °F)
        const HI_F = -42.379 + 2.04901523 * Tf + 10.14333127 * H
                   - 0.22475541 * Tf * H - 0.00683783 * Tf * Tf
                   - 0.05481717 * H * H + 0.00122874 * Tf * Tf * H
                   + 0.00085282 * Tf * H * H - 0.00000199 * Tf * Tf * H * H;
        // Convertir a °C
        const HI_C = (HI_F - 32) * 5/9;
        return { valor: HI_C, label: "humedad" };
    }
    // Si no aplica, la sensación es la temperatura real
    return { valor: temp, label: "real" };
}

// ---------- ACTUALIZAR INTERFAZ (con decimales y sensación térmica) ----------
function actualizarInterfaz(mediciones) {
    if (mediciones.length === 0) return;
    var u = mediciones[0];

    // Mostrar temperatura con 1 decimal
    const tempMostrar = u.temperatura.toFixed(1);

    // Calcular sensación térmica
    const st = calcularSensacionTermica(u.temperatura, u.humedad, u.vientoKMH);
    let stTexto = '';
    if (st.label === 'viento') {
        stTexto = `🌬 Sensación térmica: ${st.valor.toFixed(1)} °C (por viento)`;
    } else if (st.label === 'humedad') {
        stTexto = `🔥 Sensación térmica: ${st.valor.toFixed(1)} °C (por humedad)`;
    } else {
        stTexto = `🌡 Sensación térmica: ${st.valor.toFixed(1)} °C`;
    }

    document.getElementById('datosActuales').innerHTML =
        `<strong>🌡 Temp:</strong> ${tempMostrar} °C<br>` +
        `<strong>💧 Humedad:</strong> ${u.humedad} %<br>` +
        `<strong>💨 Viento:</strong> ${u.vientoKMH} km/h (${u.direccionViento})<br>` +
        `<strong>⏲ Presión:</strong> ${u.presion} hPa<br>` +
        `<strong>🌧 Lluvia:</strong> ${u.lluvia} mm<br>` +
        `<small>📅 ${u.fecha} - ${u.hora}</small><br><br>` +
        `<span style="font-size:1.1em; background:rgba(255,255,255,0.1); padding:4px 12px; border-radius:20px;">${stTexto}</span>`;

    // Generar pronóstico (sin cambios)
    generarPrediccionIA(mediciones);

    // Historial (con 1 decimal en temperatura)
    document.getElementById('historial').innerHTML = mediciones.map(function(m) {
        return `<div class="registro"><strong>${m.fecha} ${m.hora}</strong>: ` +
               `${m.temperatura.toFixed(1)}°C | ${m.humedad}% HR | ${m.vientoKMH} km/h</div>`;
    }).join('');
}

// ---------- CLASIFICACIÓN Y PREDICCIÓN (sin cambios) ----------
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

async function generarPrediccionIA(mediciones) {
    if (!mediciones || mediciones.length === 0) return;

    const actual = mediciones[0];
    const pres = actual.presion || 1013;
    const hum = actual.humedad || 50;
    const vien = actual.vientoKMH || 0;
    const temp = actual.temperatura || 0;

    // Histórico
    let muestras = Math.min(10, mediciones.length);
    let sumaTemp = 0, sumaHum = 0, sumaPres = 0;
    for (let i = 0; i < muestras; i++) {
        sumaTemp += mediciones[i].temperatura || temp;
        sumaHum += mediciones[i].humedad || hum;
        sumaPres += mediciones[i].presion || pres;
    }
    const promTemp = sumaTemp / muestras;
    const promHum = sumaHum / muestras;
    const promPres = sumaPres / muestras;

    const tendenciaTemp = temp - promTemp;
    const tendenciaHum = hum - promHum;
    const tendenciaPres = pres - promPres;

    // Open-Meteo
    let modelo = null;
    try {
        const url =
            "https://api.open-meteo.com/v1/forecast" +
            "?latitude=-33.742" +
            "&longitude=-53.373" +
            "&hourly=temperature_2m,relative_humidity_2m,surface_pressure" +
            "&forecast_days=2";
        const respuesta = await fetch(url);
        modelo = await respuesta.json();
    } catch (e) {
        console.error("Open-Meteo:", e);
    }

    function obtenerModelo(horas) {
        if (!modelo || !modelo.hourly) {
            return { temperatura: temp, humedad: hum, presion: pres };
        }
        return {
            temperatura: modelo.hourly.temperature_2m[horas],
            humedad: modelo.hourly.relative_humidity_2m[horas],
            presion: modelo.hourly.surface_pressure[horas]
        };
    }

    const meteo6 = obtenerModelo(6);
    const meteo12 = obtenerModelo(12);
    const meteo24 = obtenerModelo(24);

    // Pronóstico actual
    const predActual = clasificar(pres, hum, vien);
    document.getElementById('prediccion').innerHTML =
        '<span style="color:' + predActual.color + '; font-weight:bold;">' + predActual.texto + '</span>';

    document.getElementById('analisisContainer').style.display = 'grid';
    document.getElementById('pronosticoExtendido').style.display = 'block';

    document.getElementById('estabilidad').innerText =
        Math.abs(tendenciaPres) > 2 ? "⚠️ Cambios atmosféricos detectados" : "✅ Estable";

    document.getElementById('frentes').innerText =
        vien > 15 ? "🌬 Frente ventoso detectado" : "✅ Sin frentes significativos";

    // +6 horas
    const p6 = Math.round((meteo6.presion + pres + tendenciaPres) / 2);
    const h6 = Math.round((meteo6.humedad + hum + tendenciaHum) / 2);
    const t6 = Math.round((meteo6.temperatura + temp + tendenciaTemp) / 2);
    document.getElementById('pronostico6h')
        .getElementsByClassName('pronostico-contenido')[0]
        .innerHTML = tarjetaHTML(clasificar(p6, h6, vien), t6, h6, p6);

    // +12 horas
    const p12 = Math.round((meteo12.presion + pres + tendenciaPres) / 2);
    const h12 = Math.round((meteo12.humedad + hum + tendenciaHum) / 2);
    const t12 = Math.round((meteo12.temperatura + temp + tendenciaTemp) / 2);
    document.getElementById('pronostico12h')
        .getElementsByClassName('pronostico-contenido')[0]
        .innerHTML = tarjetaHTML(clasificar(p12, h12, vien), t12, h12, p12);

    // +24 horas
    const p24 = Math.round((meteo24.presion + pres + tendenciaPres) / 2);
    const h24 = Math.round((meteo24.humedad + hum + tendenciaHum) / 2);
    const t24 = Math.round((meteo24.temperatura + temp + tendenciaTemp) / 2);
    document.getElementById('pronostico24h')
        .getElementsByClassName('pronostico-contenido')[0]
        .innerHTML = tarjetaHTML(clasificar(p24, h24, vien), t24, h24, p24);
}

// ---------- ESCUCHA EN TIEMPO REAL ----------
onSnapshot(query(medicionesRef, orderBy("timestamp", "desc"), limit(20)), function(snapshot) {
    var mediciones = [];
    snapshot.forEach(function(doc) {
        mediciones.push(Object.assign({ id: doc.id }, doc.data()));
    });
    actualizarInterfaz(mediciones);
});

// ---------- TOGGLE HISTORIAL (sin cambios) ----------
window.toggleHistorial = function() {
    var c = document.getElementById('historialContenido');
    var i = document.getElementById('historialToggleIcon');
    var abierto = c.style.display === 'block';
    c.style.display = abierto ? 'none' : 'block';
    i.innerText     = abierto ? "▼ Mostrar" : "▲ Ocultar";
};
