import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const slug = searchParams.get('slug');
  const documentId = searchParams.get('documentId');
  const type = searchParams.get('type') || 'article';
  const status = searchParams.get('status') || 'draft';

  const expectedSecret = process.env.STRAPI_PREVIEW_SECRET || 'omni_preview_secret_2026';

  if (secret !== expectedSecret || (!slug && !documentId)) {
    return new Response('Invalid secret token or missing slug', { status: 401 });
  }

  const targetSlug = slug || documentId;
  const draft = await draftMode();

  if (status === 'published') {
    draft.disable();
  } else {
    draft.enable();
  }

  const destination = type === 'short'
    ? `/shorts/${targetSlug}?status=${status}`
    : type === 'video'
    ? `/video/${targetSlug}?status=${status}`
    : type === 'image'
    ? `/image/${targetSlug}?status=${status}`
    : type === 'article'
    ? `/article/${targetSlug}?status=${status}`
    : `/content/${targetSlug}?status=${status}`;

  redirect(destination);
}
