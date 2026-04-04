import { MyContext } from '../../types/context';
import { ApiClient } from '../../api/client';
import { Logger } from '../../utils/logger';
import { formatDuration } from '../../utils/format';
import { TypingIndicator } from '../../utils/typing';
import { AuthError } from '../../utils/errors';
import { t } from '../../i18n';

const logger = new Logger('StaysCommand');

export async function staysCommand(ctx: MyContext) {
  const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);
  const lang = ctx.session.language;

  if (!ctx.session.authenticated || !ctx.session.token) {
    await ctx.reply(t('common.authRequired', lang));
    return ctx.scene.enter('auth');
  }

  try {
    apiClient.setAuth(ctx.session.token);
    const response = await apiClient.getStays() as any;

    logger.info('Stays response received', { response });

    const staysData = response.data || response;
    const totalCount = response.totalCount;

    if (!staysData || (Array.isArray(staysData) && staysData.length === 0)) {
      await ctx.reply(t('stays.noStays', lang));
      return;
    }

    const stays = Array.isArray(staysData) ? staysData : [staysData];

    if (stays.length === 0) {
      await ctx.reply(t('stays.noStays', lang));
      return;
    }

    const message = [t('stays.title', lang)];
    const keyboard: any[] = [];

    stays.slice(0, 10).forEach((stay: any, index: number) => {
      const name = stay.name || 'Unnamed stay';
      const moorage = stay.moorage || 'Unknown moorage';
      const totalDuration = stay.duration ? formatDuration(stay.duration) : t('common.na', lang);
      const stayed_at = stay.stayed_at || 'Unknown';
      const arrived = stay.arrived ? new Date(stay.arrived).toLocaleDateString() : t('common.na', lang);
      const departed = stay.departed ? new Date(stay.departed).toLocaleDateString() : t('common.na', lang);
      const stayId = stay.id;

      message.push(
        `**${index + 1}.** ${name}`,
        `${t('stays.moorage', lang)} ${moorage}`,
        `${t('stays.type', lang)} ${stayed_at}`,
        `${t('stays.duration', lang)} ${totalDuration}`,
        `${t('stays.arrived', lang)} ${arrived}`,
        `${t('stays.departed', lang)} ${departed}`,
        ''
      );

      if (stayId) {
        keyboard.push([{
          text: `⚓ ${index + 1}. ${name.substring(0, 30)}${name.length > 30 ? '...' : ''}`,
          callback_data: `stay:${stayId}`
        }]);
      }
    });

    if (totalCount !== null) {
      message.push(t('common.showing', lang, { count: Math.min(10, stays.length), total: totalCount, item: 'stays' }));
    } else {
      message.push(t('common.showingSimple', lang, { count: Math.min(10, stays.length), item: 'stays' }));
    }

    if (keyboard.length > 0) {
      message.push(t('stays.clickDetails', lang));
    }

    await ctx.reply(message.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined
    });
  } catch (error) {
    if (error instanceof AuthError) throw error;
    logger.error('Stays command error', error);
    await ctx.reply(t('stays.error', lang));
  }
}

export async function stayDetailHandler(ctx: any) {
  const stayId = ctx.match[1];
  const lang = ctx.session.language;

  logger.info('Stay detail requested', { stayId, userId: ctx.from.id });

  await ctx.answerCbQuery();

  const typing = new TypingIndicator(ctx);
  await typing.start();

  try {
    const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);
    apiClient.setAuth(ctx.session.token!);

    const response = await apiClient.getStays({}) as any;
    const staysData = response.data || response;

    await typing.stop();

    if (!staysData || !Array.isArray(staysData) || staysData.length === 0) {
      await ctx.reply(t('stays.notFound', lang));
      return;
    }

    const stay = staysData.find((s: any) => s.id === parseInt(stayId));

    if (!stay) {
      await ctx.reply(t('stays.notFound', lang));
      return;
    }

    const details = [`🏖️ **${stay.name || 'Stay Details'}**\n`];

    if (stay.moorage) {
      details.push(`${t('stays.location', lang)}`);
      details.push(`⚓ ${stay.moorage}`);
      if (stay.stayed_at) {
        details.push(`${t('stays.type', lang)} ${stay.stayed_at}`);
      }
      details.push('');
    }

    details.push(`${t('stays.timing', lang)}`);
    if (stay.arrived) {
      details.push(`${t('stays.arrivedLabel', lang)} ${new Date(stay.arrived).toLocaleString()}`);
    }
    if (stay.departed) {
      details.push(`${t('stays.departedLabel', lang)} ${new Date(stay.departed).toLocaleString()}`);
    } else {
      details.push(`${t('stays.departedLabel', lang)} ${t('common.stillThere', lang)}`);
    }
    if (stay.duration) {
      details.push(`⏱️ ${formatDuration(stay.duration)}`);
    }
    details.push('');

    if (stay.arrived_from_moorage_name || stay.departed_to_moorage_name) {
      details.push(`${t('stays.journey', lang)}`);
      if (stay.arrived_from_moorage_name) {
        details.push(`${t('stays.arrivedFrom', lang)} ${stay.arrived_from_moorage_name}`);
      }
      if (stay.departed_to_moorage_name) {
        details.push(`${t('stays.departedTo', lang)} ${stay.departed_to_moorage_name}`);
      }
      details.push('');
    }

    if (stay.notes) {
      details.push(`${t('stays.notes', lang)}`);
      details.push(stay.notes);
      details.push('');
    }

    const webUrl = process.env.POSTGSAIL_WEB_URL || 'https://app.postgsail.com';

    await ctx.reply(details.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: t('common.viewOnMap', lang), url: `${webUrl}/stays/${stayId}` }],
          [{ text: t('stays.backToStays', lang), callback_data: 'back_to_stays' }]
        ]
      }
    });
  } catch (error) {
    await typing.stop();
    if (error instanceof AuthError) throw error;
    logger.error('Failed to fetch stay details', error);
    await ctx.reply(t('stays.detailError', lang));
  }
}

export async function backToStaysHandler(ctx: MyContext) {
  await (ctx as any).answerCbQuery();
  await staysCommand(ctx);
}
