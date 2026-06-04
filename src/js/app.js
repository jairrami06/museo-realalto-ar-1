/**
 * app.js - Anclaje Espacial Absoluto por Inyección de Entidades Fijas
 */

const AppState = {
    isARMode: false,
    anchoredModels: {
        'marker-hiro': false,
        'marker-kanji': false
    }
};

const ArqueologiaData = {
    'marker-hiro': {
        titulo: "Complejo Habitacional Real Alto",
        instrucciones: "Modelo anclado en el espacio real. Gira tu teléfono, el objeto se quedará fijo en este punto del entorno.",
        modelSrc: "#model-estacion1",
        scale: "0.5 0.5 0.5"
    },
    'marker-kanji': {
        titulo: "Vasija de Cocción Temprana",
        instrucciones: "Modelo anclado en el espacio real. Camina o gira el dispositivo; la pieza mantendrá su posición fija.",
        modelSrc: "#model-estacion2",
        scale: "0.15 0.15 0.15"
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
 * Instancia el modelo 3D directamente en el espacio absoluto del mundo,
 * desvinculándolo por completo del sistema de rastreo por marcadores.
 */
function anchorModelPermanently(markerId) {
    if (AppState.anchoredModels[markerId]) return;
    AppState.anchoredModels[markerId] = true;

    const sceneEl = document.getElementById('ar-scene');
    const statusText = document.getElementById('scan-status');
    const data = ArqueologiaData[markerId];

    if (sceneEl && data) {
        // 1. Crear una nueva entidad A-Frame desde cero
        const newEntity = document.createElement('a-entity');
        
        // 2. Configurar las propiedades del objeto arqueológico
        newEntity.setAttribute('gltf-model', data.modelSrc);
        newEntity.setAttribute('scale', data.scale);
        newEntity.setAttribute('class', 'clickable');
        
        // Asignar el componente de gestos para que responda a la rotación con el dedo
        newEntity.setAttribute('gesture-handler', 'rotationEnabled: true; scaleEnabled: false');

        // 3. ANCLAJE ESPACIAL ABSOLUTO:
        // Colocamos el objeto en la coordenada global (0, 0, -2) relativa al punto de inicio del usuario.
        // Esto hace que el objeto se quede clavado en ese punto del "aire", sin importar a dónde mires después.
        newEntity.setAttribute('position', '0 0 -2');
        newEntity.setAttribute('rotation', '0 0 0');

        // 4. Inyectar la entidad directamente en la escena, fuera de cualquier marcador
        sceneEl.appendChild(newEntity);

        // 5. Ocultar visualmente el marcador original para evitar renders dobles
        const originalMarker = document.getElementById(markerId);
        if (originalMarker) {
            originalMarker.setAttribute('visible', 'false');
        }

        // 6. Actualizar la interfaz de usuario de forma permanente
        statusText.innerHTML = `<strong class="text-green-400">✓ Objeto Fijado al Entorno:</strong> ${data.titulo}<br><span class="text-[11px] text-amber-400">${data.instrucciones}</span>`;
    }
}

// Escuchar los disparadores de los marcadores físicos
document.addEventListener('DOMContentLoaded', () => {
    const markerHiro = document.getElementById('marker-hiro');
    const markerKanji = document.getElementById('marker-kanji');

    if (markerHiro) {
        markerHiro.addEventListener('markerFound', () => {
            anchorModelPermanently('marker-hiro');
        });
    }

    if (markerKanji) {
        markerKanji.addEventListener('markerFound', () => {
            anchorModelPermanently('marker-kanji');
        });
    }
});

window.startARExperience = startARExperience;
window.exitARExperience = exitARExperience;