export const en = {
  common: {
    authRequired: '🔐 Please authenticate first with /start',
    mcpDisabled: '⚠️ Natural language queries are not available (MCP not configured).',
    cancelled: '❌ Cancelled.',
    error: '❌ An error occurred. Please try again.',
    sessionExpired: '🔐 Session expired. Please use /start to re-authenticate.',
    noData: '⚠️ No data available.',
    back: '◀️ Back',
    viewOnMap: '🌐 View on Map',
    timelapse: '🎬 Timelapse',
    timelapse3d: '🌐 Timelapse 3D',
    present: 'Present',
    na: 'N/A',
    online: '🟢 Online',
    offline: '🔴 Offline',
    showing: '_Showing {{count}} of **{{total}} total** {{item}}_',
    showingSimple: '_Showing {{count}} {{item}}_',
    clickDetails: '\n💡 Click a {{item}} below for details:',
    stillThere: 'Still there',
  },
  auth: {
    welcome:
      '👋 Welcome to PostgSail Bot!\n\n' +
      "Let's connect to your PostgSail account.\n" +
      'Type /cancel to cancel at any time.\n\n' +
      'What is your email address?',
    otpSent: '✅ Verification code sent to {{email}}\n\nPlease enter the code you received:',
    otpFailed: '❌ Failed to send verification code. Please try again with /start',
    apiError: '❌ Failed to connect to API. Please try again later.',
    otpNumeric: '⚠️ Verification code must be numeric. Please try again:',
    otpInvalid: '❌ Invalid verification code. Please try again:',
    otpValidateFailed: '❌ Failed to validate code. Please try again.',
    success:
      '✅ Authentication successful!\n\n' +
      '🎉 You are now connected to PostgSail!\n\n' +
      'Available commands:\n' +
      '/boat - Vessel information\n' +
      '/monitoring - Live monitoring data\n' +
      '/logs - Trip logs\n' +
      '/moorages - Moorages and stays\n' +
      '/settings - Your settings\n\n' +
      'Or just ask me anything about your vessel!',
    cancelled: '❌ Authentication cancelled.',
  },
  start: {
    returningUser:
      '👋 Hello, I remember you!\n\n' +
      '✅ You\'re already authenticated.\n\n' +
      'Available commands:\n' +
      '/boat - Vessel information\n' +
      '/monitoring - Live monitoring data\n' +
      '/logs - Trip logs\n' +
      '/moorages - Moorages\n' +
      '/stays - Your stays\n' +
      '/settings - Your settings\n' +
      '/help - Show help\n\n' +
      'Or just ask me anything about your vessel!',
    alreadyAuth:
      '👋 Hello, I remember you!\n\n' +
      'Available commands:\n' +
      '/boat - Vessel information\n' +
      '/monitoring - Live monitoring data\n' +
      '/logs - Trip logs\n' +
      '/moorages - Moorages\n' +
      '/stays - Your stays\n' +
      '/settings - Your settings\n' +
      '/help - Show help\n\n' +
      'Or just ask me anything about your vessel!',
  },
  help: {
    title: '🆘 **PostgSail Bot Help**\n\n',
    commands:
      '**Commands:**\n' +
      '/boat - Get vessel details\n' +
      '/monitoring - View live monitoring\n' +
      '/logs - View trip logs\n' +
      '/moorages - View moorages\n' +
      '/stays - View stays\n' +
      '/settings - View settings\n' +
      '/help - Show this help\n' +
      '/cancel - Cancel operation\n\n' +
      '**Natural Language:**\n' +
      'Ask questions like:\n' +
      '• "Where is my boat?"\n' +
      '• "Show me my last trip"\n' +
      '• "What\'s my battery voltage?"\n\n',
    gettingStarted:
      'Welcome to PostgSail Bot!\n\n' +
      '**Getting Started:**\n' +
      '1. Send /start to authenticate\n' +
      '2. Enter your email address\n' +
      '3. Enter the verification code\n\n',
    about:
      '**About:**\n' +
      'PostgSail Telegram Bot helps you manage your PostgSail instance with:\n' +
      '• Real-time vessel monitoring\n' +
      '• Trip logs and statistics\n' +
      '• Moorages tracking\n' +
      '• AI-powered natural language queries\n\n' +
      '👨‍💻 Open source project available on GitHub',
  },
  settings: {
    title: '⚙️ **Settings**\n',
    noSettings: '⚠️ No settings available.',
    email: '**Email:**',
    username: '**Username:**',
    language: '**Language:**',
    changeUsername: '👤 **Change Username**\n\nPlease send me your new username:',
    languageUpdated: '✅ Language updated!',
    languageSet: '✅ Language set to: **{{lang}}**',
    webSettings: '🌐 Web Settings',
    error: '❌ Failed to retrieve settings. Please try again.',
  },
  boat: {
    title: '🚢 **Vessel Details**\n',
    noVessel: '⚠️ No vessel information available.',
    name: '**Name:**',
    mmsi: '**MMSI:**',
    model: '**Model:**',
    type: '**Type:**',
    flag: '**Flag:**',
    dimensions: '\n**Dimensions:**',
    length: '• Length:',
    beam: '• Beam:',
    height: '• Height:',
    status: '\n**Status:**',
    lastContact: '• Last contact:',
    platform: '• Platform:',
    error: '❌ Failed to retrieve vessel information. Please try again.',
  },
  monitoring: {
    title: '📊 **Live Monitoring**\n',
    noData: '⚠️ No monitoring data available.',
    status: '**Status:**',
    lastUpdate: '**Last Update:**',
    navigation: '**Navigation:**',
    speed: '• Speed:',
    course: '• Course:',
    heading: '• Heading:',
    wind: '**Wind:**',
    environment: '**Environment:**',
    depth: '• Depth:',
    waterTemp: '• Water:',
    airTemp: '• Air:',
    insideTemp: '• Inside:',
    atmospheric: '**Atmospheric:**',
    pressure: '• Pressure:',
    humidity: '• Humidity:',
    electrical: '**Electrical:**',
    battery: '• Battery:',
    charge: '• Charge:',
    current: '• Current:',
    solar: '• Solar:',
    solarPower: '• Solar Power:',
    gps: '**GPS:**',
    satellites: '• Satellites:',
    hdop: '• HDOP:',
    autopilot: '**Autopilot:**',
    autopilotState: '• State:',
    error: '❌ Failed to retrieve monitoring data. Please try again.',
  },
  logs: {
    title: '📚 **Recent Logs**\n',
    noLogs: '📚 No logs available yet.',
    distance: '   📏 Distance:',
    duration: '   ⏱️ Duration:',
    clickDetails: '\n💡 Click a log below for full details:',
    journey: '**Journey:**',
    started: '📅 Started:',
    ended: '📅 Ended:',
    navigation: '**Navigation:**',
    maxSpeed: '⚡ Max Speed:',
    avgSpeed: '📊 Avg Speed:',
    locations: '**Locations:**',
    from: '🏁 From:',
    to: '🏁 To:',
    moorages: '**Moorages:**',
    departedFrom: '⚓ Departed:',
    arrivedAt: '⚓ Arrived:',
    notes: '**Notes:**\n',
    tags: '**Tags:**',
    trackAvailable: '\n📍 Track available',
    backToLogs: '◀️ Back to Logs',
    notFound: '⚠️ Log details not found.',
    error: '❌ Failed to retrieve logs. Please try again.',
    detailError: '❌ Failed to retrieve log details. Please try again.',
  },
  graph: {
    titleMonth: 'Total Logs by Month',
    titleWeek: 'Total Logs by Week',
    noData: '⚠️ No data available to generate graphs.',
    error: '❌ Failed to generate graphs. Please try again.',
  },
  moorages: {
    title: '⚓ **Your Moorages**\n',
    noMoorages: '⚓ No moorages recorded yet.',
    type: '   📍 Type:',
    visits: '   🔢 Visits:',
    totalTime: '   ⏱️ Total time:',
    clickDetails: '\n💡 Click a moorage below for details and stays:',
    totalVisits: '**Total Visits:**',
    recentStays: '**Recent Stays:**\n',
    moreStays: '_... and {{count}} more stays_',
    noStays: '⚠️ No stays found for this moorage.',
    backToMoorages: '◀️ Back to Moorages',
    error: '❌ Failed to retrieve moorages. Please try again.',
    detailError: '❌ Failed to retrieve moorage details. Please try again.',
  },
  stays: {
    title: '🏖️ **Your Stays**\n',
    noStays: '⚓ No stays recorded yet.',
    moorage: '   ⚓ Moorage:',
    type: '   📍 Type:',
    duration: '   ⏱️ Duration:',
    arrived: '   🛬 Arrived:',
    departed: '   🛫 Departed:',
    clickDetails: '\n💡 Click a stay below for details:',
    location: '**Location:**',
    timing: '**Timing:**',
    arrivedLabel: '🛬 Arrived:',
    departedLabel: '🛫 Departed:',
    journey: '**Journey:**',
    arrivedFrom: '📍 Arrived from:',
    departedTo: '📍 Departed to:',
    notes: '**Notes:**',
    notFound: '⚠️ Stay details not found.',
    backToStays: '◀️ Back to Stays',
    error: '❌ Failed to retrieve stays. Please try again.',
    detailError: '❌ Failed to retrieve stay details. Please try again.',
  },
};
