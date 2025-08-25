// Configuración de Directus
const DIRECTUS_CONFIG = {
    url: getConfig('directus.url', 'https://directus.luispinta.com'),
    sociosCollection: getConfig('directus.sociosCollection', 'matriz'),
    inauguracionCollection: getConfig('directus.inauguracionCollection', 'inauguracion')
};

// Estado global de la aplicación
let appState = {
    user: null,
    token: null,
    socios: [],
    respuestas: [],
    isLoading: false
};

// Elementos del DOM
const elements = {
    // Login
    loginScreen: document.getElementById('loginScreen'),
    loginForm: document.getElementById('loginForm'),
    loginError: document.getElementById('loginError'),
    loginLoading: document.getElementById('loginLoading'),
    
    // App principal
    appScreen: document.getElementById('appScreen'),
    userName: document.getElementById('userName'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    // Stats
    totalConfirmados: document.getElementById('totalConfirmados'),
    totalRepresentantes: document.getElementById('totalRepresentantes'),
    totalNoAsisten: document.getElementById('totalNoAsisten'),
    totalSinRespuesta: document.getElementById('totalSinRespuesta'),
    totalPersonas: document.getElementById('totalPersonas'),
    totalAdicionales: document.getElementById('totalAdicionales'),
    
    // Filters and table
    filtroRespuesta: document.getElementById('filtroRespuesta'),
    buscarSocio: document.getElementById('buscarSocio'),
    exportarBtn: document.getElementById('exportarBtn'),
    responsesTableBody: document.getElementById('responsesTableBody'),
    noDataMessage: document.getElementById('noDataMessage'),
    
    // Loading
    loadingOverlay: document.getElementById('loadingOverlay')
};

// Clase para manejar la API de Directus
class DirectusAPI {
    constructor(url) {
        this.baseURL = url;
        this.token = null;
    }

    async login(email, password) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.errors?.[0]?.message || 'Credenciales inválidas');
            }

            this.token = data.data.access_token;
            
            return {
                success: true,
                token: this.token,
                user: data.data.user || null
            };
        } catch (error) {
            devLog('Error en login:', error);
            
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Tiempo de espera agotado. Verifica tu conexión a internet.'
                };
            }
            
            if (error.message.includes('Failed to fetch')) {
                return {
                    success: false,
                    error: 'No se puede conectar al servidor. Verifica la URL de Directus.'
                };
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getSocios() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${this.baseURL}/items/${DIRECTUS_CONFIG.sociosCollection}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.errors?.[0]?.message || 'Error al obtener socios');
            }

            const data = await response.json();
            return {
                success: true,
                data: data.data || []
            };
        } catch (error) {
            devLog('Error en getSocios:', error);
            
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Tiempo de espera agotado al cargar socios.'
                };
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getRespuestas() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${this.baseURL}/items/${DIRECTUS_CONFIG.inauguracionCollection}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.errors?.[0]?.message || 'Error al obtener respuestas');
            }

            const data = await response.json();
            return {
                success: true,
                data: data.data || []
            };
        } catch (error) {
            devLog('Error en getRespuestas:', error);
            
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Tiempo de espera agotado al cargar respuestas.'
                };
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    logout() {
        this.token = null;
    }
}

// Instancia de la API
const api = new DirectusAPI(DIRECTUS_CONFIG.url);

