import { MyContext } from '../../types/context';
import { ApiClient } from '../../api/client';
import { Logger } from '../../utils/logger';
import { formatDuration } from '../../utils/format';
import { TypingIndicator } from '../../utils/typing';
import { AuthError } from '../../utils/errors';
import { t } from '../../i18n';

const logger = new Logger('MooragesCommand');

export async function mooragesCommand(ctx: MyContext) {
  const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);
  const lang = ctx.session.language;

  if (!ctx.session.authenticated || !ctx.session.token) {
    await ctx.reply(t('common.authRequired', lang));
    return ctx.scene.enter('auth');
  }

  try {
    apiClient.setAuth(ctx.session.token);
    const response = await apiClient.getMoorages() as any;

    logger.info('Moorages data received', { response });

    const mooragesData = response.data || response;
    const totalCount = response.totalCount;

    if (!mooragesData || (Array.isArray(mooragesData) && mooragesData.length === 0)) {
      await ctx.reply(t('moorages.noMoorages', lang));
      return;
    }

    const moorages = Array.isArray(mooragesData) ? mooragesData : [mooragesData];

    if (moorages.length === 0) {
      await ctx.reply(t('moorages.noMoorages', lang));
      return;
    }

    const message = [t('moorages.title', lang)];
    const keyboard: any[] = [];

    moorages.slice(0, 10).forEach((moorage: any, index: number) => {
      const name = moorage.moorage || 'Unnamed Location';
      const stayType = moorage.default_stay || 'Unknown';
      const visits = moorage.arrivals_departures || 0;
      const totalDuration = moorage.total_duration ? formatDuration(moorage.total_duration) : t('common.na', lang);
      const moorageId = moorage.id;

      message.push(
        `**${index + 1}.** ${name}`,
        `${t('moorages.type', lang)} ${stayType}`,
        `${t('moorages.visits', lang)} ${visits}`,
        `${t('moorages.totalTime', lang)} ${totalDuration}`,
        ''
      );

      if (moorageId) {
        keyboard.push([{
          text: `⚓ ${index + 1}. ${name.substring(0, 30)}${name.length > 30 ? '...' : ''}`,
          callback_data: `moorage:${moorageId}`
        }]);
      }
    });

    if (totalCount !== null) {
      message.push(t('common.showing', lang, { count: moorages.length, total: totalCount, item: 'moorages' }));
    } else {
      message.push(t('common.showingSimple', lang, { count: moorages.length, item: 'moorages' }));
    }

    if (keyboard.length > 0) {
      message.push(t('moorages.clickDetails', lang));
    }

    await ctx.reply(message.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined
    });
  } catch (error) {
    if (error instanceof AuthError) throw error;
    logger.error('Moorages command error', error);
    await ctx.reply(t('moorages.error', lang));
  }
}

export async function moorageDetailHandler(ctx: any) {
  const moorageId = ctx.match[1];
  const lang = ctx.session.language;

  logger.info('Moorage detail requested', { moorageId, userId: ctx.from.id });

  await ctx.answerCbQuery();

  const typing = new TypingIndicator(ctx);
  await typing.start();

  try {
    const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);
    apiClient.setAuth(ctx.session.token!);

    const response = await apiClient.getStays({}) as any;

    await typing.stop();

    const staysData = response.data || response;

    const stayTypeMap: Record<number, string> = {
      1: 'Unknown',
      2: 'Anchor',
      3: 'Mooring Buoy',
      4: 'Dock'
    };

    if (!staysData || !Array.isArray(staysData) || staysData.length === 0) {
      await ctx.reply(t('moorages.noStays', lang));
      return;
    }

    const moorageStays = staysData.filter((stay: any) =>
      stay.moorage_id === parseInt(moorageId) ||
      stay.stayed_at_id === parseInt(moorageId)
    );

    if (moorageStays.length === 0) {
      await ctx.reply(t('moorages.noStays', lang));
      return;
    }

    const firstStay = moorageStays[0];
    const moorageName = firstStay.moorage_name || firstStay.name || 'Unnamed Location';

    const details = [
      `⚓ **${moorageName}**\n`,
      `${t('moorages.totalVisits', lang)} ${moorageStays.length}\n`,
      `${t('moorages.recentStays', lang)}`
    ];

    moorageStays.slice(0, 5).forEach((stay: any, index: number) => {
      const arrived = stay.arrived ? new Date(stay.arrived).toLocaleDateString() : t('common.na', lang);
      const departed = stay.departed ? new Date(stay.departed).toLocaleDateString() : t('common.present', lang);
      const duration = stay.duration ? formatDuration(stay.duration) : t('common.na', lang);
      const stayType = stayTypeMap[stay.stay_type || stay.stayed_at_id] || 'Unknown';

      details.push(
        `**${index + 1}.** ${arrived} → ${departed}`,
        `${t('moorages.type', lang)} ${stayType}`,
        `   ⏱️ ${duration}`,
        ''
      );
    });

    if (moorageStays.length > 5) {
      details.push(t('moorages.moreStays', lang, { count: moorageStays.length - 5 }));
    }

    const webUrl = process.env.POSTGSAIL_WEB_URL || 'https://app.postgsail.com';

    await ctx.reply(details.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: t('common.viewOnMap', lang), url: `${webUrl}/moorages/${moorageId}` }],
          [{ text: t('moorages.backToMoorages', lang), callback_data: 'back_to_moorages' }]
        ]
      }
    });
  } catch (error) {
    await typing.stop();
    if (error instanceof AuthError) throw error;
    logger.error('Failed to fetch moorage details', error);
    await ctx.reply(t('moorages.detailError', lang));
  }
}

export async function backToMooragesHandler(ctx: MyContext) {
  await (ctx as any).answerCbQuery();
  await mooragesCommand(ctx);
}
