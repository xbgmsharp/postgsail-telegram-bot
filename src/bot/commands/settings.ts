import { MyContext } from '../../types/context';
import { ApiClient } from '../../api/client';
import { TypingIndicator } from '../../utils/typing';
import { Logger } from '../../utils/logger';
import { AuthError } from '../../utils/errors';
import { t } from '../../i18n';

const logger = new Logger('SettingsCommand');

export async function settingsCommand(ctx: MyContext) {
  const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);
  const lang = ctx.session.language;

  if (!ctx.session.authenticated || !ctx.session.token) {
    await ctx.reply(t('common.authRequired', lang));
    return;
  }

  const typing = new TypingIndicator(ctx);
  await typing.start();

  try {
    apiClient.setAuth(ctx.session.token);
    const response = await apiClient.getProfile() as any;

    const settings = response;

    if (!settings) {
      await ctx.reply(t('settings.noSettings', lang));
      return;
    }

    const userSettings = Array.isArray(settings) ? settings[0] : settings;

    const username = ctx.session.username || userSettings.username || ctx.from?.first_name || 'Not set';
    const language = ctx.session.language || userSettings.language || 'en';

    const message = [
      t('settings.title', lang),
      `${t('settings.email', lang)} ${userSettings.email || ctx.session.email || t('common.na', lang)}`,
      `${t('settings.username', lang)} ${username}`,
      `${t('settings.language', lang)} ${language}`,
    ];

    const webUrl = process.env.POSTGSAIL_WEB_URL || 'https://app.postgsail.com';

    await typing.stop();
    await ctx.reply(
      message.join('\n'),
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: `👤 ${username}`, callback_data: 'settings:name' },
              { text: `🌐 ${language.toUpperCase()}`, callback_data: 'settings:lang' }
            ],
            [
              { text: t('settings.webSettings', lang), url: `${webUrl}/settings` }
            ]
          ]
        }
      }
    );
  } catch (error) {
    await typing.stop();
    if (error instanceof AuthError) throw error;
    logger.error('Settings command error', error);
    await ctx.reply(t('settings.error', lang));
  }
}
