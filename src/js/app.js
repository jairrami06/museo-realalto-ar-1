/**
 * app.js - Control de estado de la aplicación WebAR Museo Real Alto
 */

// Estado global de la aplicación
const AppState = {
    isARMode: false,
    currentMarker: null
};

// Componente para leer el giroscopio físico y rotar un contenedor en sentido inverso
AFRAME.registerComponent('gyro-rotation', {
    init: function () {
        this.currentQuat = new THREE.Quaternion();
        this.initialQuat = null;
        
        window.addEventListener('deviceorientation', (event) => {
            if (!AppState.isARMode) return;
            
            const alpha = event.alpha; // Rotación Z (brújula)
            const beta = event.beta;   // Rotación X (inclinación frontal)
            const gamma = event.gamma; // Rotación Y (inclinación lateral)
            
            if (alpha === null || beta === null) return;
            
            // Actualizar etiqueta de depuración visual
            const debugEl = document.getElementById('gyro-debug');
            if (debugEl) {
                debugEl.classList.remove('text-rose-500');
                debugEl.classList.add('text-green-400');
                debugEl.innerHTML = `Giroscopio: OK (${Math.round(alpha)}°)`;
            }
            
            // Convertir a radianes
            const alphaRad = THREE.MathUtils.degToRad(alpha);
            const betaRad = THREE.MathUtils.degToRad(beta);
            const gammaRad = THREE.MathUtils.degToRad(gamma);
            
            // Convención estándar YXZ para giroscopios móviles
            const euler = new THREE.Euler(betaRad, alphaRad, -gammaRad, 'YXZ');
            this.currentQuat.setFromEuler(euler);
            
            if (!this.initialQuat) {
                this.initialQuat = this.currentQuat.clone();
            }
            
            // Calcular la rotación relativa desde el momento del anclaje
            const qDiff = this.initialQuat.clone().invert().multiply(this.currentQuat);
            
            // Rotar el contenedor en sentido inverso para cancelar la rotación física del celular
            this.el.object3D.quaternion.copy(qDiff.invert());
        });
    },
    
    resetOrientation: function () {
        this.initialQuat = null;
    }
});

// Registro del componente de anclaje para A-Frame
AFRAME.registerComponent('marker-anchor', {
    schema: {
        target: { type: 'selector' }
    },
    init: function () {
        this.markerVisible = false;
        this.justFound = false;
        
        this.el.addEventListener('markerFound', () => {
            this.markerVisible = true;
            this.justFound = true;
            if (this.data.target) {
                this.data.target.setAttribute('visible', 'true');
                this.data.target.dataset.discovered = "true"; // Marcar como descubierto
            }
        });
        
        this.el.addEventListener('markerLost', () => {
            this.markerVisible = false;
        });
    },
    tick: function () {
        const container = document.getElementById('world-anchor-container');
        const gyroComp = container ? container.components['gyro-rotation'] : null;
        
        if (this.markerVisible && this.data.target) {
            const markerObject = this.el.object3D;
            const targetObject = this.data.target.object3D;
            
            // Sincronizar el origen del giroscopio con el instante de detección
            if (this.justFound && gyroComp) {
                gyroComp.resetOrientation();
                this.justFound = false;
            }
            
            if (gyroComp) {
                // Obtener rotación inversa aplicada al contenedor
                const qDiff = gyroComp.el.object3D.quaternion.clone().invert();
                
                // Rotar y posicionar el modelo localmente dentro del contenedor
                // para que coincida con el marcador en el espacio del mundo real
                targetObject.position.copy(markerObject.position).applyQuaternion(qDiff);
                targetObject.quaternion.copy(qDiff).multiply(markerObject.quaternion);
            } else {
                targetObject.position.copy(markerObject.position);
                targetObject.quaternion.copy(markerObject.quaternion);
            }
        }
        
        // --- CONTROL DE VISIBILIDAD FUERA DE PLANO ---
        // Si el marcador no está visible pero el modelo ya fue descubierto, verificar si está fuera de pantalla
        if (!this.markerVisible && this.data.target && this.data.target.dataset.discovered === "true" && gyroComp) {
            const targetObject = this.data.target.object3D;
            const containerObject = container.object3D;
            
            // Calcular la posición del modelo con la rotación actual del contenedor aplicada
            const relativePos = targetObject.position.clone().applyQuaternion(containerObject.quaternion);
            relativePos.normalize();
            
            // Dirección hacia donde apunta la cámara de AR (siempre -Z)
            const cameraDir = new THREE.Vector3(0, 0, -1);
            const dotProduct = relativePos.dot(cameraDir);
            
            // Si el ángulo es mayor a ~40 grados (coseno < 0.76), el modelo se sale de pantalla
            if (dotProduct < 0.76) {
                if (this.data.target.getAttribute('visible') === 'true') {
                    this.data.target.setAttribute('visible', 'false');
                }
            } else {
                if (this.data.target.getAttribute('visible') === 'false') {
                    this.data.target.setAttribute('visible', 'true');
                }
            }
        }
    }
});

