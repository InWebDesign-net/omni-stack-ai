const { createStrapi } = require('@strapi/strapi');

async function main() {
  const strapi = await createStrapi().load();
  try {
    const defaultLocales = await strapi.plugins.i18n.services.locales.find();
    console.log('Installed Locales:', defaultLocales);

    // Let's create a test document in 'de'
    const doc1 = await strapi.documents('api::feed-item.feed-item').create({
      data: {
        title: 'Test DE Title',
        slug: 'test-de-slug-' + Date.now(),
        tags: ['Test'],
      },
      locale: 'de',
      status: 'published',
    });
    console.log('Created DE doc:', doc1.documentId, doc1.locale);

    // Now create EN localization for SAME documentId
    const doc2 = await strapi.documents('api::feed-item.feed-item').create({
      documentId: doc1.documentId,
      data: {
        title: 'Test EN Title',
        slug: 'test-en-slug-' + Date.now(),
        tags: ['Test'],
      },
      locale: 'en',
      status: 'published',
    });
    console.log('Created EN doc:', doc2.documentId, doc2.locale);

    // Find all locales for this documentId
    const allLocales = await strapi.documents('api::feed-item.feed-item').findMany({
      filters: { documentId: doc1.documentId },
      locale: '*',
    });
    console.log('Found locales:', allLocales.map(d => ({ documentId: d.documentId, locale: d.locale, title: d.title })));

    // Clean up test items
    await strapi.documents('api::feed-item.feed-item').delete({ documentId: doc1.documentId });
  } catch (e) {
    console.error('Test error:', e);
  }
  process.exit(0);
}

main();
