import { Telegraf, session, Scenes } from 'telegraf';
import { MyContext, SessionData } from '../types/context';
import { authScene } from './scenes/auth.scene';
import { boatCommand } from './commands/boat';
import { monitoringCommand } from './commands/monitoring';
import { logsCommand, logDetailHandler, backToLogsHandler, exportLogHandler } from './commands/logs';
import { graphCommand } from './commands/graph';
import { mooragesCommand, moorageDetailHandler, backToMooragesHandler } from './commands/moorages';
import { staysCommand, stayDetailHandler, backToStaysHandler } from './commands/stays';
import { settingsCommand } from './commands/settings';
import { OrchestrationAgent } from '../orchestration/agent';
import { TypingIndicator } from '../utils/typing';
import { getUserFriendlyError, AuthError, clearSession } from '../utils/errors';
import dotenv from 'dotenv';
import { ApiClient } from '../api/client';
import { Logger } from '../utils/logger';
import { t } from '../i18n';

// Load environment variables
dotenv.config();

const logger = new Logger('TelegramBot');

// Environment check
logger.info('=== Environment Configuration ===');
logger.info(`TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
logger.info(`POSTGSAIL_API_URL: ${process.env.POSTGSAIL_API_URL || 'NOT SET'}`);
logger.info(`POSTGSAIL_WEB_URL: ${process.env.POSTGSAIL_WEB_URL || 'NOT SET'}`);
logger.info(`POSTGSAIL_MCP_URL: ${process.env.POSTGSAIL_MCP_URL || 'NOT SET (MCP disabled)'}`);
logger.info(`MISTRAL_API_KEY: ${process.env.MISTRAL_API_KEY ? '✅ Set' : '❌ Missing'}`);
logger.info(`NODE_ENV: ${process.env.NODE_ENV || 'production'}`);
logger.info('================================\n');

// Validate required environment variables
const missingVars: string[] = [];
if (!process.env.TELEGRAM_BOT_TOKEN) missingVars.push('TELEGRAM_BOT_TOKEN');
if (!process.env.POSTGSAIL_API_URL) missingVars.push('POSTGSAIL_API_URL');
if (!process.env.POSTGSAIL_WEB_URL) missingVars.push('POSTGSAIL_WEB_URL');
if (missingVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

const mcpEnabled = !!process.env.POSTGSAIL_MCP_URL;
if (!mcpEnabled) {
  logger.warn('POSTGSAIL_MCP_URL not set — MCP/natural language feature disabled');
}

const bot = new Telegraf<MyContext>(process.env.TELEGRAM_BOT_TOKEN!);
const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);

// Helper function to set commands based on authentication
async function updateBotCommands(ctx: MyContext, authenticated: boolean) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  try {
    if (authenticated) {
      await bot.telegram.setMyCommands([
        { command: 'boat', description: 'Get vessel information' },
        { command: 'monitoring', description: 'View live monitoring data' },
        { command: 'logs', description: 'View trip logs' },
        { command: 'graph', description: 'View logs statistics graphs' },
        { command: 'moorages', description: 'View moorages and anchorages' },
        { command: 'stays', description: 'View stays at moorages and anchorages' },
        { command: 'settings', description: 'View your settings' },
        { command: 'help', description: 'Show help information' },
        { command: 'cancel', description: 'Cancel current operation' }
      ], { scope: { type: 'chat', chat_id: chatId } });

      logger.debug('Authenticated commands set', { chatId });
    } else {
      await bot.telegram.setMyCommands([
        { command: 'start', description: 'Start the bot and authenticate' },
        { command: 'help', description: 'Show help information' },
        { command: 'cancel', description: 'Cancel current operation' }
      ], { scope: { type: 'chat', chat_id: chatId } });

      logger.debug('Unauthenticated commands set', { chatId });
    }
  } catch (error) {
    logger.error('Failed to update bot commands', error);
  }
}

// Helper to verify and authenticate user from API
async function ensureAuthenticated(ctx: MyContext): Promise<boolean> {
  const chatId = ctx.from?.id;
  if (!chatId) return false;

  // If token issued less than 30min ago, use it as-is
  if (ctx.session.authenticated && ctx.session.token
    && ctx.session.tokenTimestamp && (Date.now() - ctx.session.tokenTimestamp < 30 * 60 * 1000)) {
    logger.debug('User has valid session token', { chatId });
    return true;
  }

  // No session, check with API if user exists and get token
  logger.debug('No session, checking authentication with API', { chatId });
  const verificationResult = await apiClient.verification(chatId);

  if (verificationResult.verified && verificationResult.token) {
    logger.info('User verified by API, setting session', { chatId });
    ctx.session.authenticated = true;
    ctx.session.token = verificationResult.token;
    ctx.session.tokenTimestamp = Date.now(); // Set the timestamp when token is received
    ctx.session.isReturningUser = true; // Mark as returning user
    await updateBotCommands(ctx, true);
    return true;
  }

  logger.debug('User not authenticated', { chatId });
  return false;
}

// Silently fetch a fresh JWT from the API and update the session
async function refreshSession(ctx: MyContext): Promise<boolean> {
  const chatId = ctx.from?.id;
  if (!chatId) return false;

  const verificationResult = await apiClient.verification(chatId);
  if (verificationResult.verified && verificationResult.token) {
    ctx.session.authenticated = true;
    ctx.session.token = verificationResult.token;
    ctx.session.tokenTimestamp = Date.now();
    logger.info('Session token refreshed', { chatId });
    return true;
  }

  clearSession(ctx);
  logger.info('Token refresh failed, session cleared', { chatId });
  return false;
}

// Run fn(); on AuthError refresh the JWT and retry once — email auth is never triggered here
async function withAuthRetry(ctx: MyContext, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof AuthError) {
      logger.info('JWT expired mid-request, refreshing...', { userId: ctx.from?.id });
      const refreshed = await refreshSession(ctx);
      if (refreshed) {
        await fn();
      } else {
        await ctx.reply(t('common.sessionExpired', ctx.session.language));
      }
    } else {
      throw error;
    }
  }
}

// Set default commands
bot.telegram.setMyCommands([
  { command: 'start', description: 'Start the bot and authenticate' },
  { command: 'help', description: 'Show help information' }
]).then(() => {
  logger.success('Default bot commands registered');
}).catch((error) => {
  logger.error('Failed to register default bot commands', error);
});

// In-memory session middleware
bot.use(session({
  defaultSession: (): SessionData => ({
    authenticated: false,
    __scenes: {},
    language: 'en',
    awaitingInput: null
  })
}));

// Scene stage
const stage = new Scenes.Stage<MyContext>([authScene]);
bot.use(stage.middleware());

// Auto-authentication middleware - runs on every message
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name;
  const chatId = ctx.chat?.id;
  const messageType = ctx.updateType;

  logger.info('Incoming update', {
    userId,
    username,
    chatId,
    messageType,
    authenticated: ctx.session?.authenticated
  });

  // Try to auto-authenticate if not already authenticated
  if (!ctx.session.authenticated && userId) {
    await ensureAuthenticated(ctx);
  }

  await next();
});

// Callback query handler for settings
bot.action(/^settings:(.+)$/, async (ctx) => {
  const action = ctx.match[1];

  logger.info('Settings action', { action, userId: ctx.from.id });

  await ctx.answerCbQuery();

  if (action === 'name') {
    ctx.session.awaitingInput = 'username';
    await ctx.reply(t('settings.changeUsername', ctx.session.language), { parse_mode: 'Markdown' });
  } else if (action === 'lang') {
    await ctx.editMessageReplyMarkup({
      inline_keyboard: [
        [
          { text: '🇬🇧 English', callback_data: 'setlang:en' },
          { text: '🇫🇷 Français', callback_data: 'setlang:fr' }
        ],
        [
          { text: '🇪🇸 Español', callback_data: 'setlang:es' },
          { text: '🇩🇪 Deutsch', callback_data: 'setlang:de' }
        ],
        [
          { text: '◀️ Back', callback_data: 'settings:back' }
        ]
      ]
    });
  } else if (action === 'back') {
    // Refresh settings display
    await settingsCommand(ctx as any);
  }
});

// Language selection callback
bot.action(/^setlang:(.+)$/, async (ctx) => {
  const lang = ctx.match[1];

  logger.info('Language changed', { lang, userId: ctx.from.id });

  ctx.session.language = lang;

  await ctx.answerCbQuery(t('settings.languageUpdated', lang));

  const langNames: Record<string, string> = {
    en: 'English',
    fr: 'Français',
    es: 'Español',
    de: 'Deutsch'
  };

  await ctx.editMessageText(
    t('settings.languageSet', lang, { lang: langNames[lang] || lang }),
    { parse_mode: 'Markdown' }
  );

  // Show settings again after 2 seconds
  setTimeout(async () => {
    await settingsCommand(ctx as any);
  }, 2000);
});

// Start command
bot.command('start', async (ctx) => {
  const chatId = ctx.from.id;
  logger.info('Start command received', { chatId, username: ctx.from.username });

  // Check if already authenticated in current session
  if (ctx.session.authenticated && ctx.session.token) {
    logger.info('User already authenticated in session', { chatId });
    await ctx.reply(t('start.alreadyAuth', ctx.session.language));
    return;
  }

  // Check with API if user is verified
  const verificationResult = await apiClient.verification(chatId);

  if (verificationResult.verified && verificationResult.token) {
    logger.info('Returning user verified with token', { chatId });
    ctx.session.authenticated = true;
    ctx.session.token = verificationResult.token;

    await updateBotCommands(ctx, true);
    await ctx.reply(t('start.returningUser', ctx.session.language));
  } else {
    logger.info('New user, starting auth flow', { chatId });
    await updateBotCommands(ctx, false);
    await ctx.scene.enter('auth');
  }
});

// Register commands with auth check and auto JWT refresh on expiry
bot.command('boat', async (ctx) => {
  if (!await ensureAuthenticated(ctx)) {
    await ctx.reply(t('common.authRequired', ctx.session.language));
    return;
  }
  await withAuthRetry(ctx, () => boatCommand(ctx));
});

bot.command('monitoring', async (ctx) => {
  if (!await ensureAuthenticated(ctx)) {
    await ctx.reply('🔐 Please authenticate first with /start');
    return;
  }
  await withAuthRetry(ctx, () => monitoringCommand(ctx));
});

bot.command('logs', async (ctx) => {
  if (!await ensureAuthenticated(ctx)) {
    await ctx.reply('🔐 Please authenticate first with /start');
    return;
  }
  await withAuthRetry(ctx, () => logsCommand(ctx));
});

bot.action(/^log:(.+)$/, (ctx) => withAuthRetry(ctx, () => logDetailHandler(ctx)));
bot.action('back_to_logs', (ctx) => withAuthRetry(ctx, () => backToLogsHandler(ctx)));
bot.action(/^exportLog:(geojson|kml|gpx):(.+)$/, (ctx) => withAuthRetry(ctx, () => exportLogHandler(ctx)));

bot.command('graph', async (ctx) => {
  if (!await ensureAuthenticated(ctx)) {
    await ctx.reply(t('common.authRequired', ctx.session.language));
    return;
  }
  await withAuthRetry(ctx, () => graphCommand(ctx));
});

bot.command('stays', async (ctx) => {
  if (!await ensureAuthenticated(ctx)) {
    await ctx.reply('🔐 Please authenticate first with /start');
    return;
  }
  await withAuthRetry(ctx, () => staysCommand(ctx));
});

bot.action(/^stay:(.+)$/, (ctx) => withAuthRetry(ctx, () => stayDetailHandler(ctx)));
bot.action('back_to_stays', (ctx) => withAuthRetry(ctx, () => backToStaysHandler(ctx)));

bot.command('moorages', async (ctx) => {
  if (!await ensureAuthenticated(ctx)) {
    await ctx.reply('🔐 Please authenticate first with /start');
    return;
  }
  await withAuthRetry(ctx, () => mooragesCommand(ctx));
});

bot.action(/^moorage:(.+)$/, (ctx) => withAuthRetry(ctx, () => moorageDetailHandler(ctx)));
bot.action('back_to_moorages', (ctx) => withAuthRetry(ctx, () => backToMooragesHandler(ctx)));

bot.command('settings', async (ctx) => {
  if (!await ensureAuthenticated(ctx)) {
    await ctx.reply('🔐 Please authenticate first with /start');
    return;
  }
  await withAuthRetry(ctx, () => settingsCommand(ctx));
});

bot.command('cancel', async (ctx) => {
  logger.info('Cancel command received', { userId: ctx.from.id });
  ctx.session.awaitingInput = null;
  await ctx.scene.leave();
  await ctx.reply(t('common.cancelled', ctx.session.language), { reply_markup: { remove_keyboard: true } });
});

bot.command('help', async (ctx) => {
  logger.info('Help command received', { userId: ctx.from.id });

  const isAuthenticated = await ensureAuthenticated(ctx);
  const lang = ctx.session.language;

  let helpText = t('help.title', lang);
  helpText += isAuthenticated ? t('help.commands', lang) : t('help.gettingStarted', lang);
  helpText += t('help.about', lang);

  await ctx.reply(helpText, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🌐 PostgSail Website',
            url: 'https://postgsail.org'
          }
        ],
        [
          {
            text: '👨‍💻 View on GitHub',
            url: 'https://github.com/xbgmsharp/postgsail-telegram-bot'
          }
        ],
        [
          {
            text: '📖 Documentation',
            url: 'https://github.com/xbgmsharp/postgsail-telegram-bot#readme'
          }
        ]
      ]
    }
  });
});

// Test typing indicator command - SIMPLE VERSION
bot.command('typing_test', async (ctx) => {
  logger.info('🧪 Typing test started', { userId: ctx.from.id });

  try {
    // Send typing action directly
    await ctx.replyWithChatAction('typing');
    logger.info('✅ Typing action sent');

    await ctx.reply('⏳ Waiting 5 seconds with typing indicator...');

    // Send typing every second for 5 seconds
    for (let i = 0; i < 5; i++) {
      await ctx.replyWithChatAction('typing');
      logger.info(`🔄 Typing sent (${i + 1}/5)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await ctx.reply('✅ Test complete! Did you see typing dots?');
  } catch (error) {
    logger.error('❌ Typing test failed', error);
    await ctx.reply(`❌ Error: ${error}`);
  }
});

