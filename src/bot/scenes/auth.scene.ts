import { Scenes } from 'telegraf';
import { MyContext } from '../../types/context';
import { ApiClient } from '../../api/client';
import { Logger } from '../../utils/logger';
import { t } from '../../i18n';

const logger = new Logger('AuthScene');

export const authScene = new Scenes.BaseScene<MyContext>('auth');

// Helper function to set authenticated commands
async function setAuthenticatedCommands(ctx: MyContext) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  try {
    await ctx.telegram.setMyCommands([
      { command: 'boat', description: 'Get vessel information' },
      { command: 'monitoring', description: 'View live monitoring data' },
      { command: 'logs', description: 'View trip logs' },
      { command: 'moorages', description: 'View moorages and anchorages' },
      { command: 'stays', description: 'View stays' },
      { command: 'settings', description: 'View your settings' },
      { command: 'help', description: 'Show help information' },
      { command: 'cancel', description: 'Cancel current operation' }
    ], { scope: { type: 'chat', chat_id: chatId } });

    logger.info('Authenticated commands set for user', { chatId });
  } catch (error) {
    logger.error('Failed to update bot commands', error);
  }
}

// Entry point
authScene.enter(async (ctx) => {
  const lang = ctx.session.language;
  logger.info('User entered auth scene', { userId: ctx.from?.id });
  await ctx.reply(t('auth.welcome', lang));
});

// Handle cancel
authScene.command('cancel', async (ctx) => {
  const lang = ctx.session.language;
  logger.info('Auth cancelled by user', { userId: ctx.from?.id });
  await ctx.reply(t('auth.cancelled', lang), { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});

// Handle text input
authScene.on('text', async (ctx) => {
  const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);
  const lang = ctx.session.language;
  const text = ctx.message.text;

  // Step 1: Email input
  if (!ctx.session.email) {
    ctx.session.email = text;
    logger.info('Email received', { email: text, userId: ctx.from?.id });

    await ctx.replyWithChatAction('typing');

    try {
      const otpResponse = await apiClient.requestOTP(text);

      if (otpResponse.success) {
        ctx.session.otp = otpResponse.code;
        await ctx.reply(t('auth.otpSent', lang, { email: text }));
      } else {
        await ctx.reply(t('auth.otpFailed', lang));
        delete ctx.session.email;
        return ctx.scene.leave();
      }
    } catch (error) {
      logger.error('OTP request error', error);
      await ctx.reply(t('auth.apiError', lang));
      delete ctx.session.email;
      return ctx.scene.leave();
    }
    return;
  }

  // Step 2: OTP validation
  if (ctx.session.email && !ctx.session.token) {
    const userOtp = text.trim();

    // Check if OTP is numeric
    if (!/^\d+$/.test(userOtp)) {
      await ctx.reply(t('auth.otpNumeric', lang));
      return;
    }

    if (userOtp === ctx.session.otp) {
      await ctx.replyWithChatAction('typing');

      const payload = {
        token: userOtp,
        telegram_obj: {
          from: {
            id: ctx.from!.id,
            is_bot: ctx.from!.is_bot,
            first_name: ctx.from!.first_name,
            language_code: ctx.from!.language_code
          },
          chat: {
            id: ctx.chat!.id,
            type: ctx.chat!.type
          },
          date: new Date().toISOString()
        }
      };

      try {
        const validationResult = await apiClient.validateOTP(payload);

        if (validationResult.success) {
          ctx.session.token = await apiClient.getToken(ctx.from!.id);
          ctx.session.authenticated = true;

          logger.success('User authenticated successfully', {
            userId: ctx.from!.id,
            email: ctx.session.email
          });

          await setAuthenticatedCommands(ctx);
          await ctx.reply(t('auth.success', lang));
          return ctx.scene.leave();
        } else {
          await ctx.reply(t('auth.otpInvalid', lang));
        }
      } catch (error) {
        logger.error('OTP validation error', error);
        await ctx.reply(t('auth.otpValidateFailed', lang));
      }
    } else {
      await ctx.reply(t('auth.otpInvalid', lang));
    }
  }
});
