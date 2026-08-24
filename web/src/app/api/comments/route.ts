import { NextResponse } from 'next/server';
import { AVATAR_PLACEHOLDER, resolveAvatarUrl } from '@/lib/avatar';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('pageSize') || searchParams.get('limit') || '100';
  const locale = searchParams.get('lang') === 'en' ? 'en' : 'de';

  try {
    /*
     * Asked for one language, and only where that language has words.
     *
     * A comment exists in both languages from the moment it is written, but the
     * one it was not written in starts empty — that is what "not translated
     * yet" looks like in the model (see discussion #93). Rendering an empty
     * version would be an empty bubble; rendering the other language's text
     * would put German on an English page. Filtering here does neither.
     *
     * Without an explicit locale Strapi answers from the default one, which is
     * how every i18n bug in this repo has started.
     */
    const notEmpty = '&filters[text][$notNull]=true&filters[text][$ne]=';
    let endpoint = `${STRAPI_URL}/api/comments?locale=${encodeURIComponent(String(locale))}${notEmpty}&populate=*&sort=createdAt:asc&pagination[page]=${encodeURIComponent(String(page))}&pagination[pageSize]=${encodeURIComponent(String(pageSize))}`;
    if (slug) {
      endpoint = `${STRAPI_URL}/api/comments?filters[feedSlug][$eq]=${encodeURIComponent(slug)}&locale=${encodeURIComponent(String(locale))}${notEmpty}&populate=*&sort=createdAt:asc&pagination[page]=${encodeURIComponent(String(page))}&pagination[pageSize]=${encodeURIComponent(String(pageSize))}`;
    }

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, data: [], meta: { pagination: { total: 0 } } }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json({
      success: true,
      data: json.data || [],
      meta: json.meta || { pagination: { total: (json.data || []).length, page: Number(page), pageSize: Number(pageSize) } },
    });
  } catch (error: any) {
    console.error('Error fetching comments from Strapi:', error);
    return NextResponse.json({ success: false, data: [], meta: { pagination: { total: 0 } } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { feedSlug, text, authorName, authorHandle, authorAvatar, parentId } = body;
    /* The language the comment was actually written in. */
    const locale = body.lang === 'en' ? 'en' : 'de';
    const otherLocale = locale === 'de' ? 'en' : 'de';

    if (!feedSlug || !text) {
      return NextResponse.json({ success: false, error: 'feedSlug and text required' }, { status: 400 });
    }

    let calculatedDepth = 0;
    let parentDocId: string | null = null;
    let parentAuthorHandle: string | null = null;

    if (parentId) {
      try {
        const parentRes = await fetch(`${STRAPI_URL}/api/comments/${encodeURIComponent(String(parentId))}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        if (parentRes.ok) {
          const parentJson = await parentRes.json();
          const pData = parentJson.data;
          if (pData) {
            parentDocId = pData.documentId || pData.id;
            calculatedDepth = (pData.depth || 0) + 1;
            parentAuthorHandle = pData.authorHandle || null;

            // Increment repliesCount on parent comment
            await fetch(`${STRAPI_URL}/api/comments/${encodeURIComponent(String(parentDocId))}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: {
                  repliesCount: (pData.repliesCount || 0) + 1,
                },
              }),
            }).catch((e) => { console.error('Unhandled promise rejection:', e); });
          }
        }
      } catch (e) {
        console.error('Error fetching parent comment:', e);
      }
    }

    const payload: any = {
      data: {
        feedSlug,
        text,
        authorName: authorName || 'Gast',
        authorHandle: authorHandle || '@gast',
        authorAvatar: resolveAvatarUrl(authorAvatar),
        isEdited: false,
        depth: calculatedDepth,
        repliesCount: 0,
      },
    };

    if (parentDocId) {
      payload.data.parent = parentDocId;
    }

    const res = await fetch(`${STRAPI_URL}/api/comments?locale=${encodeURIComponent(String(locale))}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ success: false, error: json.error }, { status: res.status });
    }

    const commentId = json.data?.documentId || json.data?.id;

    /*
     * The other language, deliberately without text.
     *
     * It exists so a translation has somewhere to land, and it renders nowhere
     * until it has words — the reader on the English page sees no comment
     * rather than a German one (discussion #93). Everything except the text is
     * shared between the two versions, so this carries no duplicate of the
     * author or the thread position.
     *
     * A failure here costs the future translation, not the comment that was
     * just written, so it does not fail the request.
     */
    if (commentId) {
      try {
        await fetch(`${STRAPI_URL}/api/comments/${encodeURIComponent(String(commentId))}?locale=${encodeURIComponent(String(otherLocale))}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { text: '' } }),
        });
      } catch (e) {
        console.error('[comments] could not create the untranslated counterpart:', e);
      }
    }

    // Sync commentsCount and send Notifications for Creator & Parent Comment Author
    if (feedSlug) {
      try {
        const token = process.env.STRAPI_API_TOKEN;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        let mediaKind: 'article' | 'image' | 'video' | 'feed-item' = 'video';
        let contentTitle = '';
        let creatorHandle = '';
        let creatorId: number | undefined;
        let matched = false;

        // 1. Check Article
        const artRes = await fetch(`${STRAPI_URL}/api/articles?filters[slug][$eq]=${encodeURIComponent(feedSlug)}&populate[creator]=true&locale=*`, { headers });
        if (artRes.ok) {
          const artData = await artRes.json();
          const items = artData.data || [];
          if (items.length > 0) {
            matched = true;
            mediaKind = 'article';
            const item = items[0];
            contentTitle = item.title || '';
            if (item.creator) {
              creatorHandle = item.creator.handle || item.creator.username;
              creatorId = item.creator.id;
            }
            for (const it of items) {
              const currentCount = Number(it.commentsCount || 0);
              const nextCount = currentCount + 1;
              for (const statusParam of ['', '?status=published']) {
                await fetch(`${STRAPI_URL}/api/articles/${encodeURIComponent(String(it.documentId || it.id))}${encodeURIComponent(String(statusParam))}`, {
                  method: 'PUT',
                  headers,
                  body: JSON.stringify({ data: { commentsCount: nextCount } }),
                }).catch((e) => { console.error('Unhandled promise rejection:', e); });
              }
            }
          }
        }

        // 2. Check Image
        if (!matched) {
          const imgRes = await fetch(`${STRAPI_URL}/api/images?filters[slug][$eq]=${encodeURIComponent(feedSlug)}&populate[creator]=true&locale=*`, { headers });
          if (imgRes.ok) {
            const imgData = await imgRes.json();
            const items = imgData.data || [];
            if (items.length > 0) {
              matched = true;
              mediaKind = 'image';
              const item = items[0];
              contentTitle = item.title || '';
              if (item.creator) {
                creatorHandle = item.creator.handle || item.creator.username;
                creatorId = item.creator.id;
              }
              for (const it of items) {
                const currentCount = Number(it.commentsCount || 0);
                const nextCount = currentCount + 1;
                for (const statusParam of ['', '?status=published']) {
                  await fetch(`${STRAPI_URL}/api/images/${encodeURIComponent(String(it.documentId || it.id))}${encodeURIComponent(String(statusParam))}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ data: { commentsCount: nextCount } }),
                  }).catch((e) => { console.error('Unhandled promise rejection:', e); });
                }
              }
            }
          }
        }

        // 3. Check Video
        if (!matched) {
          const vidRes = await fetch(`${STRAPI_URL}/api/videos?filters[slug][$eq]=${encodeURIComponent(feedSlug)}&populate[creator]=true&locale=*`, { headers });
          if (vidRes.ok) {
            const vidData = await vidRes.json();
            const items = vidData.data || [];
            if (items.length > 0) {
              matched = true;
              mediaKind = 'video';
              const item = items[0];
              contentTitle = item.title || '';
              if (item.creator) {
                creatorHandle = item.creator.handle || item.creator.username;
                creatorId = item.creator.id;
              }
              for (const it of items) {
                const currentCount = Number(it.commentsCount || 0);
                const nextCount = currentCount + 1;
                for (const statusParam of ['', '?status=published']) {
                  await fetch(`${STRAPI_URL}/api/videos/${encodeURIComponent(String(it.documentId || it.id))}${encodeURIComponent(String(statusParam))}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ data: { commentsCount: nextCount } }),
                  }).catch((e) => { console.error('Unhandled promise rejection:', e); });
                }
              }
            }
          }
        }

        const basePath = mediaKind === 'article' ? `/article/${feedSlug}` : mediaKind === 'image' ? `/image/${feedSlug}` : `/video/${feedSlug}`;
        /*
         * `#comments`, not `#comment-<id>`. The per-comment anchor was never
         * rendered by anything — no element carried that id — so every comment
         * notification landed at the top of the page and left the reader to
         * find the thread. The section anchor exists and is close enough.
         */
        const anchorLink = `${basePath}#comments`;
        const senderTag = authorName || (authorHandle ? `@${authorHandle.replace(/^@/, '')}` : 'Jemand');

        // A. Notify Parent Comment Author (Reply notification)
        if (parentDocId && parentAuthorHandle && parentAuthorHandle !== authorHandle) {
          await fetch(`${STRAPI_URL}/api/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'comment_reply',
              title: 'Neue Antwort auf deinen Kommentar',
              message: `${senderTag} hat auf deinen Kommentar geantwortet: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
              link: anchorLink,
              targetUserHandle: parentAuthorHandle,
              contentTitle,
            }),
          }).catch((e) => { console.error('Unhandled promise rejection:', e); });
        }

        // B. Notify Content Creator (Content comment notification)
        if (creatorHandle || creatorId) {
          const normCreatorHandle = creatorHandle ? creatorHandle.replace(/^@/, '').toLowerCase() : '';
          const normAuthorHandle = authorHandle ? authorHandle.replace(/^@/, '').toLowerCase() : '';
          if (normCreatorHandle !== normAuthorHandle) {
            await fetch(`${STRAPI_URL}/api/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'new_comment',
                title: 'Neuer Kommentar',
                message: `${senderTag} hat deinen Inhalt "${contentTitle || feedSlug}" kommentiert: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
                link: anchorLink,
                recipientId: creatorId,
                targetUserHandle: creatorHandle,
                contentTitle,
              }),
            }).catch((e) => { console.error('Unhandled promise rejection:', e); });
          }
        }
      } catch (e) {
        console.error('Error in comment notification trigger:', e);
      }
    }

    return NextResponse.json({ success: true, data: json.data });
  } catch (error: any) {
    console.error('Error creating comment in Strapi:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { documentId, id, text } = body;
    const targetId = documentId || id;

    if (!targetId || !text) {
      return NextResponse.json({ success: false, error: 'documentId and text required' }, { status: 400 });
    }

    const payload = {
      data: {
        text,
        isEdited: true,
      },
    };

    const res = await fetch(`${STRAPI_URL}/api/comments/${encodeURIComponent(String(targetId))}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ success: false, error: json.error }, { status: res.status });
    }

    return NextResponse.json({ success: true, data: json.data });
  } catch (error: any) {
    console.error('Error updating comment in Strapi:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('documentId');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id or documentId required' }, { status: 400 });
    }

    let feedSlug: string | null = null;
    try {
      const getRes = await fetch(`${STRAPI_URL}/api/comments/${encodeURIComponent(String(id))}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (getRes.ok) {
        const getJson = await getRes.json();
        feedSlug = getJson.data?.feedSlug || null;
      }
    } catch (e) { console.error('Unexpected error in catch block:', e); }

    const res = await fetch(`${STRAPI_URL}/api/comments/${encodeURIComponent(String(id))}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return NextResponse.json({ success: false, error: json.error }, { status: res.status });
    }

    if (feedSlug) {
      try {
        const token = process.env.STRAPI_API_TOKEN;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        // Decrement on article
        const artRes = await fetch(`${STRAPI_URL}/api/articles?filters[slug][$eq]=${encodeURIComponent(feedSlug)}&locale=*`, { headers });
        if (artRes.ok) {
          const artData = await artRes.json();
          for (const it of artData.data || []) {
            const currentCount = Number(it.commentsCount || 0);
            const nextCount = Math.max(0, currentCount - 1);
            for (const statusParam of ['', '?status=published']) {
              await fetch(`${STRAPI_URL}/api/articles/${encodeURIComponent(String(it.documentId || it.id))}${encodeURIComponent(String(statusParam))}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ data: { commentsCount: nextCount } }),
              }).catch((e) => { console.error('Unhandled promise rejection:', e); });
            }
          }
        }

        // Decrement on image
        const imgRes = await fetch(`${STRAPI_URL}/api/images?filters[slug][$eq]=${encodeURIComponent(feedSlug)}&locale=*`, { headers });
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          for (const it of imgData.data || []) {
            const currentCount = Number(it.commentsCount || 0);
            const nextCount = Math.max(0, currentCount - 1);
            for (const statusParam of ['', '?status=published']) {
              await fetch(`${STRAPI_URL}/api/images/${encodeURIComponent(String(it.documentId || it.id))}${encodeURIComponent(String(statusParam))}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ data: { commentsCount: nextCount } }),
              }).catch((e) => { console.error('Unhandled promise rejection:', e); });
            }
          }
        }

        // Decrement on video
        const vidRes = await fetch(`${STRAPI_URL}/api/videos?filters[slug][$eq]=${encodeURIComponent(feedSlug)}&locale=*`, { headers });
        if (vidRes.ok) {
          const vidData = await vidRes.json();
          for (const it of vidData.data || []) {
            const currentCount = Number(it.commentsCount || 0);
            const nextCount = Math.max(0, currentCount - 1);
            for (const statusParam of ['', '?status=published']) {
              await fetch(`${STRAPI_URL}/api/videos/${encodeURIComponent(String(it.documentId || it.id))}${encodeURIComponent(String(statusParam))}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ data: { commentsCount: nextCount } }),
              }).catch((e) => { console.error('Unhandled promise rejection:', e); });
            }
          }
        }
      } catch (e) { console.error('Unexpected error in catch block:', e); }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting comment in Strapi:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
