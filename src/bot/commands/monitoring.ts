import { MyContext } from '../../types/context';
import { ApiClient } from '../../api/client';
import { Logger } from '../../utils/logger';
import { AuthError } from '../../utils/errors';
import { t } from '../../i18n';

const logger = new Logger('MonitoringCommand');

export async function monitoringCommand(ctx: MyContext) {
  const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);
  const lang = ctx.session.language;

  if (!ctx.session.authenticated || !ctx.session.token) {
    await ctx.reply(t('common.authRequired', lang));
    return ctx.scene.enter('auth');
  }

  try {
    apiClient.setAuth(ctx.session.token);
    const response = await apiClient.getMonitoringLive() as any;

    const monitoringData = response.data || response;
    const data = Array.isArray(monitoringData) ? monitoringData[0] : monitoringData;

    if (!data) {
      await ctx.reply(t('monitoring.noData', lang));
      return;
    }

    logger.info('Monitoring data', { data });

    if (data.geojson?.geometry?.coordinates) {
      const [longitude, latitude] = data.geojson.geometry.coordinates;
      await ctx.replyWithLocation(latitude, longitude);
    }

    const sections = [t('monitoring.title', lang)];

    const statusEmoji = data.offline ? '🔴' : '🟢';
    const statusText = data.status || (data.offline ? t('common.offline', lang) : t('common.online', lang));
    sections.push(`${t('monitoring.status', lang)} ${statusEmoji} ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`);

    if (data.time) {
      sections.push(`${t('monitoring.lastUpdate', lang)} ${new Date(data.time).toLocaleString()}`);
    }
    sections.push('');

    const navData = data.data || {};
    if (navData.sog !== undefined || navData.cog !== undefined) {
      sections.push(t('monitoring.navigation', lang));
      if (navData.sog !== undefined && navData.sog !== null) {
        sections.push(`${t('monitoring.speed', lang)} ${(navData.sog * 1.94384).toFixed(1)} kts`);
      }
      if (navData.cog !== undefined && navData.cog !== null) {
        sections.push(`${t('monitoring.course', lang)} ${(navData.cog * 180 / Math.PI).toFixed(0)}°`);
      }
      if (navData.heading !== undefined && navData.heading !== null) {
        sections.push(`${t('monitoring.heading', lang)} ${(navData.heading * 180 / Math.PI).toFixed(0)}°`);
      }
      sections.push('');
    }

    if (navData.wind) {
      sections.push(t('monitoring.wind', lang));
      if (navData.wind.speed !== undefined && navData.wind.speed !== null) {
        sections.push(`${t('monitoring.speed', lang)} ${(navData.wind.speed * 1.94384).toFixed(1)} kts`);
      }
      if (navData.wind.direction !== undefined && navData.wind.direction !== null) {
        sections.push(`${t('monitoring.course', lang)} ${(navData.wind.direction * 180 / Math.PI).toFixed(0)}°`);
      }
      sections.push('');
    }

    const hasEnvData = data.watertemperature || data.outsidetemperature || data.insidetemperature || navData.water?.depth;
    if (hasEnvData) {
      sections.push(t('monitoring.environment', lang));

      if (navData.water?.depth !== undefined && navData.water?.depth !== null) {
        sections.push(`${t('monitoring.depth', lang)} ${navData.water.depth.toFixed(1)} m`);
      } else if (data.depth !== undefined && data.depth !== null) {
        sections.push(`${t('monitoring.depth', lang)} ${data.depth.toFixed(1)} m`);
      }

      if (data.watertemperature !== undefined && data.watertemperature !== null) {
        sections.push(`${t('monitoring.waterTemp', lang)} ${(data.watertemperature - 273.15).toFixed(1)}°C`);
      }

      if (data.outsidetemperature !== undefined && data.outsidetemperature !== null) {
        sections.push(`${t('monitoring.airTemp', lang)} ${(data.outsidetemperature - 273.15).toFixed(1)}°C`);
      }

      if (data.insidetemperature !== undefined && data.insidetemperature !== null) {
        sections.push(`${t('monitoring.insideTemp', lang)} ${(data.insidetemperature - 273.15).toFixed(1)}°C`);
      }

      sections.push('');
    }

    if (data.outsidepressure !== undefined && data.outsidepressure !== null ||
        data.outsidehumidity !== undefined && data.outsidehumidity !== null) {
      sections.push(t('monitoring.atmospheric', lang));

      if (data.outsidepressure !== undefined && data.outsidepressure !== null) {
        sections.push(`${t('monitoring.pressure', lang)} ${(data.outsidepressure / 100).toFixed(0)} hPa`);
      }

      if (data.outsidehumidity !== undefined && data.outsidehumidity !== null) {
        sections.push(`${t('monitoring.humidity', lang)} ${(data.outsidehumidity * 100).toFixed(0)}%`);
      }

      sections.push('');
    }

    if (data.batteryvoltage !== undefined && data.batteryvoltage !== null ||
        data.batterycharge !== undefined && data.batterycharge !== null) {
      sections.push(t('monitoring.electrical', lang));

      if (data.batteryvoltage !== undefined && data.batteryvoltage !== null) {
        sections.push(`${t('monitoring.battery', lang)} ${data.batteryvoltage.toFixed(2)}V`);
      }

      if (data.batterycharge !== undefined && data.batterycharge !== null) {
        sections.push(`${t('monitoring.charge', lang)} ${(data.batterycharge * 100).toFixed(0)}%`);
      }

      if (navData.battery?.current !== undefined && navData.battery?.current !== null) {
        sections.push(`${t('monitoring.current', lang)} ${navData.battery.current.toFixed(1)}A`);
      }

      if (data.solarvoltage !== undefined && data.solarvoltage !== null) {
        sections.push(`${t('monitoring.solar', lang)} ${data.solarvoltage.toFixed(1)}V`);
      }

      if (data.solarpower !== undefined && data.solarpower !== null) {
        sections.push(`${t('monitoring.solarPower', lang)} ${data.solarpower.toFixed(1)}W`);
      }

      sections.push('');
    }

    if (navData['navigation.gnss.satellites'] !== undefined && navData['navigation.gnss.satellites'] !== null) {
      sections.push(t('monitoring.gps', lang));
      sections.push(`${t('monitoring.satellites', lang)} ${navData['navigation.gnss.satellites']}`);
      if (navData['navigation.gnss.horizontalDilution'] !== undefined && navData['navigation.gnss.horizontalDilution'] !== null) {
        sections.push(`${t('monitoring.hdop', lang)} ${navData['navigation.gnss.horizontalDilution'].toFixed(1)}`);
      }
      sections.push('');
    }

    if (navData['steering.autopilot.state']) {
      sections.push(t('monitoring.autopilot', lang));
      sections.push(`${t('monitoring.autopilotState', lang)} ${navData['steering.autopilot.state']}`);
      sections.push('');
    }

    await ctx.reply(sections.join('\n'), { parse_mode: 'Markdown' });
  } catch (error) {
    if (error instanceof AuthError) throw error;
    logger.error('Monitoring command error', error);
    await ctx.reply(t('monitoring.error', lang));
  }
}
