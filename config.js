// Configuración de la aplicación de inauguración
window.AppConfig = {
    // Configuración de Directus
    directus: {
        url: 'https://directus.luispinta.com',
        sociosCollection: 'matriz',
        inauguracionCollection: 'inauguracion',
        // Timeout para requests en millisegundos
        timeout: 10000,
        // Token estático para acceso público (opcional)
        // Si configuras permisos públicos en Directus, deja esto como null
        // Si prefieres usar un token, pon aquí un token con permisos de lectura/escritura
        staticToken: null // Cambia por tu token si lo necesitas
    },
    
    // Configuración de la aplicación
    app: {
        // Título de la aplicación
        title: 'Sistema de Inauguración',
        
        // Información del evento
        evento: {
            nombre: 'Inauguración de la Caja de Ahorros Tupak Rantina',
            fecha: 'domingo 31 de agosto',
            ciudad: 'Machachi',
            direccion: 'Avenida Amazonas',
            hora: '9:00 de la mañana'
        },
        
        // Opciones de respuesta
        respuestas: {
            asistira: 'ASISTIRÁ',
            noAsistira: 'NO ASISTIRÁ',
            representante: 'ENVIARÁ UN REPRESENTANTE'
        },
        
        // Configuración de validación
        validacion: {
            // Longitud de cédula
            cedulaLength: {
                min: 10,
                max: 11
            },
            
            // Patrón de cédula
            cedulaPattern: /^\d{10,11}$/,
            
            // Máximo de personas adicionales
            maxAdicionales: 10
        }
    },
    
    // Configuración de UI
    ui: {
        // Tiempo para mostrar mensajes (ms)
        tiempoMensaje: 3000,
        
        // Animaciones
        animaciones: {
            duracionFade: 300
        }
    },
    
    // Configuración de desarrollo
    dev: {
        // Habilitar logs en consola
        debug: true,
        
        // Datos de prueba para desarrollo
        datosDemo: false
    }
};

// Función para obtener configuración con fallback
window.getConfig = function(path, defaultValue = null) {
    const keys = path.split('.');
    let current = window.AppConfig;
    
    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return defaultValue;
        }
    }
    
    return current;
};

// Función para log de desarrollo
window.devLog = function(...args) {
    if (getConfig('dev.debug', false)) {
        console.log('[INAUGURACION DEBUG]', ...args);
    }
};

// Función para validar cédula
window.validateCedula = function(cedula) {
    const patron = getConfig('app.validacion.cedulaPattern');
    const minLength = getConfig('app.validacion.cedulaLength.min', 10);
    const maxLength = getConfig('app.validacion.cedulaLength.max', 11);
    
    if (!cedula || cedula.length < minLength || cedula.length > maxLength) {
        return {
            valido: false,
            mensaje: `La cédula debe tener entre ${minLength} y ${maxLength} dígitos`
        };
    }
    
    if (patron && !patron.test(cedula)) {
        return {
            valido: false,
            mensaje: 'La cédula solo debe contener números'
        };
    }
    
    return { valido: true };
};
