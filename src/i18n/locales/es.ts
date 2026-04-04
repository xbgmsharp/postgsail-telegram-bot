export const es = {
  common: {
    authRequired: '🔐 Por favor, autentícate primero con /start',
    mcpDisabled: '⚠️ Las consultas en lenguaje natural no están disponibles (MCP no configurado).',
    cancelled: '❌ Cancelado.',
    error: '❌ Ha ocurrido un error. Por favor, inténtalo de nuevo.',
    sessionExpired: '🔐 Sesión expirada. Usa /start para volver a autenticarte.',
    noData: '⚠️ No hay datos disponibles.',
    back: '◀️ Volver',
    viewOnMap: '🌐 Ver en el mapa',
    timelapse: '🎬 Timelapse',
    timelapse3d: '🌐 Timelapse 3D',
    present: 'Presente',
    na: 'N/D',
    online: '🟢 En línea',
    offline: '🔴 Fuera de línea',
    showing: '_Mostrando {{count}} de **{{total}} totales** {{item}}_',
    showingSimple: '_Mostrando {{count}} {{item}}_',
    clickDetails: '\n💡 Haz clic en un(a) {{item}} para ver los detalles:',
    stillThere: 'Todavía allí',
  },
  auth: {
    welcome:
      '👋 ¡Bienvenido a PostgSail Bot!\n\n' +
      'Vamos a conectarnos a tu cuenta PostgSail.\n' +
      'Escribe /cancel para cancelar en cualquier momento.\n\n' +
      '¿Cuál es tu dirección de correo electrónico?',
    otpSent: '✅ Código de verificación enviado a {{email}}\n\nPor favor, introduce el código que has recibido:',
    otpFailed: '❌ Error al enviar el código de verificación. Por favor, inténtalo de nuevo con /start',
    apiError: '❌ Error al conectar con la API. Por favor, inténtalo más tarde.',
    otpNumeric: '⚠️ El código de verificación debe ser numérico. Por favor, inténtalo de nuevo:',
    otpInvalid: '❌ Código de verificación inválido. Por favor, inténtalo de nuevo:',
    otpValidateFailed: '❌ Error al validar el código. Por favor, inténtalo de nuevo.',
    success:
      '✅ ¡Autenticación exitosa!\n\n' +
      '🎉 ¡Ahora estás conectado a PostgSail!\n\n' +
      'Comandos disponibles:\n' +
      '/boat - Información del barco\n' +
      '/monitoring - Datos de monitoreo en vivo\n' +
      '/logs - Registros de viaje\n' +
      '/moorages - Fondeos y escalas\n' +
      '/settings - Tus ajustes\n\n' +
      '¡O hazme cualquier pregunta sobre tu barco!',
    cancelled: '❌ Autenticación cancelada.',
  },
  start: {
    returningUser:
      '👋 ¡Hola, te recuerdo!\n\n' +
      '✅ Ya estás autenticado.\n\n' +
      'Comandos disponibles:\n' +
      '/boat - Información del barco\n' +
      '/monitoring - Datos en vivo\n' +
      '/logs - Registros de viaje\n' +
      '/moorages - Fondeos\n' +
      '/stays - Tus estancias\n' +
      '/settings - Tus ajustes\n' +
      '/help - Ayuda\n\n' +
      '¡O hazme cualquier pregunta sobre tu barco!',
    alreadyAuth:
      '👋 ¡Hola, te recuerdo!\n\n' +
      'Comandos disponibles:\n' +
      '/boat - Información del barco\n' +
      '/monitoring - Datos en vivo\n' +
      '/logs - Registros de viaje\n' +
      '/moorages - Fondeos\n' +
      '/stays - Tus estancias\n' +
      '/settings - Tus ajustes\n' +
      '/help - Ayuda\n\n' +
      '¡O hazme cualquier pregunta sobre tu barco!',
  },
  help: {
    title: '🆘 **Ayuda de PostgSail Bot**\n\n',
    commands:
      '**Comandos:**\n' +
      '/boat - Información del barco\n' +
      '/monitoring - Monitoreo en vivo\n' +
      '/logs - Registros de viaje\n' +
      '/moorages - Fondeos\n' +
      '/stays - Estancias\n' +
      '/settings - Ajustes\n' +
      '/help - Esta ayuda\n' +
      '/cancel - Cancelar\n\n' +
      '**Lenguaje natural:**\n' +
      'Haz preguntas como:\n' +
      '• "¿Dónde está mi barco?"\n' +
      '• "Muéstrame mi último viaje"\n' +
      '• "¿Cuál es el voltaje de mi batería?"\n\n',
    gettingStarted:
      '¡Bienvenido a PostgSail Bot!\n\n' +
      '**Para empezar:**\n' +
      '1. Envía /start para autenticarte\n' +
      '2. Introduce tu dirección de correo electrónico\n' +
      '3. Introduce el código de verificación\n\n',
    about:
      '**Acerca de:**\n' +
      'PostgSail Telegram Bot te ayuda a gestionar PostgSail con:\n' +
      '• Monitoreo de barco en tiempo real\n' +
      '• Registros de viaje y estadísticas\n' +
      '• Seguimiento de fondeos\n' +
      '• Consultas en lenguaje natural con IA\n\n' +
      '👨‍💻 Proyecto de código abierto disponible en GitHub',
  },
  settings: {
    title: '⚙️ **Ajustes**\n',
    noSettings: '⚠️ No hay ajustes disponibles.',
    email: '**Correo electrónico:**',
    username: '**Nombre de usuario:**',
    language: '**Idioma:**',
    changeUsername: '👤 **Cambiar nombre de usuario**\n\nPor favor, envíame tu nuevo nombre de usuario:',
    languageUpdated: '✅ ¡Idioma actualizado!',
    languageSet: '✅ Idioma establecido en: **{{lang}}**',
    webSettings: '🌐 Ajustes Web',
    error: '❌ Error al recuperar los ajustes. Por favor, inténtalo de nuevo.',
  },
  boat: {
    title: '🚢 **Información del barco**\n',
    noVessel: '⚠️ No hay información del barco disponible.',
    name: '**Nombre:**',
    mmsi: '**MMSI:**',
    model: '**Modelo:**',
    type: '**Tipo:**',
    flag: '**Bandera:**',
    dimensions: '\n**Dimensiones:**',
    length: '• Eslora:',
    beam: '• Manga:',
    height: '• Altura:',
    status: '\n**Estado:**',
    lastContact: '• Último contacto:',
    platform: '• Plataforma:',
    error: '❌ Error al recuperar la información del barco. Por favor, inténtalo de nuevo.',
  },
  monitoring: {
    title: '📊 **Monitoreo en vivo**\n',
    noData: '⚠️ No hay datos de monitoreo disponibles.',
    status: '**Estado:**',
    lastUpdate: '**Última actualización:**',
    navigation: '**Navegación:**',
    speed: '• Velocidad:',
    course: '• Rumbo:',
    heading: '• Proa:',
    wind: '**Viento:**',
    environment: '**Entorno:**',
    depth: '• Profundidad:',
    waterTemp: '• Agua:',
    airTemp: '• Aire:',
    insideTemp: '• Interior:',
    atmospheric: '**Atmósfera:**',
    pressure: '• Presión:',
    humidity: '• Humedad:',
    electrical: '**Eléctrico:**',
    battery: '• Batería:',
    charge: '• Carga:',
    current: '• Corriente:',
    solar: '• Solar:',
    solarPower: '• Potencia solar:',
    gps: '**GPS:**',
    satellites: '• Satélites:',
    hdop: '• HDOP:',
    autopilot: '**Piloto automático:**',
    autopilotState: '• Estado:',
    error: '❌ Error al recuperar los datos de monitoreo. Por favor, inténtalo de nuevo.',
  },
  logs: {
    title: '📚 **Registros recientes**\n',
    noLogs: '📚 No hay registros disponibles todavía.',
    distance: '   📏 Distancia:',
    duration: '   ⏱️ Duración:',
    clickDetails: '\n💡 Haz clic en un registro para ver los detalles:',
    journey: '**Trayecto:**',
    started: '📅 Inicio:',
    ended: '📅 Fin:',
    navigation: '**Navegación:**',
    maxSpeed: '⚡ Vel. máx:',
    avgSpeed: '📊 Vel. media:',
    locations: '**Ubicaciones:**',
    from: '🏁 Desde:',
    to: '🏁 Hasta:',
    moorages: '**Fondeos:**',
    departedFrom: '⚓ Salida:',
    arrivedAt: '⚓ Llegada:',
    notes: '**Notas:**\n',
    tags: '**Etiquetas:**',
    trackAvailable: '\n📍 Trayecto disponible',
    backToLogs: '◀️ Volver a los registros',
    notFound: '⚠️ Detalles del registro no encontrados.',
    error: '❌ Error al recuperar los registros. Por favor, inténtalo de nuevo.',
    detailError: '❌ Error al recuperar los detalles. Por favor, inténtalo de nuevo.',
  },
  graph: {
    titleMonth: 'Total de registros por mes',
    titleWeek: 'Total de registros por semana',
    noData: '⚠️ No hay datos disponibles para generar los gráficos.',
    error: '❌ Error al generar los gráficos. Por favor, inténtalo de nuevo.',
  },
  moorages: {
    title: '⚓ **Tus fondeos**\n',
    noMoorages: '⚓ No hay fondeos registrados todavía.',
    type: '   📍 Tipo:',
    visits: '   🔢 Visitas:',
    totalTime: '   ⏱️ Tiempo total:',
    clickDetails: '\n💡 Haz clic en un fondeo para los detalles y estancias:',
    totalVisits: '**Total de visitas:**',
    recentStays: '**Estancias recientes:**\n',
    moreStays: '_... y {{count}} estancias más_',
    noStays: '⚠️ No se encontraron estancias para este fondeo.',
    backToMoorages: '◀️ Volver a fondeos',
    error: '❌ Error al recuperar los fondeos. Por favor, inténtalo de nuevo.',
    detailError: '❌ Error al recuperar los detalles del fondeo. Por favor, inténtalo de nuevo.',
  },
  stays: {
    title: '🏖️ **Tus estancias**\n',
    noStays: '⚓ No hay estancias registradas todavía.',
    moorage: '   ⚓ Fondeo:',
    type: '   📍 Tipo:',
    duration: '   ⏱️ Duración:',
    arrived: '   🛬 Llegada:',
    departed: '   🛫 Salida:',
    clickDetails: '\n💡 Haz clic en una estancia para los detalles:',
    location: '**Ubicación:**',
    timing: '**Timing:**',
    arrivedLabel: '🛬 Llegada:',
    departedLabel: '🛫 Salida:',
    journey: '**Trayecto:**',
    arrivedFrom: '📍 Llegado desde:',
    departedTo: '📍 Salido hacia:',
    notes: '**Notas:**',
    notFound: '⚠️ Detalles de la estancia no encontrados.',
    backToStays: '◀️ Volver a estancias',
    error: '❌ Error al recuperar las estancias. Por favor, inténtalo de nuevo.',
    detailError: '❌ Error al recuperar los detalles. Por favor, inténtalo de nuevo.',
  },
};
