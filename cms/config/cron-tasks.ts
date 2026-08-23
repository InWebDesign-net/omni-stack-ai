/**
 * The nightly reset.
 *
 * What it does lives in `api::feed.demo-reset`, configured by the `demo-reset`
 * single type — switching it off or widening it needs no deploy, the same
 * reasoning as the cookie banner. This file only says *when*.
 */
export default {
  /** Cron format: '0 4 * * *' (minute 0, hour 4, every day). */
  '0 4 * * *': async ({ strapi }: { strapi: any }) => {
    console.log('🌙 Running nightly demo reset (04:00)...');
    const result = await strapi.service('api::feed.demo-reset').run();

    if (result.skipped) {
      console.log(`⏭️ Skipped: ${result.skipped}`);
      return;
    }
    console.log('✅ Nightly reset completed:', result.steps.join(' · '));
  },
};
