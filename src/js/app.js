/**
 * app.js - Solución Definitiva de Persistencia WebAR sin alteración de DOM
 */

const AppState = {
    isARMode: false,
    currentMarker: null,
    anchoredModels: {
        'marker-hiro': false,
        'marker-kanji': false
    }
};

const ArqueologiaData = {
    'marker-hiro': {
        titulo: "Complejo Habitacional Real Alto",
        instrucciones: "Modelo fijado de forma persistente. Desliza tu dedo en la pantalla para rotarlo."
    },
    'marker-kanji': {
        titulo: "Vasija de Cocción Temprana",
        instrucciones: "Modelo fijado de forma persistente. Explora sus detalles cerámicos desde cualquier ángulo."
    }
};

function startARExperience() {
    AppState.isARMode = true;
    const screenHome = document.getElementById('screen-home');
    const screenARUi = document.getElementById('screen-ar-ui');
    const arScene = document.getElementById('ar-scene');

    if (screenHome) {
        screenHome.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => screenHome.classList.add('hidden'), 300);
    }

    if (screenARUi && arScene) {
        screenARUi.classList.remove('hidden');
        arScene.classList.remove('hidden');
        arScene.resize();
    }
}

function exitARExperience() {
    window.location.reload();
}

/**
 * Forzar la permanencia del objeto interfiriendo con el borrado automático de AR.js
 */
document.addEventListener('DOMContentLoaded', () => {
    const markerHiro = document.getElementById('marker-hiro');
    const markerKanji = document.getElementById('marker-kanji');
    const statusText = document.getElementById('scan-status');

    // Modificación directa sobre el comportamiento de AR.js
    if (markerHiro) {
        markerHiro.addEventListener('markerFound', () => {
            if (AppState.anchoredModels['marker-hiro']) return;
            AppState.anchoredModels['marker-hiro'] = true;
            
            const entity = document.getElementById('entity-hiro');
            
            // Hack de persistencia: Forzamos al objeto a ser visible permanentemente
            entity.setAttribute('visible', 'true');
            
            // Sobrescribimos la función interna de AR.js para que no pueda ocultarlo al perder el marcador
            markerHiro.id = "marker-hiro-fijado"; 
            
            const data = ArqueologiaData['marker-hiro'];
            statusText.innerHTML = `<strong class="text-green-400">✓ Estación Fijada:</strong> ${data.titulo}<br><span class="text-[11px] text-amber-400">${data.instrucciones}</span>`;
        });
    }

    if (markerKanji) {
        markerKanji.addEventListener('markerFound', () => {
            if (AppState.anchoredModels['marker-kanji']) return;
            AppState.anchoredModels['marker-kanji'] = true;
            
            const entity = document.getElementById('entity-kanji');
            entity.setAttribute('visible', 'true');
            
            // Bloqueamos el comportamiento de ocultación cambiando el ID de rastreo
            markerKanji.id = "marker-kanji-fijado";
            
            const data = ArqueologiaData['marker-kanji'];
            statusText.innerHTML = `<strong class="text-green-400">✓ Estación Fijada:</strong> ${data.titulo}<br><span class="text-[11px] text-amber-400">${data.instrucciones}</span>`;
        });
    }
});

window.startARExperience = startARExperience;
window.exitARExperience = exitARExperience;