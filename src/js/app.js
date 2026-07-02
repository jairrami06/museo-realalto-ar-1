/**
 * app.js - Control de estado de la aplicación WebAR Museo Real Alto
 */

const DEFAULT_I18N = {
    es: {
        ui: {
            badge: 'Complejo Cultural',
            title: 'Museo Real Alto',
            location: 'Santa Elena · Ecuador',
            subtitle: 'Guía Interactiva en Realidad Aumentada',
            description: 'Descubre réplicas arqueológicas tridimensionales e historia interactiva directamente en el área abierta del museo.',
            start: 'Iniciar Recorrido WebAR',
            warning: 'Requiere permisos de cámara y un entorno bien iluminado',
            back: 'Volver al inicio',
            scanPrompt: 'Apunta la cámara hacia un tótem informativo del museo...',
            online: 'En línea',
            offline: 'Modo offline activo',
            detected: '¡Detectado!'
        },
        markers: {
            'marker-hiro': {
                title: 'Figura de la Cultura Valdivia',
                description: 'Estación 1: Reconstrucción 3D de figura de la cultura Valdivia.',
                anchorLost: 'Anclado en entorno',
                hint: 'El modelo permanece fijo. Apunta a otro tótem para cambiar.'
            },
            'marker-kanji': {
                title: 'Vasija de Cocción Temprana',
                description: 'Estación 2: Vestigio cerámico utilizado para la preparación de alimentos e intercambio comunitario.',
                anchorLost: 'Anclado en entorno',
                hint: 'El modelo permanece fijo. Apunta a otro tótem para cambiar.'
            }
        }
    },
    en: {
        ui: {
            badge: 'Cultural Center',
            title: 'Real Alto Museum',
            location: 'Santa Elena · Ecuador',
            subtitle: 'Interactive Augmented Reality Guide',
            description: 'Discover three-dimensional archaeological replicas and interactive history directly in the museum open area.',
            start: 'Start WebAR Tour',
            warning: 'Camera permission and a well-lit environment are required',
            back: 'Back to home',
            scanPrompt: 'Point the camera toward an information totem in the museum...',
            online: 'Online',
            offline: 'Offline mode active',
            detected: 'Detected!'
        },
        markers: {
            'marker-hiro': {
                title: 'Valdivia Culture Figure',
                description: 'Station 1: 3D reconstruction of a Valdivia culture figure.',
                anchorLost: 'Anchored in environment',
                hint: 'The model stays fixed. Point to another totem to switch.'
            },
            'marker-kanji': {
                title: 'Early Cooking Vessel',
                description: 'Station 2: Ceramic vestige used for food preparation and community exchange.',
                anchorLost: 'Anchored in environment',
                hint: 'The model stays fixed. Point to another totem to switch.'
            }
        }
    },
    fr: {
        ui: {
            badge: 'Centre culturel',
            title: 'Musee Real Alto',
            location: 'Santa Elena · Ecuador',
            subtitle: 'Guide interactif de realite augmentee',
            description: 'Decouvrez des replicas archeologiques tridimensionnels et une histoire interactive directement dans la zone ouverte du musee.',
            start: 'Lancer la visite WebAR',
            warning: 'Autorisation de la camera et environnement bien eclaire requis',
            back: 'Retour a l accueil',
            scanPrompt: 'Pointez la camera vers un totem d information du musee...',
            online: 'En ligne',
            offline: 'Mode hors ligne actif',
            detected: 'Detecte !'
        },
        markers: {
            'marker-hiro': {
                title: 'Figure de la culture Valdivia',
                description: 'Station 1 : Reconstruction 3D d une figure de la culture Valdivia.',
                anchorLost: 'Ancree dans l environnement',
                hint: 'Le modele reste fixe. Visez un autre totem pour changer.'
            },
            'marker-kanji': {
                title: 'Vase de cuisson ancien',
                description: 'Station 2 : Vestige ceramique utilise pour la preparation des aliments et les echanges communautaires.',
                anchorLost: 'Ancree dans l environnement',
                hint: 'Le modele reste fixe. Visez un autre totem pour changer.'
            }
        }
    }
};

