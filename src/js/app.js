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