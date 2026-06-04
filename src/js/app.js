/**
 * app.js - Control de estado de la aplicación WebAR Museo Real Alto
 */

// Estado global de la aplicación
const AppState = {
    isARMode: false,
    currentMarker: null
};

/**
 * Inicializa la experiencia de Realidad Aumentada
 * Oculta la UI de la Landing Page y activa el renderizado 3D/Cámara
 */
function startARExperience() {
    AppState.isARMode = true;
    
    // UI Elements
    const screenHome = document.getElementById('screen-home');
    const screenARUi = document.getElementById('screen-ar-ui');
    const arScene = document.getElementById('ar-scene');

    // Animación de salida de la Landing Page (Fade out)
    if (screenHome) {
        screenHome.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
            screenHome.classList.add('hidden');
        }, 300); // Sincronizado con la transición de CSS
    }

    // Mostrar capa UI del escáner y la escena AR
    if (screenARUi && arScene) {
        screenARUi.classList.remove('hidden');
        arScene.classList.remove('hidden');
        
        // Forzar al motor de A-Frame a redimensionar y capturar la cámara de forma nativa
        arScene.resize();
    }
}

/**
 * Retorna al usuario al menú principal liberando los recursos de hardware
 */
function exitARExperience() {
    // Al trabajar con WebAR nativo (Webcam), la forma más óptima y segura 
    // de apagar la cámara y limpiar la memoria GPU es recargando la pestaña.
    window.location.reload();
}

// Exponer las funciones globalmente para los eventos 'onclick' de HTML
window.startARExperience = startARExperience;
window.exitARExperience = exitARExperience;

// =========================================================
// LÓGICA DE DETECCIÓN DE MARCADORES (AR -> UI)
// =========================================================

// Datos temporales de las piezas para la validación de la experiencia
const ArqueologiaData = {
    'marker-hiro': {
        titulo: "Complejo Habitacional Real Alto",
        instrucciones: "Estación 1: Reconstrucción 3D de las chozas elípticas de la cultura Valdivia (Fase I)."
    },
    'marker-kanji': {
        titulo: "Vasija de Cocción Temprana",
        instrucciones: "Estación 2: Vestigio cerámico utilizado para la preparación de alimentos e intercambio comunitario."
    }
};

// Esperar a que el DOM esté completamente cargado para enlazar los listeners
document.addEventListener('DOMContentLoaded', () => {
    const markerHiro = document.getElementById('marker-hiro');
    const markerKanji = document.getElementById('marker-kanji');
    const statusText = document.getElementById('scan-status');

    if (markerHiro && markerKanji && statusText) {
        
        // --- Eventos para el Marcador Hiro ---
        markerHiro.addEventListener('markerFound', () => {
            AppState.currentMarker = 'marker-hiro';
            const data = ArqueologiaData['marker-hiro'];
            
            // Cambiar dinámicamente el texto inferior con éxito
            statusText.innerHTML = `<strong class="text-green-400">¡Detectado!</strong> ${data.titulo}<br><span class="text-[11px] text-stone-400">${data.instrucciones}</span>`;
        });

        markerHiro.addEventListener('markerLost', () => {
            clearScannerStatus(statusText);
        });

        // --- Eventos para el Marcador Kanji ---
        markerKanji.addEventListener('markerFound', () => {
            AppState.currentMarker = 'marker-kanji';
            const data = ArqueologiaData['marker-kanji'];
            
            statusText.innerHTML = `<strong class="text-green-400">¡Detectado!</strong> ${data.titulo}<br><span class="text-[11px] text-stone-400">${data.instrucciones}</span>`;
        });

        markerKanji.addEventListener('markerLost', () => {
            clearScannerStatus(statusText);
        });
    }
});

/**
 * Restablece el estado visual del banner informativo al perder el enfoque
 */
function clearScannerStatus(element) {
    AppState.currentMarker = null;
    element.innerHTML = `Apunta la cámara hacia un tótem informativo del museo...`;
}