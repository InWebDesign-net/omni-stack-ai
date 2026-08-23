import { logError } from '../../../lib/log-error';

/**
 * The nightly reset, as a service.
 *
 * The cron calls it at 04:00 and a secret-guarded route calls it on demand.
 * Having one implementation means the thing that runs unattended is the same
 * thing that can be exercised deliberately — a nightly job that can only be
 * observed by waiting until 04:00 is a nightly job nobody checks.
 */

/**
 * Deletion order matters: these rows reference content that the content step
 * deletes and recreates with new ids. Clearing them afterwards would be
 * clearing rows that already point at nothing.
 */
const USER_CONTENT_UIDS = [
  'api::comment.comment',
  'api::like.like',
  'api::playlist.playlist',
  'api::subscription.subscription',
  'api::notification.notification',
  'api::chat-message.chat-message',
  'api::chat-room.chat-room',
];

export interface DemoResetSettings {
  enabled: boolean;
  wipeContent: boolean;
  wipeUserContent: boolean;
  resetAffinityGraphs: boolean;
  documentId?: string;
}

export default ({ strapi }: { strapi: any }) => ({
  /** Current settings, or the pre-configuration behaviour when there is no entry. */
  async settings(): Promise<DemoResetSettings> {
    try {
      const entry = await strapi.documents('api::demo-reset.demo-reset').findFirst({});
      if (entry) return entry as DemoResetSettings;
    } catch (e) {
      logError('[demo-reset] reading settings', e);
    }
    return {
      enabled: true,
      wipeContent: true,
      wipeUserContent: false,
      resetAffinityGraphs: true,
    };
  },

  /**
   * @param dryRun report what would happen without doing it.
   *
   * This deletes everything visitors created, and there is no undo. A
   * destructive job that can only be understood by running it is one nobody
   * dares run — so it can be asked first.
   */
  async run(dryRun = false): Promise<{ skipped?: string; dryRun?: boolean; steps: string[] }> {
    if (process.env.DEMO_MODE === 'false') {
      return { skipped: 'DEMO_MODE is false', steps: [] };
    }

    const settings = await this.settings();
    if (!settings.enabled) {
      return { skipped: 'disabled in the Demo Reset single type', steps: [] };
    }

    const steps: string[] = [];

    try {
      if (settings.wipeUserContent) {
        for (const uid of USER_CONTENT_UIDS) {
          const name = uid.split('.').pop();
          try {
            if (dryRun) {
              const count = await strapi.db.query(uid).count({});
              steps.push(`${name}: ${count ?? 0} would be deleted`);
              continue;
            }
            const { count } = await strapi.db.query(uid).deleteMany({});
            steps.push(`${name}: ${count ?? 0} deleted`);
          } catch (e: any) {
            steps.push(`${name}: FAILED (${e?.message || e})`);
            logError(`[demo-reset] wiping ${uid}`, e);
          }
        }
      }

      if (settings.wipeContent) {
        if (dryRun) {
          steps.push('content would be deleted and re-seeded');
        } else {
          const result = await strapi.service('api::feed.feed').seedDemoData(true);
          steps.push(`content re-seeded (${result?.count ?? 0} feed items)`);
        }
      }

      if (settings.resetAffinityGraphs && dryRun) {
        const count = await strapi.db.query('plugin::users-permissions.user').count({});
        steps.push(`affinity graphs would be reset for ${count} user(s)`);
      } else if (settings.resetAffinityGraphs) {
        const { defaultAffinityGraph } = await import('../../../lib/affinity');
        const { count } = await strapi.db.query('plugin::users-permissions.user').updateMany({
          where: {},
          data: { affinityGraph: defaultAffinityGraph() },
        });
        steps.push(`affinity graphs reset for ${count} user(s)`);
      }
    } catch (e: any) {
      steps.push(`ABORTED: ${e?.message || e}`);
      logError('[demo-reset] run', e);
    }

    // Recorded on the entry, so last night's outcome is visible in the admin
    // panel rather than only in a log nobody reads at 04:00.
    // A dry run is not a run; recording it would misreport when the last real
    // reset happened.
    if (settings.documentId && !dryRun) {
      try {
        await strapi.documents('api::demo-reset.demo-reset').update({
          documentId: settings.documentId,
          data: { lastRunAt: new Date().toISOString(), lastRunSummary: steps.join('\n') },
        });
      } catch (e) {
        logError('[demo-reset] recording summary', e);
      }
    }

    return dryRun ? { dryRun: true, steps } : { steps };
  },
});
