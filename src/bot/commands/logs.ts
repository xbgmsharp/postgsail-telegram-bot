import { MyContext } from '../../types/context';
import { ApiClient } from '../../api/client';
import { Logger } from '../../utils/logger';
import { TypingIndicator } from '../../utils/typing';
import { formatDuration } from '../../utils/format';
import { AuthError } from '../../utils/errors';
import { t } from '../../i18n';

const logger = new Logger('LogsCommand');

export async function logsCommand(ctx: MyContext) {
  const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);
  const lang = ctx.session.language;

  if (!ctx.session.authenticated || !ctx.session.token) {
    await ctx.reply(t('common.authRequired', lang));
    return ctx.scene.enter('auth');
  }

  try {
    apiClient.setAuth(ctx.session.token);
    const response = await apiClient.getLogs() as any;

    const logs = response.data;
    const totalCount = response.totalCount;

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      await ctx.reply(t('logs.noLogs', lang));
      return;
    }

    const message = [t('logs.title', lang)];
    const keyboard: any[] = [];

    logs.forEach((log: any, index: number) => {
      const start = log.started ? new Date(log.started).toLocaleDateString() : t('common.na', lang);
      const end = log.ended ? new Date(log.ended).toLocaleDateString() : t('common.na', lang);
      const distance = log.distance ? `${Number(log.distance).toFixed(1)} nm` : t('common.na', lang);
      const duration = log.duration ? formatDuration(log.duration) : t('common.na', lang);

      message.push(
        `**${index + 1}.** ${log.name || 'Unnamed Trip'}`,
        `   📅 ${start} → ${end}`,
        `${t('logs.distance', lang)} ${distance}`,
        `${t('logs.duration', lang)} ${duration}`,
        ''
      );

      if (log.id) {
        keyboard.push([{
          text: `📖 ${index + 1}. ${log.name || 'Unnamed Trip'}`,
          callback_data: `log:${log.id}`
        }]);
      }
    });

    if (totalCount !== null) {
      message.push(t('common.showing', lang, { count: logs.length, total: totalCount, item: 'logs' }));
    } else {
      message.push(t('common.showingSimple', lang, { count: logs.length, item: 'logs' }));
    }

    message.push(t('logs.clickDetails', lang));

    await ctx.reply(message.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    if (error instanceof AuthError) throw error;
    logger.error('Logs command error', error);
    await ctx.reply(t('logs.error', lang));
  }
}

