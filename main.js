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

    async exportToPDF(data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const imageToDataUrl = async (url) => {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }

        const logoUrl = 'https://i.postimg.cc/zBPmbxNT/TRANSPARENTE-min.png';
        const logoDataUrl = await imageToDataUrl(logoUrl);

        // Sort data by 'fundador'
        data.sort((a, b) => (a.fundador > b.fundador) ? 1 : -1);

        const headers = [['Socio', 'Cédula', 'Fundador', 'Respuesta', 'Adicionales', 'Total Personas', 'Fecha Respuesta']];
        const body = data.map(row => [
            row.nombre,
            row.cedula,
            row.fundador,
            utils.getRespuestaLabel(row.respuesta),
            row.adicionales || 0,
            row.totalPersonas,
            utils.formatDate(row.fechaRespuesta)
        ]);

        const drawHeader = (data) => {
            doc.setFillColor(0, 23, 73); // #001749
            doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
            doc.addImage(logoDataUrl, 'PNG', 15, 5, 30, 30);
            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.text('Respuestas de Invitación a la Inauguración', 55, 25);
        };

        const drawFooter = (data) => {
            var str = 'Página ' + doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
        };

        // Summary Page
        drawHeader({ settings: { margin: { left: 15 } } });
        const stats = utils.calculateStats(appState.socios, appState.respuestas);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Resumen de Asistencia', 15, 60);
        doc.autoTable({
            startY: 70,
            head: [['Categoría', 'Total']],
            body: [
                ['Asistirán', stats.confirmados],
                ['Enviarán Representante', stats.representantes],
                ['No Asistirán', stats.noAsisten],
                ['Sin Respuesta', stats.sinRespuesta],
                ['Total de Personas que Asistirán', stats.totalPersonas],
                ['Personas Adicionales', stats.totalAdicionales]
            ],
            headStyles: {
                fillColor: [228, 132, 16] // #e48410
            },
        });

        // Detailed List Page
        doc.addPage();

        doc.autoTable({
            head: headers,
            body: body,
            startY: 50,
            headStyles: {
                fillColor: [0, 23, 73], // #001749
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold'
            },
            didDrawPage: function (data) {
                drawHeader(data);
                drawFooter(data);
            },
            margin: { top: 50, bottom: 30 },
            // Configuración simple y efectiva para evitar cortes de filas
            rowPageBreak: 'avoid',
            showHead: 'everyPage',
            // Configuración de estilos compacta como en 12.pdf
            styles: {
                cellPadding: 2,
                fontSize: 9,
                valign: 'middle',
                lineColor: [200, 200, 200],
                lineWidth: 0.1
            },
            // Colores alternos sutiles según tipo de respuesta
            didParseCell: function(data) {
                if (data.section === 'body') {
                    const respuesta = data.row.raw[3]; // Columna de respuesta
                    
                    // Colores muy sutiles según respuesta
                    if (respuesta === 'Asistirá') {
                        data.cell.styles.fillColor = [245, 252, 245]; // Verde muy suave
                    } else if (respuesta === 'Enviará Representante') {
                        data.cell.styles.fillColor = [245, 249, 255]; // Azul muy suave
                    } else if (respuesta === 'No Asistirá') {
                        data.cell.styles.fillColor = [255, 245, 245]; // Rojo muy suave
                    } else if (respuesta === 'Sin Respuesta') {
                        data.cell.styles.fillColor = [255, 251, 240]; // Naranja muy suave
                    } else {
                        data.cell.styles.fillColor = [255, 255, 255]; // Blanco por defecto
                    }
                }
            },
            theme: 'grid'
        });

        doc.save(`respuestas_inauguracion_${new Date().toISOString().split('T')[0]}.pdf`);
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
                totalPersonas: respuesta ? 1 + (respuesta.adicionales || 0) : 0,
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
                totalPersonas: respuesta ? 1 + (respuesta.adicionales || 0) : 0,
                fechaRespuesta: respuesta?.fechaconfirmacion || respuesta?.date_created || null
            };
        });

        utils.exportToPDF(exportData);
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

