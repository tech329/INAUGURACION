// Configuración de Directus para formulario público
const DIRECTUS_CONFIG = {
    url: window.AppConfig?.directus?.url || 'https://directus.luispinta.com',
    sociosCollection: window.AppConfig?.directus?.sociosCollection || 'matriz',
    inauguracionCollection: window.AppConfig?.directus?.inauguracionCollection || 'inauguracion',
    staticToken: window.AppConfig?.directus?.staticToken || null
};

// Estado del formulario
let formState = {
    currentStep: 'search',
    socio: null,
    respuestaSeleccionada: null,
    adicionalesCount: 0,
    isLoading: false
};

// Elementos del DOM
const elements = {
    // Steps
    searchStep: document.getElementById('searchStep'),
    invitationStep: document.getElementById('invitationStep'),
    accompaniedStep: document.getElementById('accompaniedStep'),
    additionalStep: document.getElementById('additionalStep'),
    confirmationStep: document.getElementById('confirmationStep'),
    
    // Step 1 - Búsqueda
    searchForm: document.getElementById('searchForm'),
    cedulaInput: document.getElementById('cedula'),
    searchError: document.getElementById('searchError'),
    searchLoading: document.getElementById('searchLoading'),
    
    // Step 2 - Información del socio
    socioNombre: document.getElementById('socioNombre'),
    btnAsistire: document.getElementById('btnAsistire'),
    btnNoAsistire: document.getElementById('btnNoAsistire'),
    btnRepresentante: document.getElementById('btnRepresentante'),
    
    // Step 3 - Acompañantes
    btnConAcompanantes: document.getElementById('btnConAcompanantes'),
    btnSinAcompanantes: document.getElementById('btnSinAcompanantes'),
    
    // Step 4 - Adicionales
    additionalForm: document.getElementById('additionalForm'),
    adicionales: document.getElementById('adicionales'),
    
    // Step 5 - Confirmación
    confirmationTitle: document.getElementById('confirmationTitle'),
    confirmationContent: document.getElementById('confirmationContent'),
    btnNuevaConsulta: document.getElementById('btnNuevaConsulta'),
    
    // Global
    globalError: document.getElementById('globalError'),
    globalLoading: document.getElementById('globalLoading')
};

// Clase para manejar la API de Directus sin autenticación
class DirectusPublicAPI {
    constructor(url) {
        this.baseURL = url;
    }