export async function logDetailHandler(ctx: any) {
  const logId = ctx.match[1];
  const lang = ctx.session.language;

  logger.info('Log detail requested', { logId, userId: ctx.from.id });

  await ctx.answerCbQuery();

  const typing = new TypingIndicator(ctx);
  await typing.start();

  try {
    const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);
    apiClient.setAuth(ctx.session.token!);

    const response = await apiClient.getLog(logId) as any;

    await typing.stop();

    const logData = response.data || response;

    if (!logData || !Array.isArray(logData) || logData.length === 0) {
      await ctx.reply(t('logs.notFound', lang));
      return;
    }

    const log = logData[0];

    const details = [
      `📖 **${log.name || 'Trip Log'}**\n`,
      `${t('logs.journey', lang)}`,
      `${t('logs.started', lang)} ${log.started ? new Date(log.started).toLocaleString() : t('common.na', lang)}`,
      `${t('logs.ended', lang)} ${log.ended ? new Date(log.ended).toLocaleString() : t('common.na', lang)}`,
    ];

    if (log.duration) {
      details.push(`${t('logs.duration', lang).trim()} ${formatDuration(log.duration)}`);
    }

    details.push(`\n${t('logs.navigation', lang)}`);
    if (log.distance) details.push(`${t('logs.distance', lang).trim()} ${Number(log.distance).toFixed(2)} nm`);
    if (log.max_speed) details.push(`${t('logs.maxSpeed', lang)} ${Number(log.max_speed).toFixed(1)} kts`);
    if (log.avg_speed) details.push(`${t('logs.avgSpeed', lang)} ${Number(log.avg_speed).toFixed(1)} kts`);

    if (log.from_location || log.to_location) {
      details.push(`\n${t('logs.locations', lang)}`);
      if (log.from_location) details.push(`${t('logs.from', lang)} ${log.from_location}`);
      if (log.to_location) details.push(`${t('logs.to', lang)} ${log.to_location}`);
    }

    if (log.from_moorage_id || log.to_moorage_id) {
      details.push(`\n${t('logs.moorages', lang)}`);
      if (log.from_moorage_id) details.push(`${t('logs.departedFrom', lang)} ${log.from_moorage_id}`);
      if (log.to_moorage_id) details.push(`${t('logs.arrivedAt', lang)} ${log.to_moorage_id}`);
    }

    if (log.notes) {
      details.push(`\n${t('logs.notes', lang)}${log.notes}`);
    }

    if (log.tags && Array.isArray(log.tags) && log.tags.length > 0) {
      details.push(`\n${t('logs.tags', lang)} ${log.tags.join(', ')}`);
    }

    const webUrl = process.env.POSTGSAIL_WEB_URL || 'https://app.postgsail.com';
    const gisUrl = process.env.GIS_URL || 'https://gis.openplotter.cloud';

    const inlineKeyboard: any[][] = [
      [{ text: t('common.viewOnMap', lang), url: `${webUrl}/logs/${logId}` }],
      [
        { text: t('common.timelapse', lang), url: `${webUrl}/timelapse/${logId}` },
        { text: t('common.timelapse3d', lang), url: `${webUrl}/timelapse3d/${logId}` },
      ],
    ];

    if (log.geojson) {
      inlineKeyboard.push([
        { text: '📥 GeoJSON', callback_data: `exportLog:geojson:${logId}` },
        { text: '📥 KML', callback_data: `exportLog:kml:${logId}` },
        { text: '📥 GPX', callback_data: `exportLog:gpx:${logId}` },
      ]);
    }

    inlineKeyboard.push([{ text: t('logs.backToLogs', lang), callback_data: 'back_to_logs' }]);

    await ctx.reply(details.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });

    if (log.vessel_id) {
      const imageUrl = `${gisUrl}/log_${log.vessel_id}_${logId}.png`;
      try {
        await ctx.replyWithPhoto(imageUrl);
      } catch (imgError) {
        logger.warn('Failed to send log image', imgError);
      }
    }
  } catch (error) {
    await typing.stop();
    if (error instanceof AuthError) throw error;
    logger.error('Failed to fetch log details', error);
    await ctx.reply(t('logs.detailError', lang));
  }
}

export async function backToLogsHandler(ctx: MyContext) {
  await (ctx as any).answerCbQuery();
  await logsCommand(ctx);
}

export async function exportLogHandler(ctx: any) {
  const [format, logId] = [ctx.match[1], ctx.match[2]];
  const lang = ctx.session.language;

  await ctx.answerCbQuery();

  const typing = new TypingIndicator(ctx);
  await typing.start();

  try {
    const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);
    apiClient.setAuth(ctx.session.token!);

    let fileContent: string;
    let filename: string;
    let mimeType: string;

    if (format === 'geojson') {
      const result = await apiClient.exportLogGeoJSON(logId) as any;
      fileContent = JSON.stringify(result.data ?? result, null, 2);
      filename = `log_${logId}.geojson`;
      mimeType = 'application/geo+json';
    } else if (format === 'kml') {
      fileContent = await apiClient.exportLogKML(logId) as string;
      filename = `log_${logId}.kml`;
      mimeType = 'application/vnd.google-earth.kml+xml';
    } else if (format === 'gpx') {
      fileContent = await apiClient.exportLogGPX(logId) as string;
      filename = `log_${logId}.gpx`;
      mimeType = 'application/gpx+xml';
    } else {
      await typing.stop();
      return;
    }

    await typing.stop();

    const buffer = Buffer.from(fileContent, 'utf-8');
    await ctx.replyWithDocument({ source: buffer, filename }, { caption: `📥 ${filename}` });
  } catch (error) {
    await typing.stop();
    if (error instanceof AuthError) throw error;
    logger.error('Failed to export log', { format, logId, error });
    await ctx.reply(t('logs.detailError', lang));
  }
}