// Mejoras para dispositivos móviles
function initMobileEnhancements() {
    // Detectar si es un dispositivo móvil
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Agregar indicador visual de scroll en la tabla
        const tableContainer = document.querySelector('.responses-table-container');
        if (tableContainer) {
            // Crear indicador de scroll solo para la tabla
            createScrollIndicator();
            
            // Agregar evento para mostrar/ocultar indicador de scroll
            tableContainer.addEventListener('scroll', function() {
                const scrollLeft = this.scrollLeft;
                const scrollWidth = this.scrollWidth;
                const clientWidth = this.clientWidth;
                
                // Si hay más contenido para hacer scroll
                if (scrollWidth > clientWidth) {
                    if (scrollLeft === 0) {
                        this.classList.add('scroll-start');
                        this.classList.remove('scroll-end');
                    } else if (scrollLeft >= (scrollWidth - clientWidth - 5)) {
                        this.classList.add('scroll-end');
                        this.classList.remove('scroll-start');
                    } else {
                        this.classList.remove('scroll-start', 'scroll-end');
                    }
                }
            });
            
            // Trigger inicial
            tableContainer.dispatchEvent(new Event('scroll'));
        }
        
        // Optimizar inputs para móviles (evitar zoom en iOS)
        const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"], select');
        inputs.forEach(input => {
            if (input.style.fontSize === '' || parseFloat(window.getComputedStyle(input).fontSize) < 16) {
                input.style.fontSize = '16px';
            }
        });
        
        // Agregar clase para identificar dispositivo móvil
        document.body.classList.add('mobile-device');
    }
    
    // Manejo de orientación en móviles
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            // Reajustar scroll de tabla si existe
            const tableContainer = document.querySelector('.responses-table-container');
            if (tableContainer) {
                tableContainer.scrollLeft = 0; // Reset scroll position
                tableContainer.dispatchEvent(new Event('scroll'));
            }
        }, 100);
    });
    
    // Manejar resize de ventana
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const newIsMobile = window.innerWidth <= 768;
            if (newIsMobile !== isMobile) {
                // Cambió de móvil a escritorio o viceversa
                location.reload(); // Recargar para aplicar cambios apropiados
            }
        }, 250);
    });
}

// Crear indicador de scroll específico para la tabla
function createScrollIndicator() {
    // Verificar si ya existe para evitar duplicados
    if (document.getElementById('scroll-indicator')) {
        return;
    }
    
    // Crear el indicador
    const indicator = document.createElement('div');
    indicator.id = 'scroll-indicator';
    indicator.innerHTML = '→';
    indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--primary-color, #8b5cf6);
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        pointer-events: none;
        animation: blinkAndFade 2s ease-out forwards;
    `;
    
    // Agregar estilos de animación
    const style = document.createElement('style');
    style.textContent = `
        @keyframes blinkAndFade {
            0% { 
                opacity: 0; 
                transform: scale(0.8); 
                display: flex;
            }
            20% { 
                opacity: 1; 
                transform: scale(1.1); 
            }
            40% { 
                opacity: 0.7; 
                transform: scale(1); 
            }
            60% { 
                opacity: 1; 
                transform: scale(1.1); 
            }
            80% { 
                opacity: 0.7; 
                transform: scale(1); 
            }
            100% { 
                opacity: 0; 
                transform: scale(0.8); 
                display: none;
            }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(indicator);
    
    // Observador para detectar cuando la tabla entra en vista
    const tableSection = document.querySelector('.responses-section');
    if (tableSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // La tabla está visible, mostrar indicador
                    showScrollIndicator();
                    // Dejar de observar después de la primera vez
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.3 // Mostrar cuando el 30% de la tabla sea visible
        });
        
        observer.observe(tableSection);
    }
}

// Mostrar el indicador de scroll con animación
function showScrollIndicator() {
    const indicator = document.getElementById('scroll-indicator');
    if (indicator) {
        indicator.style.display = 'flex';
        // Reiniciar la animación
        indicator.style.animation = 'none';
        indicator.offsetHeight; // Trigger reflow
        indicator.style.animation = 'blinkAndFade 2s ease-out forwards';
        
        // Remover después de la animación
        setTimeout(() => {
            if (indicator && indicator.parentNode) {
                indicator.style.display = 'none';
            }
        }, 2000);
    }
}

// Inicializar mejoras móviles cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileEnhancements);
} else {
    initMobileEnhancements();
}

// Hacer funciones disponibles globalmente
window.handlers = handlers;
window.utils = utils;
window.initMobileEnhancements = initMobileEnhancements;
