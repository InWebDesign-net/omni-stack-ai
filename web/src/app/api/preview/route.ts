import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const slug = searchParams.get('slug');
  const type = searchParams.get('type') || 'article';

  const expectedSecret = process.env.STRAPI_PREVIEW_SECRET || 'omni_preview_secret_2026';

  if (secret !== expectedSecret || !slug) {
    return new Response('Invalid secret token or missing slug', { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  if (type === 'short') {
    redirect(`/shorts/${slug}`);
  } else {
    redirect(`/content/${slug}`);
  }
}