/**
 * Inicializa la experiencia de Realidad Aumentada
 * Oculta la UI de la Landing Page y activa el renderizado 3D/Cámara
 */
function startARExperience() {
    AppState.isARMode = true;
    
    // Alerta de depuración para contextos locales no seguros (HTTP por IP local)
    if (!window.isSecureContext) {
        alert("⚠️ ATENCIÓN: El sitio no se ejecuta bajo un contexto seguro (HTTPS o localhost). Los navegadores móviles bloquean el giroscopio en conexiones HTTP de IP local. El modelo quedará flotando estático en la pantalla.");
    }
    
    // Activar/solicitar permisos de giroscopio para iOS 13+
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                console.log("Permiso de orientación:", permissionState);
            })
            .catch(console.error);
    }
    
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
    window.location.reload();
}

// Exponer las funciones globalmente para los eventos 'onclick' de HTML
window.startARExperience = startARExperience;
window.exitARExperience = exitARExperience;

// =========================================================
// LÓGICA DE DETECCIÓN DE MARCADORES (AR -> UI)
// =========================================================

const ArqueologiaData = {
    'marker-hiro': {
        titulo: "Figura de la Cultura Valdivia",
        instrucciones: "Estación 1: Reconstrucción 3D de figura de la cultura Valdivia."
    },
    'marker-kanji': {
        titulo: "Vasija de Cocción Temprana",
        instrucciones: "Estación 2: Vestigio cerámico utilizado para la preparación de alimentos e intercambio comunitario."
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const markerHiro = document.getElementById('marker-hiro');
    const markerKanji = document.getElementById('marker-kanji');
    const statusText = document.getElementById('scan-status');

    if (markerHiro && markerKanji && statusText) {
        
        markerHiro.addEventListener('markerFound', () => {
            AppState.currentMarker = 'marker-hiro';
            const data = ArqueologiaData['marker-hiro'];
            statusText.innerHTML = `<strong class="text-green-400">¡Detectado!</strong> ${data.titulo}<br><span class="text-[11px] text-stone-400">${data.instrucciones}</span>`;
        });

        markerHiro.addEventListener('markerLost', () => {
            if (AppState.currentMarker === 'marker-hiro') {
                const data = ArqueologiaData['marker-hiro'];
                statusText.innerHTML = `<strong class="text-amber-400">Anclado en entorno</strong> · ${data.titulo}<br><span class="text-[11px] text-stone-300">El modelo permanece fijo. Apunta a otro tótem para cambiar.</span>`;
            }
        });

        markerKanji.addEventListener('markerFound', () => {
            AppState.currentMarker = 'marker-kanji';
            const data = ArqueologiaData['marker-kanji'];
            statusText.innerHTML = `<strong class="text-green-400">¡Detectado!</strong> ${data.titulo}<br><span class="text-[11px] text-stone-400">${data.instrucciones}</span>`;
        });

        markerKanji.addEventListener('markerLost', () => {
            if (AppState.currentMarker === 'marker-kanji') {
                const data = ArqueologiaData['marker-kanji'];
                statusText.innerHTML = `<strong class="text-amber-400">Anclado en entorno</strong> · ${data.titulo}<br><span class="text-[11px] text-stone-300">El modelo permanece fijo. Apunta a otro tótem para cambiar.</span>`;
            }
        });
    }
});