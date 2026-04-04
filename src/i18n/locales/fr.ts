export const fr = {
  common: {
    authRequired: '🔐 Veuillez vous authentifier avec /start',
    mcpDisabled: '⚠️ Les requêtes en langage naturel ne sont pas disponibles (MCP non configuré).',
    cancelled: '❌ Annulé.',
    error: '❌ Une erreur est survenue. Veuillez réessayer.',
    sessionExpired: '🔐 Session expirée. Veuillez utiliser /start pour vous reconnecter.',
    noData: '⚠️ Aucune donnée disponible.',
    back: '◀️ Retour',
    viewOnMap: '🌐 Voir sur la carte',
    timelapse: '🎬 Timelapse',
    timelapse3d: '🌐 Timelapse 3D',
    present: 'Présent',
    na: 'N/D',
    online: '🟢 En ligne',
    offline: '🔴 Hors ligne',
    showing: '_Affichage de {{count}} sur **{{total}} total** {{item}}_',
    showingSimple: '_Affichage de {{count}} {{item}}_',
    clickDetails: "\n💡 Cliquez sur un(e) {{item}} ci-dessous pour les détails :",
    stillThere: 'Toujours là',
  },
  auth: {
    welcome:
      '👋 Bienvenue sur PostgSail Bot !\n\n' +
      'Connectons-nous à votre compte PostgSail.\n' +
      'Tapez /cancel pour annuler à tout moment.\n\n' +
      'Quelle est votre adresse e-mail ?',
    otpSent: '✅ Code de vérification envoyé à {{email}}\n\nVeuillez saisir le code reçu :',
    otpFailed: '❌ Échec de l\'envoi du code de vérification. Réessayez avec /start',
    apiError: '❌ Impossible de se connecter à l\'API. Veuillez réessayer plus tard.',
    otpNumeric: '⚠️ Le code de vérification doit être numérique. Veuillez réessayer :',
    otpInvalid: '❌ Code de vérification invalide. Veuillez réessayer :',
    otpValidateFailed: '❌ Échec de la validation du code. Veuillez réessayer.',
    success:
      '✅ Authentification réussie !\n\n' +
      '🎉 Vous êtes maintenant connecté à PostgSail !\n\n' +
      'Commandes disponibles :\n' +
      '/boat - Informations sur le bateau\n' +
      '/monitoring - Données de surveillance en direct\n' +
      '/logs - Journaux de voyage\n' +
      '/moorages - Mouillages et escales\n' +
      '/settings - Vos paramètres\n\n' +
      'Ou posez-moi n\'importe quelle question sur votre bateau !',
    cancelled: '❌ Authentification annulée.',
  },
  start: {
    returningUser:
      '👋 Bonjour, je vous reconnais !\n\n' +
      '✅ Vous êtes déjà authentifié.\n\n' +
      'Commandes disponibles :\n' +
      '/boat - Informations sur le bateau\n' +
      '/monitoring - Données en direct\n' +
      '/logs - Journaux de voyage\n' +
      '/moorages - Mouillages\n' +
      '/stays - Vos escales\n' +
      '/settings - Vos paramètres\n' +
      '/help - Aide\n\n' +
      'Ou posez-moi n\'importe quelle question sur votre bateau !',
    alreadyAuth:
      '👋 Bonjour, je vous reconnais !\n\n' +
      'Commandes disponibles :\n' +
      '/boat - Informations sur le bateau\n' +
      '/monitoring - Données en direct\n' +
      '/logs - Journaux de voyage\n' +
      '/moorages - Mouillages\n' +
      '/stays - Vos escales\n' +
      '/settings - Vos paramètres\n' +
      '/help - Aide\n\n' +
      'Ou posez-moi n\'importe quelle question sur votre bateau !',
  },
  help: {
    title: '🆘 **Aide PostgSail Bot**\n\n',
    commands:
      '**Commandes :**\n' +
      '/boat - Informations sur le bateau\n' +
      '/monitoring - Surveillance en direct\n' +
      '/logs - Journaux de voyage\n' +
      '/moorages - Mouillages\n' +
      '/stays - Escales\n' +
      '/settings - Paramètres\n' +
      '/help - Cette aide\n' +
      '/cancel - Annuler\n\n' +
      '**Langage naturel :**\n' +
      'Posez des questions comme :\n' +
      '• "Où est mon bateau ?"\n' +
      '• "Montre-moi mon dernier voyage"\n' +
      '• "Quelle est la tension de ma batterie ?"\n\n',
    gettingStarted:
      'Bienvenue sur PostgSail Bot !\n\n' +
      '**Pour commencer :**\n' +
      '1. Envoyez /start pour vous authentifier\n' +
      '2. Saisissez votre adresse e-mail\n' +
      '3. Saisissez le code de vérification\n\n',
    about:
      '**À propos :**\n' +
      'PostgSail Telegram Bot vous aide à gérer PostgSail avec :\n' +
      '• Surveillance en temps réel du bateau\n' +
      '• Journaux et statistiques de voyage\n' +
      '• Suivi des mouillages\n' +
      '• Requêtes en langage naturel avec IA\n\n' +
      '👨‍💻 Projet open source disponible sur GitHub',
  },
  settings: {
    title: '⚙️ **Paramètres**\n',
    noSettings: '⚠️ Aucun paramètre disponible.',
    email: '**E-mail :**',
    username: '**Nom d\'utilisateur :**',
    language: '**Langue :**',
    changeUsername: '👤 **Changer le nom d\'utilisateur**\n\nVeuillez envoyer votre nouveau nom d\'utilisateur :',
    languageUpdated: '✅ Langue mise à jour !',
    languageSet: '✅ Langue définie sur : **{{lang}}**',
    webSettings: '🌐 Paramètres Web',
    error: '❌ Échec de la récupération des paramètres. Veuillez réessayer.',
  },
  boat: {
    title: '🚢 **Informations sur le bateau**\n',
    noVessel: '⚠️ Aucune information sur le bateau disponible.',
    name: '**Nom :**',
    mmsi: '**MMSI :**',
    model: '**Modèle :**',
    type: '**Type :**',
    flag: '**Pavillon :**',
    dimensions: '\n**Dimensions :**',
    length: '• Longueur :',
    beam: '• Largeur :',
    height: '• Hauteur :',
    status: '\n**Statut :**',
    lastContact: '• Dernier contact :',
    platform: '• Plateforme :',
    error: '❌ Échec de la récupération des informations du bateau. Veuillez réessayer.',
  },
  monitoring: {
    title: '📊 **Surveillance en direct**\n',
    noData: '⚠️ Aucune donnée de surveillance disponible.',
    status: '**Statut :**',
    lastUpdate: '**Dernière mise à jour :**',
    navigation: '**Navigation :**',
    speed: '• Vitesse :',
    course: '• Cap :',
    heading: '• Orientation :',
    wind: '**Vent :**',
    environment: '**Environnement :**',
    depth: '• Profondeur :',
    waterTemp: '• Eau :',
    airTemp: '• Air :',
    insideTemp: '• Intérieur :',
    atmospheric: '**Atmosphère :**',
    pressure: '• Pression :',
    humidity: '• Humidité :',
    electrical: '**Électrique :**',
    battery: '• Batterie :',
    charge: '• Charge :',
    current: '• Courant :',
    solar: '• Solaire :',
    solarPower: '• Puissance solaire :',
    gps: '**GPS :**',
    satellites: '• Satellites :',
    hdop: '• HDOP :',
    autopilot: '**Pilote automatique :**',
    autopilotState: '• État :',
    error: '❌ Échec de la récupération des données de surveillance. Veuillez réessayer.',
  },
  logs: {
    title: '📚 **Journaux récents**\n',
    noLogs: '📚 Aucun journal disponible pour le moment.',
    distance: '   📏 Distance :',
    duration: '   ⏱️ Durée :',
    clickDetails: '\n💡 Cliquez sur un journal pour les détails :',
    journey: '**Trajet :**',
    started: '📅 Départ :',
    ended: '📅 Arrivée :',
    navigation: '**Navigation :**',
    maxSpeed: '⚡ Vitesse max :',
    avgSpeed: '📊 Vitesse moy :',
    locations: '**Lieux :**',
    from: '🏁 De :',
    to: '🏁 À :',
    moorages: '**Mouillages :**',
    departedFrom: '⚓ Départ :',
    arrivedAt: '⚓ Arrivée :',
    notes: '**Notes :**\n',
    tags: '**Étiquettes :**',
    trackAvailable: '\n📍 Tracé disponible',
    backToLogs: '◀️ Retour aux journaux',
    notFound: '⚠️ Détails du journal introuvables.',
    error: '❌ Échec de la récupération des journaux. Veuillez réessayer.',
    detailError: '❌ Échec de la récupération des détails. Veuillez réessayer.',
  },
  graph: {
    titleMonth: 'Total des journaux par mois',
    titleWeek: 'Total des journaux par semaine',
    noData: '⚠️ Aucune donnée disponible pour générer les graphiques.',
    error: '❌ Échec de la génération des graphiques. Veuillez réessayer.',
  },
  moorages: {
    title: '⚓ **Vos mouillages**\n',
    noMoorages: '⚓ Aucun mouillage enregistré pour le moment.',
    type: '   📍 Type :',
    visits: '   🔢 Visites :',
    totalTime: '   ⏱️ Temps total :',
    clickDetails: '\n💡 Cliquez sur un mouillage pour les détails et les escales :',
    totalVisits: '**Total des visites :**',
    recentStays: '**Escales récentes :**\n',
    moreStays: '_... et {{count}} escales de plus_',
    noStays: '⚠️ Aucune escale trouvée pour ce mouillage.',
    backToMoorages: '◀️ Retour aux mouillages',
    error: '❌ Échec de la récupération des mouillages. Veuillez réessayer.',
    detailError: '❌ Échec de la récupération des détails du mouillage. Veuillez réessayer.',
  },
  stays: {
    title: '🏖️ **Vos escales**\n',
    noStays: '⚓ Aucune escale enregistrée pour le moment.',
    moorage: '   ⚓ Mouillage :',
    type: '   📍 Type :',
    duration: '   ⏱️ Durée :',
    arrived: '   🛬 Arrivée :',
    departed: '   🛫 Départ :',
    clickDetails: '\n💡 Cliquez sur une escale pour les détails :',
    location: '**Lieu :**',
    timing: '**Timing :**',
    arrivedLabel: '🛬 Arrivée :',
    departedLabel: '🛫 Départ :',
    journey: '**Trajet :**',
    arrivedFrom: '📍 Arrivé de :',
    departedTo: '📍 Parti vers :',
    notes: '**Notes :**',
    notFound: '⚠️ Détails de l\'escale introuvables.',
    backToStays: '◀️ Retour aux escales',
    error: '❌ Échec de la récupération des escales. Veuillez réessayer.',
    detailError: '❌ Échec de la récupération des détails. Veuillez réessayer.',
  },
};