// Estado global de la aplicación
const AppState = {
    isARMode: false,
    currentMarker: null,
    lang: 'es',
    i18n: DEFAULT_I18N
};

const SiteConfig = window.APP_CONFIG || {};
const R2_PUBLIC_URL = typeof SiteConfig.R2_PUBLIC_URL === 'string'
    ? SiteConfig.R2_PUBLIC_URL.replace(/\/$/, '')
    : '';
const MODEL_URLS = SiteConfig.MODEL_URLS || {};

function resolveModelUrl(assetId) {
    const remoteFileName = MODEL_URLS[assetId];

    if (R2_PUBLIC_URL && remoteFileName) {
        return `${R2_PUBLIC_URL}/${remoteFileName}`;
    }

    throw new Error(`Falta la URL remota para el asset ${assetId}`);
}

function setModelStatus(message, isError = false) {
    const statusText = document.getElementById('scan-status');
    if (!statusText) {
        return;
    }

    statusText.innerHTML = isError
        ? `<strong class="text-rose-400">Error</strong> ${message}`
        : `<strong class="text-amber-400">Cargando</strong> ${message}`;
}

function getPreferredLanguage() {
    const savedLang = localStorage.getItem('lang');
    if (savedLang && AppState.i18n[savedLang]) {
        return savedLang;
    }

    const browserLang = (navigator.language || navigator.userLanguage || 'es').slice(0, 2).toLowerCase();
    return AppState.i18n[browserLang] ? browserLang : 'es';
}

function getTranslationBundle(lang) {
    return AppState.i18n[lang] || AppState.i18n.es;
}

function getNestedValue(source, path, fallback = '') {
    return path.split('.').reduce((value, key) => {
        if (value && Object.prototype.hasOwnProperty.call(value, key)) {
            return value[key];
        }
        return undefined;
    }, source) ?? fallback;
}

function applyTranslations(lang) {
    const bundle = getTranslationBundle(lang);

    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach((element) => {
        const value = getNestedValue(bundle, element.dataset.i18n, element.textContent.trim());
        element.textContent = value;
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
        const value = getNestedValue(bundle, element.dataset.i18nAriaLabel, element.getAttribute('aria-label') || '');
        element.setAttribute('aria-label', value);
    });

    const networkStatus = document.getElementById('network-status');
    if (networkStatus) {
        networkStatus.textContent = navigator.onLine ? bundle.ui.online : bundle.ui.offline;
        networkStatus.classList.toggle('text-emerald-400', navigator.onLine);
        networkStatus.classList.toggle('text-amber-400', !navigator.onLine);
    }
}

