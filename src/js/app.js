/**
 * app.js - Control de estado y Anclaje Persistente WebAR Museo Real Alto
 */

const AppState = {
    isARMode: false,
    currentMarker: null,
    // Registro para saber si un modelo ya fue anclado en el espacio
    anchoredModels: {
        'marker-hiro': false,
        'marker-kanji': false
    }
};

const ArqueologiaData = {
    'marker-hiro': {
        titulo: "Complejo Habitacional Real Alto",
        instrucciones: "Modelo anclado. Desliza tu dedo para rotar y examinar la estructura elíptica."
    },
    'marker-kanji': {
        titulo: "Vasija de Cocción Temprana",
        instrucciones: "Modelo anclado. Explora los detalles cerámicos de la pieza desde cualquier ángulo."
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
 * FUNCIÓN CRÍTICA: Desvincula el objeto del marcador y lo ancla al mundo físico
 * @param {string} markerId - ID del marcador detectado
 * @param {string} entityId - ID de la entidad 3D a anclar
 */
/**
 * FUNCIÓN CORREGIDA: Desvincula la entidad y la fuerza a posicionarse 
 * de forma relativa y visible ante la cámara del usuario.
 */
function anchorEntityToWorld(markerId, entityId) {
    if (AppState.anchoredModels[markerId]) return;

    const markerEl = document.getElementById(markerId);
    const entityEl = document.getElementById(entityId);
    const sceneEl = document.getElementById('ar-scene');
    const statusText = document.getElementById('scan-status');

    if (markerEl && entityEl && sceneEl) {
        AppState.anchoredModels[markerId] = true;
        AppState.currentMarker = markerId;

        // 1. Detener la animación por defecto de rotación automática para evitar conflictos de matrices
        entityEl.removeAttribute('animation');

        // 2. Mover la entidad fuera del marcador directo a la escena global
        sceneEl.appendChild(entityEl);

        // 3. Forzar posición fija relativa al horizonte del usuario
        // '0 0 -2' significa: 0 en X (centrado), 0 en Y (a la altura de los ojos), -2 en Z (2 metros al frente)
        entityEl.setAttribute('position', '0 0 -2');
        
        // 4. Resetear rotación inicial para que el control de gestos táctiles inicie en limpio
        entityEl.setAttribute('rotation', '0 0 0');

        // 5. Normalizar la escala para asegurar visibilidad macro en exteriores
        if (markerId === 'marker-hiro') {
            entityEl.setAttribute('scale', '0.4 0.4 0.4'); // Escala óptima para el patito de pruebas
        } else if (markerId === 'marker-kanji') {
            entityEl.setAttribute('scale', '0.15 0.15 0.15'); // Escala óptima para la lámpara
        }

        // 6. Forzar actualización del motor de renderizado de A-Frame
        if (entityEl.object3D) {
            entityEl.object3D.visible = true;
        }

        // 7. Actualizar la interfaz de usuario con éxito persistente
        const data = ArqueologiaData[markerId];
        statusText.innerHTML = `<strong class="text-green-400">✓ Estación Fijada:</strong> ${data.titulo}<br><span class="text-[11px] text-amber-400">${data.instrucciones}</span>`;
    }
}

// Escuchar eventos de inicialización de los marcadores
document.addEventListener('DOMContentLoaded', () => {
    const markerHiro = document.getElementById('marker-hiro');
    const markerKanji = document.getElementById('marker-kanji');

    if (markerHiro) {
        markerHiro.addEventListener('markerFound', () => {
            anchorEntityToWorld('marker-hiro', 'entity-hiro');
        });
    }

    if (markerKanji) {
        markerKanji.addEventListener('markerFound', () => {
            anchorEntityToWorld('marker-kanji', 'entity-kanji');
        });
    }
});

window.startARExperience = startARExperience;
window.exitARExperience = exitARExperience;