export const de = {
  common: {
    authRequired: '🔐 Bitte authentifiziere dich zuerst mit /start',
    mcpDisabled: '⚠️ Abfragen in natürlicher Sprache sind nicht verfügbar (MCP nicht konfiguriert).',
    cancelled: '❌ Abgebrochen.',
    error: '❌ Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
    sessionExpired: '🔐 Sitzung abgelaufen. Bitte verwende /start zur erneuten Anmeldung.',
    noData: '⚠️ Keine Daten verfügbar.',
    back: '◀️ Zurück',
    viewOnMap: '🌐 Auf Karte anzeigen',
    timelapse: '🎬 Timelapse',
    timelapse3d: '🌐 Timelapse 3D',
    present: 'Anwesend',
    na: 'N/V',
    online: '🟢 Online',
    offline: '🔴 Offline',
    showing: '_Zeige {{count}} von **{{total}} gesamt** {{item}}_',
    showingSimple: '_Zeige {{count}} {{item}}_',
    clickDetails: '\n💡 Klicke auf {{item}} für Details:',
    stillThere: 'Noch dort',
  },
  auth: {
    welcome:
      '👋 Willkommen beim PostgSail Bot!\n\n' +
      'Lass uns mit deinem PostgSail-Konto verbinden.\n' +
      'Gib /cancel ein, um jederzeit abzubrechen.\n\n' +
      'Was ist deine E-Mail-Adresse?',
    otpSent: '✅ Verifizierungscode an {{email}} gesendet\n\nBitte gib den erhaltenen Code ein:',
    otpFailed: '❌ Fehler beim Senden des Verifizierungscodes. Bitte versuche es erneut mit /start',
    apiError: '❌ Verbindung zur API fehlgeschlagen. Bitte versuche es später erneut.',
    otpNumeric: '⚠️ Der Verifizierungscode muss numerisch sein. Bitte versuche es erneut:',
    otpInvalid: '❌ Ungültiger Verifizierungscode. Bitte versuche es erneut:',
    otpValidateFailed: '❌ Code-Validierung fehlgeschlagen. Bitte versuche es erneut.',
    success:
      '✅ Authentifizierung erfolgreich!\n\n' +
      '🎉 Du bist jetzt mit PostgSail verbunden!\n\n' +
      'Verfügbare Befehle:\n' +
      '/boat - Schiffsinformationen\n' +
      '/monitoring - Live-Überwachungsdaten\n' +
      '/logs - Fahrtenbuch\n' +
      '/moorages - Liegeplätze und Aufenthalte\n' +
      '/settings - Deine Einstellungen\n\n' +
      'Oder frag mich einfach alles über dein Schiff!',
    cancelled: '❌ Authentifizierung abgebrochen.',
  },
  start: {
    returningUser:
      '👋 Hallo, ich erinnere mich an dich!\n\n' +
      '✅ Du bist bereits authentifiziert.\n\n' +
      'Verfügbare Befehle:\n' +
      '/boat - Schiffsinformationen\n' +
      '/monitoring - Live-Daten\n' +
      '/logs - Fahrtenbuch\n' +
      '/moorages - Liegeplätze\n' +
      '/stays - Deine Aufenthalte\n' +
      '/settings - Einstellungen\n' +
      '/help - Hilfe\n\n' +
      'Oder frag mich einfach alles über dein Schiff!',
    alreadyAuth:
      '👋 Hallo, ich erinnere mich an dich!\n\n' +
      'Verfügbare Befehle:\n' +
      '/boat - Schiffsinformationen\n' +
      '/monitoring - Live-Daten\n' +
      '/logs - Fahrtenbuch\n' +
      '/moorages - Liegeplätze\n' +
      '/stays - Deine Aufenthalte\n' +
      '/settings - Einstellungen\n' +
      '/help - Hilfe\n\n' +
      'Oder frag mich einfach alles über dein Schiff!',
  },
  help: {
    title: '🆘 **PostgSail Bot Hilfe**\n\n',
    commands:
      '**Befehle:**\n' +
      '/boat - Schiffsinformationen\n' +
      '/monitoring - Live-Überwachung\n' +
      '/logs - Fahrtenbuch\n' +
      '/moorages - Liegeplätze\n' +
      '/stays - Aufenthalte\n' +
      '/settings - Einstellungen\n' +
      '/help - Diese Hilfe\n' +
      '/cancel - Abbrechen\n\n' +
      '**Natürliche Sprache:**\n' +
      'Stelle Fragen wie:\n' +
      '• "Wo ist mein Schiff?"\n' +
      '• "Zeige mir meine letzte Fahrt"\n' +
      '• "Wie ist meine Batteriespannung?"\n\n',
    gettingStarted:
      'Willkommen beim PostgSail Bot!\n\n' +
      '**Erste Schritte:**\n' +
      '1. Sende /start zur Authentifizierung\n' +
      '2. Gib deine E-Mail-Adresse ein\n' +
      '3. Gib den Verifizierungscode ein\n\n',
    about:
      '**Über:**\n' +
      'PostgSail Telegram Bot hilft dir bei der Verwaltung mit:\n' +
      '• Echtzeit-Schiffsüberwachung\n' +
      '• Fahrtenbuch und Statistiken\n' +
      '• Liegeplatz-Tracking\n' +
      '• KI-gestützte Sprachabfragen\n\n' +
      '👨‍💻 Open-Source-Projekt auf GitHub verfügbar',
  },
  settings: {
    title: '⚙️ **Einstellungen**\n',
    noSettings: '⚠️ Keine Einstellungen verfügbar.',
    email: '**E-Mail:**',
    username: '**Benutzername:**',
    language: '**Sprache:**',
    changeUsername: '👤 **Benutzername ändern**\n\nBitte sende deinen neuen Benutzernamen:',
    languageUpdated: '✅ Sprache aktualisiert!',
    languageSet: '✅ Sprache gesetzt auf: **{{lang}}**',
    webSettings: '🌐 Web-Einstellungen',
    error: '❌ Einstellungen konnten nicht abgerufen werden. Bitte versuche es erneut.',
  },
  boat: {
    title: '🚢 **Schiffsinformationen**\n',
    noVessel: '⚠️ Keine Schiffsinformationen verfügbar.',
    name: '**Name:**',
    mmsi: '**MMSI:**',
    model: '**Modell:**',
    type: '**Typ:**',
    flag: '**Flagge:**',
    dimensions: '\n**Abmessungen:**',
    length: '• Länge:',
    beam: '• Breite:',
    height: '• Höhe:',
    status: '\n**Status:**',
    lastContact: '• Letzter Kontakt:',
    platform: '• Plattform:',
    error: '❌ Schiffsinformationen konnten nicht abgerufen werden. Bitte versuche es erneut.',
  },
  monitoring: {
    title: '📊 **Live-Überwachung**\n',
    noData: '⚠️ Keine Überwachungsdaten verfügbar.',
    status: '**Status:**',
    lastUpdate: '**Letzte Aktualisierung:**',
    navigation: '**Navigation:**',
    speed: '• Geschwindigkeit:',
    course: '• Kurs:',
    heading: '• Steuerkurs:',
    wind: '**Wind:**',
    environment: '**Umgebung:**',
    depth: '• Tiefe:',
    waterTemp: '• Wasser:',
    airTemp: '• Luft:',
    insideTemp: '• Innen:',
    atmospheric: '**Atmosphäre:**',
    pressure: '• Luftdruck:',
    humidity: '• Luftfeuchtigkeit:',
    electrical: '**Elektrik:**',
    battery: '• Batterie:',
    charge: '• Ladung:',
    current: '• Strom:',
    solar: '• Solar:',
    solarPower: '• Solarleistung:',
    gps: '**GPS:**',
    satellites: '• Satelliten:',
    hdop: '• HDOP:',
    autopilot: '**Autopilot:**',
    autopilotState: '• Zustand:',
    error: '❌ Überwachungsdaten konnten nicht abgerufen werden. Bitte versuche es erneut.',
  },
  logs: {
    title: '📚 **Aktuelle Fahrten**\n',
    noLogs: '📚 Noch keine Fahrten verfügbar.',
    distance: '   📏 Distanz:',
    duration: '   ⏱️ Dauer:',
    clickDetails: '\n💡 Klicke auf eine Fahrt für vollständige Details:',
    journey: '**Fahrt:**',
    started: '📅 Start:',
    ended: '📅 Ende:',
    navigation: '**Navigation:**',
    maxSpeed: '⚡ Max-Geschw.:',
    avgSpeed: '📊 Ø-Geschw.:',
    locations: '**Orte:**',
    from: '🏁 Von:',
    to: '🏁 Nach:',
    moorages: '**Liegeplätze:**',
    departedFrom: '⚓ Abfahrt:',
    arrivedAt: '⚓ Ankunft:',
    notes: '**Notizen:**\n',
    tags: '**Schlagwörter:**',
    trackAvailable: '\n📍 Strecke verfügbar',
    backToLogs: '◀️ Zurück zu Fahrten',
    notFound: '⚠️ Fahrtdetails nicht gefunden.',
    error: '❌ Fahrten konnten nicht abgerufen werden. Bitte versuche es erneut.',
    detailError: '❌ Details konnten nicht abgerufen werden. Bitte versuche es erneut.',
  },
  graph: {
    titleMonth: 'Gesamte Fahrten pro Monat',
    titleWeek: 'Gesamte Fahrten pro Woche',
    noData: '⚠️ Keine Daten zum Erstellen der Diagramme verfügbar.',
    error: '❌ Diagramme konnten nicht erstellt werden. Bitte versuche es erneut.',
  },
  moorages: {
    title: '⚓ **Deine Liegeplätze**\n',
    noMoorages: '⚓ Noch keine Liegeplätze aufgezeichnet.',
    type: '   📍 Typ:',
    visits: '   🔢 Besuche:',
    totalTime: '   ⏱️ Gesamtzeit:',
    clickDetails: '\n💡 Klicke auf einen Liegeplatz für Details und Aufenthalte:',
    totalVisits: '**Besuche gesamt:**',
    recentStays: '**Aktuelle Aufenthalte:**\n',
    moreStays: '_... und {{count}} weitere Aufenthalte_',
    noStays: '⚠️ Keine Aufenthalte für diesen Liegeplatz gefunden.',
    backToMoorages: '◀️ Zurück zu Liegeplätzen',
    error: '❌ Liegeplätze konnten nicht abgerufen werden. Bitte versuche es erneut.',
    detailError: '❌ Liegeplatzdetails konnten nicht abgerufen werden. Bitte versuche es erneut.',
  },
  stays: {
    title: '🏖️ **Deine Aufenthalte**\n',
    noStays: '⚓ Noch keine Aufenthalte aufgezeichnet.',
    moorage: '   ⚓ Liegeplatz:',
    type: '   📍 Typ:',
    duration: '   ⏱️ Dauer:',
    arrived: '   🛬 Ankunft:',
    departed: '   🛫 Abfahrt:',
    clickDetails: '\n💡 Klicke auf einen Aufenthalt für Details:',
    location: '**Ort:**',
    timing: '**Zeiten:**',
    arrivedLabel: '🛬 Ankunft:',
    departedLabel: '🛫 Abfahrt:',
    journey: '**Fahrt:**',
    arrivedFrom: '📍 Angekommen von:',
    departedTo: '📍 Abgefahren nach:',
    notes: '**Notizen:**',
    notFound: '⚠️ Aufenthaltsdetails nicht gefunden.',
    backToStays: '◀️ Zurück zu Aufenthalten',
    error: '❌ Aufenthalte konnten nicht abgerufen werden. Bitte versuche es erneut.',
    detailError: '❌ Details konnten nicht abgerufen werden. Bitte versuche es erneut.',
  },
};
