export default {
  /**
   * Nightly reset of demo seed data and user affinity graphs at 04:00 AM.
   * Cron format: '0 4 * * *' (Minute 0, Hour 4, Every day).
   */
  '0 4 * * *': async ({ strapi }: { strapi: any }) => {
    if (process.env.DEMO_MODE === 'false') {
      console.log('⏭️ Skipping nightly demo data reset because DEMO_MODE is false.');
      return;
    }

    console.log('🌙 Running nightly demo data & affinityGraph reset cron job (04:00 AM)...');
    try {
      // 1. Cleanly re-seed demo data
      await strapi.service('api::feed.feed').seedDemoData(true);
      console.log('✅ Nightly demo seed data reset completed.');

      // 2. Reset user affinityGraphs to canonical default shape
      const { defaultAffinityGraph } = await import('../src/lib/affinity');
      
      const { count } = await strapi.db.query('plugin::users-permissions.user').updateMany({
        where: {},
        data: { affinityGraph: defaultAffinityGraph() },
      });
      
      console.log(`✅ Nightly reset of affinityGraph completed for ${count} user(s).`);
    } catch (e: any) {
      console.error('❌ Nightly demo reset cron job error:', e?.message || e);
    }
  },
};