async function loadI18n() {
    try {
        const response = await fetch('/i18n.json', { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const remoteI18n = await response.json();
        AppState.i18n = { ...DEFAULT_I18N, ...remoteI18n };
    } catch (error) {
        console.warn('No se pudo cargar i18n.json, usando textos locales.', error);
        AppState.i18n = DEFAULT_I18N;
    }
}

function setLanguage(lang) {
    if (!AppState.i18n[lang]) {
        return;
    }

    AppState.lang = lang;
    localStorage.setItem('lang', lang);
    applyTranslations(lang);

    document.querySelectorAll('[data-lang-choice]').forEach((button) => {
        const isSelected = button.dataset.langChoice === lang;
        button.classList.toggle('text-amber-400', isSelected);
        button.classList.toggle('text-stone-300', !isSelected);
        button.classList.toggle('bg-stone-950/70', isSelected);
        button.classList.toggle('bg-stone-950/40', !isSelected);
    });
}

function bindLanguageSwitcher() {
    document.querySelectorAll('[data-lang-choice]').forEach((button) => {
        button.addEventListener('click', () => setLanguage(button.dataset.langChoice));
    });
}

function bindNetworkEvents() {
    const updateStatus = () => applyTranslations(AppState.lang);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
}

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    try {
        await navigator.serviceWorker.register('/service-worker.js');
    } catch (error) {
        console.warn('No se pudo registrar el service worker.', error);
    }
}

async function requestCameraAccess() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia no está disponible en este navegador');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: { ideal: 'environment' }
        },
        audio: false
    });

    stream.getTracks().forEach((track) => track.stop());
}

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
async function startARExperience() {
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

    try {
        await requestCameraAccess();
    } catch (error) {
        console.warn('No se pudo obtener acceso a la cámara antes de iniciar AR.', error);
        alert('No fue posible activar la cámara. Revisa el permiso del navegador y vuelve a intentar.');
        return;
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
        arScene.style.display = 'block';
        
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
    loadI18n().then(() => {
        AppState.lang = getPreferredLanguage();
        setLanguage(AppState.lang);
    });

    const modelEstacion1 = document.getElementById('model-estacion1');
    const modelEstacion2 = document.getElementById('model-estacion2');

    if (modelEstacion1) {
        modelEstacion1.setAttribute('gltf-model', resolveModelUrl('model-estacion1'));
    }

    if (modelEstacion2) {
        modelEstacion2.setAttribute('gltf-model', resolveModelUrl('model-estacion2'));
    }

    if (modelEstacion1 || modelEstacion2) {
        setModelStatus('Iniciando carga de modelos remotos...');
    }

    Promise.all([
        modelEstacion1 ? new Promise((resolve, reject) => {
            modelEstacion1.addEventListener('model-loaded', resolve, { once: true });
            modelEstacion1.addEventListener('model-error', reject, { once: true });
        }) : Promise.resolve(),
        modelEstacion2 ? new Promise((resolve, reject) => {
            modelEstacion2.addEventListener('model-loaded', resolve, { once: true });
            modelEstacion2.addEventListener('model-error', reject, { once: true });
        }) : Promise.resolve()
    ]).then(() => {
        setModelStatus('Modelos listos. Apunta a una marca.');
    }).catch((error) => {
        console.warn('No se pudieron cargar uno o más modelos remotos.', error);
        setModelStatus('No se pudieron cargar los modelos desde R2. Revisa la URL o CORS.', true);
    });

    bindLanguageSwitcher();
    bindNetworkEvents();
    registerServiceWorker();

    const markerHiro = document.getElementById('marker-hiro');
    const markerKanji = document.getElementById('marker-kanji');
    const statusText = document.getElementById('scan-status');

    if (markerHiro && markerKanji && statusText) {
        
        markerHiro.addEventListener('markerFound', () => {
            AppState.currentMarker = 'marker-hiro';
            const bundle = getTranslationBundle(AppState.lang);
            const data = bundle.markers['marker-hiro'];
            statusText.innerHTML = `<strong class="text-green-400">${bundle.ui.detected}</strong> ${data.title}<br><span class="text-[11px] text-stone-400">${data.description}</span>`;
        });

        markerHiro.addEventListener('markerLost', () => {
            if (AppState.currentMarker === 'marker-hiro') {
                const data = getTranslationBundle(AppState.lang).markers['marker-hiro'];
                statusText.innerHTML = `<strong class="text-amber-400">${data.anchorLost}</strong> · ${data.title}<br><span class="text-[11px] text-stone-300">${data.hint}</span>`;
            }
        });

        markerKanji.addEventListener('markerFound', () => {
            AppState.currentMarker = 'marker-kanji';
            const bundle = getTranslationBundle(AppState.lang);
            const data = bundle.markers['marker-kanji'];
            statusText.innerHTML = `<strong class="text-green-400">${bundle.ui.detected}</strong> ${data.title}<br><span class="text-[11px] text-stone-400">${data.description}</span>`;
        });

        markerKanji.addEventListener('markerLost', () => {
            if (AppState.currentMarker === 'marker-kanji') {
                const data = getTranslationBundle(AppState.lang).markers['marker-kanji'];
                statusText.innerHTML = `<strong class="text-amber-400">${data.anchorLost}</strong> · ${data.title}<br><span class="text-[11px] text-stone-300">${data.hint}</span>`;
            }
        });
    }
});