    async buscarSocio(cedula) {
        try {
            console.log('Buscando socio con cédula:', cedula);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            // Buscar socio por cédula usando filtros de Directus
            const url = `${this.baseURL}/items/${DIRECTUS_CONFIG.sociosCollection}?filter[cedula][_eq]=${encodeURIComponent(cedula)}`;
            console.log('URL de búsqueda:', url);
            
            // Configurar headers
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Agregar token si está disponible
            if (DIRECTUS_CONFIG.staticToken) {
                headers['Authorization'] = `Bearer ${DIRECTUS_CONFIG.staticToken}`;
                console.log('Usando token estático para autenticación');
            } else {
                console.log('Usando acceso público (sin token)');
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('Respuesta del servidor:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                
                if (response.status === 403) {
                    throw new Error('No tienes permisos para acceder a los datos. Contacta al administrador.');
                }
                
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            console.log('Datos recibidos:', data);
            
            return {
                success: true,
                data: data.data || []
            };
        } catch (error) {
            console.error('Error en buscarSocio:', error);
            
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Tiempo de espera agotado. Verifica tu conexión.'
                };
            }
            
            if (error.message.includes('Failed to fetch')) {
                return {
                    success: false,
                    error: 'No se puede conectar al servidor. Verifica tu conexión a internet.'
                };
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async verificarRespuestaExistente(idsocio) {
        try {
            console.log('Verificando respuesta existente para socio:', idsocio);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const url = `${this.baseURL}/items/${DIRECTUS_CONFIG.inauguracionCollection}?filter[idsocio][_eq]=${idsocio}`;
            console.log('URL verificación:', url);
            
            // Configurar headers
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Agregar token si está disponible
            if (DIRECTUS_CONFIG.staticToken) {
                headers['Authorization'] = `Bearer ${DIRECTUS_CONFIG.staticToken}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.log('No se pudo verificar respuesta existente, continuando...');
                return {
                    success: true,
                    data: []
                };
            }

            const data = await response.json();
            console.log('Respuesta existente:', data);
            
            return {
                success: true,
                data: data.data || []
            };
        } catch (error) {
            console.error('Error en verificarRespuestaExistente:', error);
            // No es crítico, continúa sin respuesta existente
            return {
                success: true,
                data: []
            };
        }
    }

    async enviarRespuesta(respuestaData) {
        try {
            console.log('Enviando respuesta:', respuestaData);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const url = `${this.baseURL}/items/${DIRECTUS_CONFIG.inauguracionCollection}`;
            console.log('URL envío:', url);

            // Configurar headers
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Agregar token si está disponible
            if (DIRECTUS_CONFIG.staticToken) {
                headers['Authorization'] = `Bearer ${DIRECTUS_CONFIG.staticToken}`;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(respuestaData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('Respuesta envío:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Error al enviar:', errorData);
                
                if (response.status === 403) {
                    throw new Error('No tienes permisos para enviar respuestas. Contacta al administrador.');
                }
                
                throw new Error(errorData.errors?.[0]?.message || `Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            console.log('Respuesta enviada exitosamente:', data);
            
            return {
                success: true,
                data: data.data
            };
        } catch (error) {
            console.error('Error en enviarRespuesta:', error);
            
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Tiempo de espera agotado al enviar respuesta.'
                };
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async actualizarRespuesta(id, respuestaData) {
        try {
            console.log('Actualizando respuesta ID:', id, 'con datos:', respuestaData);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const url = `${this.baseURL}/items/${DIRECTUS_CONFIG.inauguracionCollection}/${id}`;
            console.log('URL actualización:', url);

            // Configurar headers
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Agregar token si está disponible
            if (DIRECTUS_CONFIG.staticToken) {
                headers['Authorization'] = `Bearer ${DIRECTUS_CONFIG.staticToken}`;
            }

            const response = await fetch(url, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify(respuestaData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('Respuesta actualización:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Error al actualizar:', errorData);
                
                if (response.status === 403) {
                    throw new Error('No tienes permisos para actualizar respuestas. Contacta al administrador.');
                }
                
                throw new Error(errorData.errors?.[0]?.message || `Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            console.log('Respuesta actualizada exitosamente:', data);
            
            return {
                success: true,
                data: data.data
            };
        } catch (error) {
            console.error('Error en actualizarRespuesta:', error);
            
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Tiempo de espera agotado al actualizar respuesta.'
                };
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Instancia de la API
const api = new DirectusPublicAPI(DIRECTUS_CONFIG.url);

// Funciones de utilidad
const utils = {
    showStep(stepName) {
        console.log('Mostrando step:', stepName);
        
        // Ocultar todos los steps
        Object.keys(elements).forEach(key => {
            if (key.includes('Step') && elements[key]) {
                elements[key].classList.add('hidden');
            }
        });
        
        // Mostrar el step solicitado
        const stepElement = elements[stepName + 'Step'];
        if (stepElement) {
            stepElement.classList.remove('hidden');
            formState.currentStep = stepName;
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    showLoading(show = true) {
        if (elements.globalLoading) {
            if (show) {
                elements.globalLoading.classList.remove('hidden');
            } else {
                elements.globalLoading.classList.add('hidden');
            }
        }
    },

    showError(message, duration = 5000) {
        console.error('Error:', message);
        
        if (elements.globalError && elements.globalError.querySelector('span')) {
            elements.globalError.querySelector('span').textContent = message;
            elements.globalError.classList.remove('hidden');
            
            if (duration > 0) {
                setTimeout(() => {
                    elements.globalError.classList.add('hidden');
                }, duration);
            }
        } else {
            alert(message); // Fallback
        }
    },

    hideError() {
        if (elements.globalError) {
            elements.globalError.classList.add('hidden');
        }
    },

    formatCedula(cedula) {
        return cedula.replace(/\D/g, '');
    },

    validateCedula(cedula) {
        const cleaned = utils.formatCedula(cedula);
        return cleaned.length >= 7 && cleaned.length <= 11;
    },

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    getRespuestaTextoCompleto(respuesta) {
        switch(respuesta) {
            case 'ASISTIRÁ':
                return 'Asistiré al evento';
            case 'NO ASISTIRÁ':
                return 'No podré asistir';
            case 'ENVIARÁ UN REPRESENTANTE':
                return 'Enviaré un representante';
            default:
                return 'Sin respuesta';
        }
    },

    buildConfirmationContent(esActualizacion = false) {
        const socio = formState.socio;
        const respuesta = formState.respuestaSeleccionada;
        const adicionales = formState.adicionalesCount;
        const total = 1 + adicionales;

        let respuestaTexto = '';
        let personasTexto = '';
        
        switch(respuesta) {
            case 'asistire':
                respuestaTexto = 'Confirmo mi asistencia';
                personasTexto = adicionales > 0 ? 
                    `Asistirás con ${adicionales} ${adicionales === 1 ? 'acompañante' : 'acompañantes'}` :
                    'Asistirás solo/a';
                break;
            case 'no_asistire':
                respuestaTexto = 'No podré asistir';
                personasTexto = '';
                break;
            case 'representante':
                respuestaTexto = 'Enviaré un representante';
                personasTexto = adicionales > 0 ? 
                    `Tu representante irá con ${adicionales} ${adicionales === 1 ? 'persona adicional' : 'personas adicionales'}` :
                    'Tu representante irá solo/a';
                break;
        }

        const accionTexto = esActualizacion ? 'actualizada' : 'registrada';

        return `
            <div class="confirmation-details">
                <div class="success-message">
                    <i class="fas fa-check-circle"></i>
                    <p>Tu respuesta ha sido ${accionTexto} correctamente</p>
                </div>
                
                <div class="detail-item">
                    <strong>Socio:</strong> ${socio.nombre}
                </div>
                <div class="detail-item">
                    <strong>Cédula:</strong> ${socio.cedula}
                </div>
                <div class="detail-item">
                    <strong>Respuesta:</strong> ${respuestaTexto}
                </div>
                ${adicionales > 0 ? `
                <div class="detail-item">
                    <strong>Personas adicionales:</strong> ${adicionales}
                </div>
                <div class="detail-item">
                    <strong>Total de personas:</strong> ${total}
                </div>
                ` : ''}
                ${personasTexto ? `
                <div class="detail-item highlight">
                    <i class="fas fa-info-circle"></i> ${personasTexto}
                </div>
                ` : ''}
            </div>
            <div class="event-reminder">
                <h4><i class="fas fa-calendar-alt"></i> Recordatorio del Evento</h4>
                <p><strong>Fecha:</strong> Domingo 31 de agosto</p>
                <p><strong>Hora:</strong> 9:00 AM</p>
                <p><strong>Lugar:</strong> Machachi</p>
                <div class="reminder-note">
                    <i class="fas fa-info-circle"></i>
                    <span>Si necesitas cambiar tu respuesta nuevamente, puedes volver a llenar este formulario usando la misma cédula.</span>
                </div>
            </div>
        `;
    }
};

// Manejadores de eventos
const handlers = {
    async buscarSocio(e) {
        e.preventDefault();
        
        const cedula = elements.cedulaInput.value.trim();
        console.log('Buscando socio con cédula:', cedula);
        
        if (!utils.validateCedula(cedula)) {
            utils.showError('Por favor ingresa un número de cédula válido (7-11 dígitos)');
            return;
        }

        const cedulaLimpia = utils.formatCedula(cedula);
        
        utils.showLoading(true);
        utils.hideError();

        const result = await api.buscarSocio(cedulaLimpia);
        utils.showLoading(false);

        if (result.success) {
            if (result.data.length === 0) {
                utils.showError('No se encontró ningún socio con esa cédula. Verifica que el número sea correcto.');
                return;
            }

            // Socio encontrado
            formState.socio = result.data[0];
            console.log('Socio encontrado:', formState.socio);
            
            // Verificar si ya tiene respuesta
            await handlers.verificarRespuestaExistente();
            
            // Mostrar información del socio
            if (elements.socioNombre) {
                elements.socioNombre.textContent = utils.capitalize(formState.socio.nombre);
            }
            
            utils.showStep('invitation');
        } else {
            utils.showError(result.error);
        }
    },

    async verificarRespuestaExistente() {
        console.log('Verificando respuesta existente...');
        const result = await api.verificarRespuestaExistente(formState.socio.idsocio);
        
        if (result.success && result.data.length > 0) {
            formState.respuestaExistente = result.data[0];
            console.log('Respuesta existente encontrada:', formState.respuestaExistente);
            
            // Mostrar el step de respuesta existente en lugar del de selección
            handlers.mostrarRespuestaExistente();
        } else {
            formState.respuestaExistente = null;
            console.log('No hay respuesta existente, mostrando opciones');
        }
    },

    mostrarRespuestaExistente() {
        console.log('Mostrando respuesta existente');
        
        const respuestaExistente = formState.respuestaExistente;
        let respuestaTexto = '';
        let iconoRespuesta = '';
        let claseRespuesta = '';
        
        switch(respuestaExistente.respuesta) {
            case 'ASISTIRÁ':
                respuestaTexto = 'confirmado tu asistencia';
                iconoRespuesta = 'fas fa-check-circle';
                claseRespuesta = 'confirmed';
                break;
            case 'NO ASISTIRÁ':
                respuestaTexto = 'confirmado que no asistirás';
                iconoRespuesta = 'fas fa-times-circle';
                claseRespuesta = 'declined';
                break;
            case 'ENVIARÁ UN REPRESENTANTE':
                respuestaTexto = 'confirmado que enviarás un representante';
                iconoRespuesta = 'fas fa-user-friends';
                claseRespuesta = 'delegate';
                break;
        }

        const adicionales = respuestaExistente.adicionales || 0;
        const fechaRespuesta = respuestaExistente.fechaconfirmacion || respuestaExistente.date_created ? 
            new Date(respuestaExistente.fechaconfirmacion || respuestaExistente.date_created).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'Fecha no disponible';

        // Crear contenido para mostrar la respuesta existente
        const existingResponseHtml = `
            <div class="step-card existing-response ${claseRespuesta}">
                <div class="step-header">
                    <h3><i class="${iconoRespuesta}"></i> ¡Muchas gracias!</h3>
                    <p>Ya has <strong>${respuestaTexto}</strong> al evento</p>
                </div>
                
                <div class="response-details">
                    <div class="detail-item">
                        <strong>Tu respuesta:</strong> ${utils.getRespuestaTextoCompleto(respuestaExistente.respuesta)}
                    </div>
                    ${adicionales > 0 ? `
                    <div class="detail-item">
                        <strong>Personas adicionales:</strong> ${adicionales}
                    </div>
                    <div class="detail-item">
                        <strong>Total de personas:</strong> ${1 + adicionales}
                    </div>
                    ` : ''}
                    <div class="detail-item">
                        <strong>Fecha de confirmación:</strong> ${fechaRespuesta}
                    </div>
                </div>

                <div class="response-actions">
                    <button id="btnCambiarRespuesta" class="secondary-btn">
                        <i class="fas fa-edit"></i>
                        Cambiar mi respuesta
                    </button>
                    <button id="btnNuevaConsultaExistente" class="tertiary-btn">
                        <i class="fas fa-search"></i>
                        Nueva consulta
                    </button>
                </div>
            </div>
        `;

        // Reemplazar el contenido del step de invitation
        const invitationStep = elements.invitationStep;
        if (invitationStep) {
            invitationStep.innerHTML = existingResponseHtml;
            
            // Agregar event listeners a los nuevos botones
            const btnCambiarRespuesta = document.getElementById('btnCambiarRespuesta');
            const btnNuevaConsultaExistente = document.getElementById('btnNuevaConsultaExistente');
            
            if (btnCambiarRespuesta) {
                btnCambiarRespuesta.addEventListener('click', handlers.cambiarRespuesta);
            }
            if (btnNuevaConsultaExistente) {
                btnNuevaConsultaExistente.addEventListener('click', handlers.nuevaConsulta);
            }
        }
    },

    cambiarRespuesta() {
        console.log('Cambiando respuesta existente');
        
        // Restaurar el contenido original del step de invitation
        handlers.restaurarStepInvitation();
        
        // Marcar que estamos editando una respuesta existente
        formState.editandoRespuesta = true;
    },

    restaurarStepInvitation() {
        const invitationStep = elements.invitationStep;
        if (invitationStep) {
            // Restaurar HTML original del step
            invitationStep.innerHTML = `
                <div class="step-card">
                    <div class="step-header">
                        <h3><i class="fas fa-envelope-open"></i> ¡Hola <span id="socioNombre">${utils.capitalize(formState.socio.nombre)}</span>!</h3>
                        <p>Nos complace invitarte a nuestra inauguración oficial</p>
                    </div>
                    
                    <div class="event-details">
                        <div class="event-info">
                            <p><i class="fas fa-calendar-alt"></i> <strong>Fecha:</strong> Domingo 31 de agosto</p>
                            <p><i class="fas fa-clock"></i> <strong>Hora:</strong> 9:00 AM</p>
                            <p><i class="fas fa-map-marker-alt"></i> <strong>Lugar:</strong> Machachi</p>
                        </div>
                    </div>

                    <div class="response-options">
                        <h4>Por favor, confirma tu asistencia:</h4>
                        
                        <button id="btnAsistire" class="response-btn attend">
                            <i class="fas fa-check-circle"></i>
                            <span>Asistiré al evento</span>
                        </button>
                        
                        <button id="btnNoAsistire" class="response-btn decline">
                            <i class="fas fa-times-circle"></i>
                            <span>No podré asistir</span>
                        </button>
                        
                        <button id="btnRepresentante" class="response-btn delegate">
                            <i class="fas fa-user-friends"></i>
                            <span>Enviaré un representante</span>
                        </button>
                    </div>
                </div>
            `;
            
            // Volver a agregar los event listeners
            const btnAsistire = document.getElementById('btnAsistire');
            const btnNoAsistire = document.getElementById('btnNoAsistire');
            const btnRepresentante = document.getElementById('btnRepresentante');
            
            if (btnAsistire) {
                btnAsistire.addEventListener('click', () => handlers.seleccionarRespuesta('asistire'));
            }
            if (btnNoAsistire) {
                btnNoAsistire.addEventListener('click', () => handlers.seleccionarRespuesta('no_asistire'));
            }
            if (btnRepresentante) {
                btnRepresentante.addEventListener('click', () => handlers.seleccionarRespuesta('representante'));
            }
        }
    },

    seleccionarRespuesta(tipoRespuesta) {
        console.log('Respuesta seleccionada:', tipoRespuesta);
        formState.respuestaSeleccionada = tipoRespuesta;
        
        if (tipoRespuesta === 'asistire') {
            // Si va a asistir, preguntar por acompañantes
            utils.showStep('accompanied');
            handlers.configurarStepAcompanantes('Perfecto! ¿Asistirás acompañado?');
        } else if (tipoRespuesta === 'representante') {
            // Si envía representante, también preguntar por acompañantes
            utils.showStep('accompanied');
            handlers.configurarStepAcompanantes('¿Tu representante irá acompañado?');
        } else {
            // Si no asiste, finalizar directamente
            formState.adicionalesCount = 0;
            handlers.finalizarRespuesta();
        }
    },

    configurarStepAcompanantes(pregunta) {
        const accompaniedStep = elements.accompaniedStep;
        if (accompaniedStep) {
            // Actualizar el texto de la pregunta según el contexto
            const stepHeader = accompaniedStep.querySelector('.step-header h3');
            const stepDescription = accompaniedStep.querySelector('.step-header p');
            
            if (stepHeader && stepDescription) {
                if (formState.respuestaSeleccionada === 'asistire') {
                    stepHeader.innerHTML = '<i class="fas fa-users"></i> ¡Perfecto! ¿Asistirás acompañado?';
                    stepDescription.textContent = 'Cuéntanos si vendrás con personas adicionales';
                    
                    // Actualizar textos de botones
                    const btnConAcomp = accompaniedStep.querySelector('#btnConAcompanantes span');
                    const btnSinAcomp = accompaniedStep.querySelector('#btnSinAcompanantes span');
                    if (btnConAcomp) btnConAcomp.textContent = 'SÍ, vendré acompañado/a';
                    if (btnSinAcomp) btnSinAcomp.textContent = 'NO, asistiré solo/a';
                    
                } else if (formState.respuestaSeleccionada === 'representante') {
                    stepHeader.innerHTML = '<i class="fas fa-users"></i> ¿Tu representante irá acompañado?';
                    stepDescription.textContent = 'Indícanos si tu representante llevará personas adicionales';
                    
                    // Actualizar textos de botones
                    const btnConAcomp = accompaniedStep.querySelector('#btnConAcompanantes span');
                    const btnSinAcomp = accompaniedStep.querySelector('#btnSinAcompanantes span');
                    if (btnConAcomp) btnConAcomp.textContent = 'SÍ, irá acompañado/a';
                    if (btnSinAcomp) btnSinAcomp.textContent = 'NO, irá solo/a';
                }
            }
        }
    },

    seleccionarAcompanantes(conAcompanantes) {
        console.log('Acompañantes:', conAcompanantes);
        
        if (conAcompanantes) {
            // Configurar el step de adicionales según el contexto
            handlers.configurarStepAdicionales();
            // Ir a step de adicionales
            utils.showStep('additional');
        } else {
            // Sin acompañantes, finalizar
            formState.adicionalesCount = 0;
            handlers.finalizarRespuesta();
        }
    },

    configurarStepAdicionales() {
        const additionalStep = elements.additionalStep;
        if (additionalStep) {
            const stepHeader = additionalStep.querySelector('.step-header h3');
            const stepDescription = additionalStep.querySelector('.step-header p');
            const submitButton = additionalStep.querySelector('button[type="submit"]');
            
            if (stepHeader && stepDescription && submitButton) {
                if (formState.respuestaSeleccionada === 'asistire') {
                    stepHeader.innerHTML = '<i class="fas fa-plus-circle"></i> Acompañantes';
                    stepDescription.textContent = '¿Cuántas personas vendrán contigo? (sin incluirte a ti)';
                    submitButton.innerHTML = '<i class="fas fa-check"></i> Confirmar Asistencia';
                    
                } else if (formState.respuestaSeleccionada === 'representante') {
                    stepHeader.innerHTML = '<i class="fas fa-plus-circle"></i> Personas Adicionales';
                    stepDescription.textContent = '¿Cuántas personas irán con tu representante? (sin incluir al representante)';
                    submitButton.innerHTML = '<i class="fas fa-check"></i> Confirmar Representación';
                }
            }
        }
    },

    procesarAdicionales(e) {
        e.preventDefault();
        
        const adicionales = parseInt(elements.adicionales.value) || 0;
        
        if (adicionales < 0 || adicionales > 10) {
            utils.showError('El número de personas adicionales debe estar entre 0 y 10');
            return;
        }

        formState.adicionalesCount = adicionales;
        console.log('Adicionales seleccionados:', adicionales);
        
        handlers.finalizarRespuesta();
    },

    async finalizarRespuesta() {
        console.log('Finalizando respuesta...');
        
        // Mapear respuesta a formato de base de datos
        let respuestaDB;
        switch(formState.respuestaSeleccionada) {
            case 'asistire':
                respuestaDB = 'ASISTIRÁ';
                break;
            case 'no_asistire':
                respuestaDB = 'NO ASISTIRÁ';
                break;
            case 'representante':
                respuestaDB = 'ENVIARÁ UN REPRESENTANTE';
                break;
            default:
                utils.showError('Error: Respuesta no válida');
                return;
        }

        const respuestaData = {
            idsocio: formState.socio.idsocio,
            respuesta: respuestaDB,
            adicionales: formState.adicionalesCount,
            fechaconfirmacion: new Date().toISOString()
        };

        console.log('Enviando respuesta:', respuestaData);
        
        utils.showLoading(true);
        
        // Determinar si crear nueva respuesta o actualizar existente
        let result;
        if (formState.respuestaExistente && formState.editandoRespuesta) {
            console.log('Actualizando respuesta existente...');
            result = await api.actualizarRespuesta(formState.respuestaExistente.id, respuestaData);
        } else {
            console.log('Creando nueva respuesta...');
            result = await api.enviarRespuesta(respuestaData);
        }
        
        utils.showLoading(false);

        if (result.success) {
            console.log('Respuesta procesada exitosamente');
            
            // Actualizar contenido de confirmación
            if (elements.confirmationContent) {
                const esActualizacion = formState.respuestaExistente && formState.editandoRespuesta;
                elements.confirmationContent.innerHTML = utils.buildConfirmationContent(esActualizacion);
            }
            
            // Actualizar título de confirmación
            if (elements.confirmationTitle) {
                const esActualizacion = formState.respuestaExistente && formState.editandoRespuesta;
                elements.confirmationTitle.textContent = esActualizacion ? 
                    '¡Respuesta actualizada exitosamente!' : 
                    '¡Respuesta registrada exitosamente!';
            }
            
            utils.showStep('confirmation');
        } else {
            utils.showError(result.error);
        }
    },

    nuevaConsulta() {
        console.log('Nueva consulta iniciada');
        
        // Reset completo del formulario
        formState.currentStep = 'search';
        formState.socio = null;
        formState.respuestaSeleccionada = null;
        formState.adicionalesCount = 0;
        formState.respuestaExistente = null;
        formState.editandoRespuesta = false;
        
        // Limpiar formularios
        if (elements.searchForm) {
            elements.searchForm.reset();
        }
        if (elements.additionalForm) {
            elements.additionalForm.reset();
        }
        
        utils.hideError();
        utils.showStep('search');
        
        // Focus en el input de cédula
        if (elements.cedulaInput) {
            elements.cedulaInput.focus();
        }
    },

    // Validación de entrada de cédula
    formatCedulaInput(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) {
            value = value.substring(0, 11);
        }
        e.target.value = value;
    },

    // Validación de personas adicionales
    validateAdicionales(e) {
        let value = parseInt(e.target.value);
        if (isNaN(value) || value < 0) {
            e.target.value = 0;
        } else if (value > 10) {
            e.target.value = 10;
        }
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('Formulario inicializado');
    console.log('Configuración Directus:', DIRECTUS_CONFIG);
    
    // Verificar que tenemos los elementos necesarios
    console.log('Elementos encontrados:', {
        searchForm: !!elements.searchForm,
        cedulaInput: !!elements.cedulaInput,
        btnAsistire: !!elements.btnAsistire,
        btnNoAsistire: !!elements.btnNoAsistire,
        btnRepresentante: !!elements.btnRepresentante
    });
    
    // Formulario de búsqueda
    if (elements.searchForm) {
        elements.searchForm.addEventListener('submit', handlers.buscarSocio);
    }
    
    // Botones de respuesta principal
    if (elements.btnAsistire) {
        elements.btnAsistire.addEventListener('click', () => handlers.seleccionarRespuesta('asistire'));
    }
    if (elements.btnNoAsistire) {
        elements.btnNoAsistire.addEventListener('click', () => handlers.seleccionarRespuesta('no_asistire'));
    }
    if (elements.btnRepresentante) {
        elements.btnRepresentante.addEventListener('click', () => handlers.seleccionarRespuesta('representante'));
    }
    
    // Botones de acompañantes
    if (elements.btnConAcompanantes) {
        elements.btnConAcompanantes.addEventListener('click', () => handlers.seleccionarAcompanantes(true));
    }
    if (elements.btnSinAcompanantes) {
        elements.btnSinAcompanantes.addEventListener('click', () => handlers.seleccionarAcompanantes(false));
    }
    
    // Formulario de adicionales
    if (elements.additionalForm) {
        elements.additionalForm.addEventListener('submit', handlers.procesarAdicionales);
    }
    
    // Botón nueva consulta
    if (elements.btnNuevaConsulta) {
        elements.btnNuevaConsulta.addEventListener('click', handlers.nuevaConsulta);
    }
    
    // Validaciones en tiempo real
    if (elements.cedulaInput) {
        elements.cedulaInput.addEventListener('input', handlers.formatCedulaInput);
        elements.cedulaInput.focus();
    }
    
    if (elements.adicionales) {
        elements.adicionales.addEventListener('input', handlers.validateAdicionales);
    }
    
    // Prevenir envío con Enter en campos numéricos
    if (elements.adicionales) {
        elements.adicionales.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handlers.procesarAdicionales(e);
            }
        });
    }
    
    console.log('Event listeners configurados correctamente');
});

// Hacer funciones disponibles globalmente para debugging
window.handlers = handlers;
window.utils = utils;
window.formState = formState;
window.api = api;