bot.command('typing_test2', async (ctx) => {
  logger.info('🧪 Typing test 2 started');

  try {
    // Try different chat actions
    const actions = ['typing', 'upload_document', 'find_location', 'choose_sticker'];

    for (const action of actions) {
      await ctx.reply(`Testing: ${action}`);
      await ctx.replyWithChatAction(action as any);
      logger.info(`Sent action: ${action}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await ctx.reply('✅ Which ones did you see?');
  } catch (error) {
    logger.error('Test failed', error);
  }
});

bot.command('typing_test3', async (ctx) => {
  logger.info('🧪 Typing test 3 - slower');

  await ctx.reply('⏳ Watch carefully for typing indicator in the next 10 seconds...');

  // Wait 2 seconds before starting
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Send typing action 10 times with 1 second delay
  for (let i = 0; i < 10; i++) {
    const result = await ctx.telegram.sendChatAction(ctx.chat!.id, 'typing');
    logger.info(`Typing action result: ${result}, iteration ${i + 1}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await ctx.reply('✅ Test complete!');
});

bot.command('bot_info', async (ctx) => {
  try {
    const me = await ctx.telegram.getMe();
    const chat = await ctx.telegram.getChat(ctx.chat!.id);

    await ctx.reply(
      `**Bot Info:**\n` +
      `Bot ID: ${me.id}\n` +
      `Bot Username: @${me.username}\n` +
      `Can Join Groups: ${me.can_join_groups}\n` +
      `Can Read Messages: ${me.can_read_all_group_messages}\n\n` +
      `**Chat Info:**\n` +
      `Chat ID: ${chat.id}\n` +
      `Chat Type: ${chat.type}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Bot info error', error);
    await ctx.reply(`Error: ${error}`);
  }
});

bot.command('typing_test4', async (ctx) => {
  logger.info('🧪 Typing test 4 - correct way');

  await ctx.reply('⏳ Starting test - watch for typing dots...');

  // Keep sending typing action every 4 seconds
  const typingInterval = setInterval(() => {
    ctx.telegram.sendChatAction(ctx.chat!.id, 'typing')
      .then(() => logger.info('✅ Typing sent'))
      .catch((err) => logger.error('❌ Typing failed', err));
  }, 4000);

  // Simulate work for 15 seconds
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Stop typing
  clearInterval(typingInterval);

  await ctx.reply('✅ Test complete! Did you see the dots this time?');
});

// Natural language handler
bot.on('text', async (ctx) => {
  const text = ctx.message.text;

  // Skip if it's a command
  if (text.startsWith('/')) return;

  if (!mcpEnabled) {
    await ctx.reply(t('common.mcpDisabled', ctx.session.language));
    return;
  }

  if (!await ensureAuthenticated(ctx)) {
    await ctx.reply(t('common.authRequired', ctx.session.language));
    return;
  }

  logger.info('Natural language query', { userId: ctx.from.id, query: text });

  await withAuthRetry(ctx, async () => {

  const typing = new TypingIndicator(ctx);
  await typing.start();

  try {
    const agent = new OrchestrationAgent(
      process.env.MISTRAL_API_KEY!,
      process.env.POSTGSAIL_MCP_URL!,
      ctx.session.token!,
      ctx.session.language
    );

    const answer = await agent.processQuery(text);

    await typing.stop();

    logger.debug('Agent response', {
      answerPreview: answer.substring(0, 200),
      type: typeof answer,
      length: answer.length
    });

    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
      logger.error('Invalid answer', { answer, type: typeof answer });
      await ctx.reply('Sorry, I had trouble generating a response. Please try rephrasing your question.');
      return;
    }

    if (answer === 'done') {
      logger.error('Got "done" as final answer');
      await ctx.reply('Sorry, I had trouble generating a response. Please try again.');
      return;
    }

    await ctx.reply(answer, { parse_mode: 'Markdown' });
    logger.success('Query answered successfully', { userId: ctx.from.id, answerLength: answer.length });
  } catch (error) {
    await typing.stop();
    if (error instanceof AuthError) throw error;
    logger.error('Orchestration error', error);
    const userMessage = getUserFriendlyError(error);
    await ctx.reply(userMessage, { parse_mode: 'Markdown' });
  }
  }); // end withAuthRetry
});

// Error handler
bot.catch((err, ctx) => {
  logger.error('Bot error', {
    error: err,
    userId: ctx.from?.id,
    updateType: ctx.updateType
  });
  ctx.reply(t('common.error', (ctx as any).session?.language)).catch(console.error);
});

// Launch
bot.launch()
  .then(() => logger.success('🚀 Bot started successfully'))
  .catch((err) => {
    logger.error('❌ Failed to start bot', err);
    process.exit(1);
  });

// Graceful shutdown
process.once('SIGINT', () => {
  logger.info('SIGINT received, stopping bot...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  logger.info('SIGTERM received, stopping bot...');
  bot.stop('SIGTERM');
});

export default bot;