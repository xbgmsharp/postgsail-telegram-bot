import { MyContext } from '../../types/context';
import { ApiClient } from '../../api/client';
import { Logger } from '../../utils/logger';
import { AuthError } from '../../utils/errors';
import { t } from '../../i18n';

const logger = new Logger('BoatCommand');

export async function boatCommand(ctx: MyContext) {
  const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);
  const lang = ctx.session.language;

  if (!ctx.session.authenticated || !ctx.session.token) {
    await ctx.reply(t('common.authRequired', lang));
    return ctx.scene.enter('auth');
  }

  try {
    apiClient.setAuth(ctx.session.token);
    const response = await apiClient.getVessel() as any;

    logger.info('Vessel response received', { response });

    let vesselInfo;
    if (response.data && response.data.vessel) {
      vesselInfo = response.data.vessel;
    } else if (response.vessel) {
      vesselInfo = response.vessel;
    } else if (response.data) {
      vesselInfo = Array.isArray(response.data) ? response.data[0] : response.data;
    } else {
      vesselInfo = Array.isArray(response) ? response[0] : response;
    }

    logger.info('Parsed vessel info', { vesselInfo });

    if (!vesselInfo) {
      await ctx.reply(t('boat.noVessel', lang));
      return;
    }

    if (vesselInfo.geojson?.geometry?.coordinates) {
      const [longitude, latitude] = vesselInfo.geojson.geometry.coordinates;
      await ctx.replyWithLocation(latitude, longitude);
    }

    const details = [
      t('boat.title', lang),
      `${t('boat.name', lang)} ${vesselInfo.name || t('common.na', lang)}`,
      `${t('boat.mmsi', lang)} ${vesselInfo.mmsi || t('common.na', lang)}`,
    ];

    if (vesselInfo.make_model) details.push(`${t('boat.model', lang)} ${vesselInfo.make_model}`);
    if (vesselInfo.ship_type) details.push(`${t('boat.type', lang)} ${vesselInfo.ship_type}`);
    if (vesselInfo.country) details.push(`${t('boat.flag', lang)} ${vesselInfo.country} (${vesselInfo.alpha_2})`);

    if (vesselInfo.length || vesselInfo.beam || vesselInfo.height) {
      details.push(t('boat.dimensions', lang));
      if (vesselInfo.length) details.push(`${t('boat.length', lang)} ${vesselInfo.length}m`);
      if (vesselInfo.beam) details.push(`${t('boat.beam', lang)} ${vesselInfo.beam}m`);
      if (vesselInfo.height) details.push(`${t('boat.height', lang)} ${vesselInfo.height}m`);
    }

    details.push(t('boat.status', lang));
    details.push(`• ${vesselInfo.offline ? t('common.offline', lang) : t('common.online', lang)}`);

    if (vesselInfo.last_contact) {
      const lastContact = new Date(vesselInfo.last_contact);
      details.push(`${t('boat.lastContact', lang)} ${lastContact.toLocaleString()}`);
    }

    if (vesselInfo.platform) {
      details.push(`${t('boat.platform', lang)} ${vesselInfo.platform}`);
    }

    if (vesselInfo.image_url) {
      await ctx.replyWithPhoto(vesselInfo.image_url, {
        caption: details.join('\n'),
        parse_mode: 'Markdown'
      });
    } else {
      await ctx.reply(details.join('\n'), { parse_mode: 'Markdown' });
    }
  } catch (error) {
    if (error instanceof AuthError) throw error;
    logger.error('Boat command error', error);
    await ctx.reply(t('boat.error', lang));
  }
}
