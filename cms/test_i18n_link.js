import { createStrapi } from '@strapi/strapi';

async function main() {
  const strapi = await createStrapi().load();
  try {
    console.log('Testing Strapi 5 i18n document localization...');
    
    // 1. Create EN item
    const createdEn = await strapi.documents('api::feed-item.feed-item').create({
      data: {
        title: 'Test English Post ' + Date.now(),
        slug: 'test-english-post-' + Date.now(),
        summary: 'English summary test',
        tags: ['Tech'],
      } as any,
      locale: 'en',
      status: 'published',
    });
    console.log('Created EN item:', { documentId: createdEn.documentId, locale: createdEn.locale });

    // 2. Create DE localization using documentId
    const createdDe = await strapi.documents('api::feed-item.feed-item').create({
      documentId: createdEn.documentId,
      data: {
        title: 'Test Deutscher Post ' + Date.now(),
        slug: 'test-deutscher-post-' + Date.now(),
        summary: 'Deutscher Zusammenfassungstest',
        tags: ['Tech'],
      } as any,
      locale: 'de',
      status: 'published',
    });
    console.log('Created DE item:', { documentId: createdDe.documentId, locale: createdDe.locale });

    // 3. Query documentId with locale: '*'
    const all = await strapi.documents('api::feed-item.feed-item').findMany({
      filters: { documentId: { $eq: createdEn.documentId } },
      locale: '*',
    });
    console.log('Query result for documentId:', all.map((i: any) => ({ documentId: i.documentId, locale: i.locale, title: i.title })));

  } catch (e: any) {
    console.error('Error:', e);
  }
  process.exit(0);
}

main();
