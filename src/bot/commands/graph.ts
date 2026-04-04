import { MyContext } from '../../types/context';
import { ApiClient } from '../../api/client';
import { Logger } from '../../utils/logger';
import { TypingIndicator } from '../../utils/typing';
import { AuthError } from '../../utils/errors';
import { t } from '../../i18n';

const logger = new Logger('GraphCommand');

function buildChartUrl(labels: string[], counts: number[], title: string): string {
  const chart = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Logs',
          data: counts,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        title: { display: true, text: title },
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          title: { display: true, text: 'Logs' },
        },
      },
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(chart));
  return `https://quickchart.io/chart?w=600&h=350&c=${encoded}`;
}

function extractRows(raw: any, labelKey?: string): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw?.data) return raw.data;
  if (raw?.charts && typeof raw.charts === 'object') {
    const k = labelKey ?? 'key';
    return Object.entries(raw.charts).map(([key, value]) => ({ [k]: key, count: Number(value) }));
  }
  return [];
}

function extractLabelsAndCounts(rows: any[], labelKey: string): { labels: string[]; counts: number[] } {
  const sample = rows[0] ?? {};
  const countKey = sample.count !== undefined ? 'count'
    : sample.trips !== undefined ? 'trips'
    : Object.keys(sample).find(k => k !== labelKey && typeof sample[k] === 'number') ?? 'count';

  return {
    labels: rows.map(r => String(r[labelKey] ?? '')),
    counts: rows.map(r => Number(r[countKey] ?? 0)),
  };
}

export async function graphCommand(ctx: MyContext) {
  const lang = ctx.session.language;

  if (!ctx.session.authenticated || !ctx.session.token) {
    await ctx.reply(t('common.authRequired', lang));
    return ctx.scene.enter('auth');
  }

  const typing = new TypingIndicator(ctx);
  await typing.start();

  try {
    const apiClient = new ApiClient(process.env.POSTGSAIL_API_URL);
    apiClient.setAuth(ctx.session.token!);

    const [rawMonth, rawWeek] = await Promise.all([
      apiClient.getLogsByMonth(),
      apiClient.getLogsByWeek(),
    ]);

    await typing.stop();
    //logger.info('monthly graph', rawMonth);
    //logger.info('weekly graph', rawWeek);
    const monthRows = extractRows(rawMonth, 'month').sort((a, b) => Number(a.month ?? 0) - Number(b.month ?? 0));
    const weekRows = extractRows(rawWeek, 'week').sort((a, b) => Number(a.week ?? 0) - Number(b.week ?? 0));
    //logger.info('monthly graph', { rows: monthRows.length, monthRows });
    //logger.info('weekly graph', { rows: weekRows.length, weekRows });

    if (!monthRows.length && !weekRows.length) {
      await ctx.reply(t('graph.noData', lang));
      return;
    }

    if (monthRows.length) {
      const sample = monthRows[0];
      const labelKey = sample.month !== undefined ? 'month'
        : Object.keys(sample).find(k => typeof sample[k] === 'string') ?? 'month';
      const { labels, counts } = extractLabelsAndCounts(monthRows, labelKey);
      const url = buildChartUrl(labels, counts, t('graph.titleMonth', lang));
      logger.info('Sending monthly graph', { rows: monthRows.length });
      await ctx.replyWithPhoto(url, { caption: t('graph.titleMonth', lang) });
    }

    if (weekRows.length) {
      const sample = weekRows[0];
      const labelKey = sample.week !== undefined ? 'week'
        : Object.keys(sample).find(k => typeof sample[k] === 'string') ?? 'week';
      const { labels, counts } = extractLabelsAndCounts(weekRows, labelKey);
      const url = buildChartUrl(labels, counts, t('graph.titleWeek', lang));
      logger.info('Sending weekly graph', { rows: weekRows.length });
      await ctx.replyWithPhoto(url, { caption: t('graph.titleWeek', lang) });
    }
  } catch (error) {
    await typing.stop();
    if (error instanceof AuthError) throw error;
    logger.error('Graph command error', error);
    await ctx.reply(t('graph.error', lang));
  }
}