// Funciones de utilidad
const utils = {
    showLoading() {
        elements.loadingOverlay.classList.remove('hidden');
    },

    hideLoading() {
        elements.loadingOverlay.classList.add('hidden');
    },

    showError(message, container = elements.loginError) {
        container.textContent = message;
        container.style.display = 'block';
        setTimeout(() => {
            container.style.display = 'none';
        }, 5000);
    },

    getRespuestaLabel(respuesta) {
        const respuestas = getConfig('app.respuestas');
        if (respuesta === respuestas.asistira) return 'Asistirá';
        if (respuesta === respuestas.noAsistira) return 'No Asistirá';
        if (respuesta === respuestas.representante) return 'Enviará Representante';
        return 'Sin Respuesta';
    },

    getRespuestaClass(respuesta) {
        const respuestas = getConfig('app.respuestas');
        if (respuesta === respuestas.asistira) return 'asistira';
        if (respuesta === respuestas.noAsistira) return 'no-asistira';
        if (respuesta === respuestas.representante) return 'representante';
        return 'sin-respuesta';
    },

    formatDate(dateString) {
        if (!dateString) return 'No registrada';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    calculateStats(socios, respuestas) {
        const respuestasConfig = getConfig('app.respuestas');
        
        let confirmados = 0;
        let representantes = 0;
        let noAsisten = 0;
        let totalPersonas = 0;
        let totalAdicionales = 0;

        respuestas.forEach(resp => {
            if (resp.respuesta === respuestasConfig.asistira) {
                confirmados++;
                totalPersonas += 1 + (resp.adicionales || 0);
                totalAdicionales += resp.adicionales || 0;
            } else if (resp.respuesta === respuestasConfig.representante) {
                representantes++;
                totalPersonas += 1 + (resp.adicionales || 0);
                totalAdicionales += resp.adicionales || 0;
            } else if (resp.respuesta === respuestasConfig.noAsistira) {
                noAsisten++;
            }
        });

        const sinRespuesta = socios.length - respuestas.length;

        return {
            confirmados,
            representantes,
            noAsisten,
            sinRespuesta,
            totalPersonas,
            totalAdicionales
        };
    },

    exportToCSV(data) {
        const headers = ['Socio', 'Cédula', 'Fundador', 'Respuesta', 'Adicionales', 'Total Personas', 'Fecha Respuesta'];
        const csvContent = [
            headers.join(','),
            ...data.map(row => [
                row.nombre,
                row.cedula,
                row.fundador,
                utils.getRespuestaLabel(row.respuesta),
                row.adicionales || 0,
                row.totalPersonas || 1,
                utils.formatDate(row.fechaRespuesta)
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `respuestas_inauguracion_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Manejadores de eventos
const handlers = {
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        elements.loginLoading.style.display = 'block';
        elements.loginError.style.display = 'none';

        const result = await api.login(email, password);

        elements.loginLoading.style.display = 'none';

        if (result.success) {
            devLog('Login exitoso:', result);
            appState.token = result.token;
            appState.user = result.user;
            
            // Manejar diferentes estructuras de usuario de Directus
            let displayName = email;
            if (result.user) {
                displayName = result.user.first_name || 
                            result.user.name || 
                            result.user.email || 
                            displayName;
            }
            elements.userName.textContent = displayName;
            
            await handlers.loadData();
            handlers.showApp();
        } else {
            utils.showError(result.error);
        }
    },

    async loadData() {
        utils.showLoading();
        
        try {
            const [sociosResult, respuestasResult] = await Promise.all([
                api.getSocios(),
                api.getRespuestas()
            ]);
            
            if (sociosResult.success) {
                appState.socios = sociosResult.data;
            } else {
                utils.showError('Error al cargar socios: ' + sociosResult.error);
            }

            if (respuestasResult.success) {
                appState.respuestas = respuestasResult.data;
            } else {
                utils.showError('Error al cargar respuestas: ' + respuestasResult.error);
            }

            handlers.updateDashboard();
            handlers.updateTable();
        } catch (error) {
            utils.showError('Error general al cargar datos: ' + error.message);
        }
        
        utils.hideLoading();
    },

    showApp() {
        elements.loginScreen.classList.add('hidden');
        elements.appScreen.classList.remove('hidden');
    },

    hideApp() {
        elements.appScreen.classList.add('hidden');
        elements.loginScreen.classList.remove('hidden');
        
        // Reset form
        elements.loginForm.reset();
        elements.loginError.style.display = 'none';
    },

    logout() {
        api.logout();
        appState.user = null;
        appState.token = null;
        appState.socios = [];
        appState.respuestas = [];
        handlers.hideApp();
    },

    updateDashboard() {
        const stats = utils.calculateStats(appState.socios, appState.respuestas);
        
        elements.totalConfirmados.textContent = stats.confirmados;
        elements.totalRepresentantes.textContent = stats.representantes;
        elements.totalNoAsisten.textContent = stats.noAsisten;
        elements.totalSinRespuesta.textContent = stats.sinRespuesta;
        elements.totalPersonas.textContent = stats.totalPersonas;
        elements.totalAdicionales.textContent = stats.totalAdicionales;
    },

    updateTable() {
        const filtro = elements.filtroRespuesta.value;
        const busqueda = elements.buscarSocio.value.toLowerCase();
        
        // Crear mapa de respuestas por idsocio
        const respuestasMap = {};
        appState.respuestas.forEach(resp => {
            respuestasMap[resp.idsocio] = resp;
        });

        // Combinar datos de socios con respuestas
        let tableData = appState.socios.map(socio => {
            const respuesta = respuestasMap[socio.idsocio];
            return {
                ...socio,
                respuesta: respuesta?.respuesta || 'SIN_RESPUESTA',
                adicionales: respuesta?.adicionales || 0,
                totalPersonas: respuesta ? 1 + (respuesta.adicionales || 0) : 1,
                fechaRespuesta: respuesta?.fechaconfirmacion || respuesta?.date_created || null
            };
        });

        // Aplicar filtros
        if (filtro) {
            tableData = tableData.filter(item => item.respuesta === filtro);
        }

        if (busqueda) {
            tableData = tableData.filter(item => 
                item.nombre.toLowerCase().includes(busqueda) ||
                item.cedula.includes(busqueda)
            );
        }

        // Limpiar tabla
        elements.responsesTableBody.innerHTML = '';

        if (tableData.length === 0) {
            elements.noDataMessage.classList.remove('hidden');
            document.querySelector('.responses-table-container').style.display = 'none';
        } else {
            elements.noDataMessage.classList.add('hidden');
            document.querySelector('.responses-table-container').style.display = 'block';

            // Llenar tabla
            tableData.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.nombre}</td>
                    <td>${item.cedula}</td>
                    <td>${item.fundador}</td>
                    <td>
                        <span class="response-badge ${utils.getRespuestaClass(item.respuesta)}">
                            ${utils.getRespuestaLabel(item.respuesta)}
                        </span>
                    </td>
                    <td>${item.adicionales}</td>
                    <td>${item.totalPersonas}</td>
                    <td>${utils.formatDate(item.fechaRespuesta)}</td>
                `;
                elements.responsesTableBody.appendChild(row);
            });
        }
    },

    handleFilter() {
        handlers.updateTable();
    },

    handleSearch() {
        handlers.updateTable();
    },

    handleExport() {
        const respuestasMap = {};
        appState.respuestas.forEach(resp => {
            respuestasMap[resp.idsocio] = resp;
        });

        const exportData = appState.socios.map(socio => {
            const respuesta = respuestasMap[socio.idsocio];
            return {
                ...socio,
                respuesta: respuesta?.respuesta || 'SIN_RESPUESTA',
                adicionales: respuesta?.adicionales || 0,
                totalPersonas: respuesta ? 1 + (respuesta.adicionales || 0) : 1,
                fechaRespuesta: respuesta?.fechaconfirmacion || respuesta?.date_created || null
            };
        });

        utils.exportToCSV(exportData);
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Login
    elements.loginForm.addEventListener('submit', handlers.handleLogin);
    elements.logoutBtn.addEventListener('click', handlers.logout);
    
    // Filters and search
    elements.filtroRespuesta.addEventListener('change', handlers.handleFilter);
    elements.buscarSocio.addEventListener('input', handlers.handleSearch);
    elements.exportarBtn.addEventListener('click', handlers.handleExport);
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        if (appState.token) {
            handlers.loadData();
        }
    }, 30000);
});

// Hacer funciones disponibles globalmente
window.handlers = handlers;
window.utils = utils;
