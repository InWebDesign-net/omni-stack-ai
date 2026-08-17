import { NextRequest, NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

function getStrapiUrl(path: string) {
  return `${STRAPI_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  try {
    const formattedAuth = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
    const res = await fetch(getStrapiUrl('/api/users/me'), {
      headers: { Authorization: formattedAuth },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function resolveTargetUser(targetIdStr: string) {
  const cleanIdent = String(targetIdStr).trim().replace(/^@/, '');
  if (!cleanIdent) return null;

  if (/^\d+$/.test(cleanIdent)) {
    try {
      const res = await fetch(getStrapiUrl(`/api/users/${cleanIdent}`), {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
        console.error('[route.ts] unhandled error', e);
      }
  }

  try {
    const filterUrl = getStrapiUrl(
      `/api/users?filters[$or][0][handle][$eq]=${encodeURIComponent(cleanIdent)}&filters[$or][1][username][$eq]=${encodeURIComponent(cleanIdent)}`
    );
    const filterRes = await fetch(filterUrl, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    });
    if (filterRes.ok) {
      const list = await filterRes.json();
      if (Array.isArray(list) && list.length > 0) return list[0];
    }
  } catch (e) {
        console.error('[route.ts] unhandled error', e);
      }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    const { searchParams } = new URL(req.url);
    const targetUserParam = searchParams.get('targetUser');
    const targetChatRoomParam = searchParams.get('targetChatRoom');

    // Case A: Check subscription status for a specific target user (creator) or chat room
    if (targetUserParam || targetChatRoomParam) {
      let isSubscribed = false;
      let subscriberCount = 0;

      if (targetUserParam) {
        const targetUserObj = await resolveTargetUser(targetUserParam);
        const resolvedUserId = targetUserObj?.id || targetUserParam;
        const baseSubCount = Number(targetUserObj?.subscribersCount || 0);

        const countFilter = `filters[targetUser][id][$eq]=${resolvedUserId}&filters[type][$eq]=channel`;
        const countRes = await fetch(
          getStrapiUrl(`/api/subscriptions?${countFilter}&pagination[pageSize]=1`),
          { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
        );

        let subscriptionRecordsCount = 0;
        if (countRes.ok) {
          const countData = await countRes.json();
          subscriptionRecordsCount = countData.meta?.pagination?.total || 0;
        }

        subscriberCount = Math.max(baseSubCount, subscriptionRecordsCount);

        if (authUser?.id) {
          const userFilter = `filters[subscriber][id][$eq]=${authUser.id}&filters[targetUser][id][$eq]=${resolvedUserId}&filters[type][$eq]=channel`;
          const userRes = await fetch(
            getStrapiUrl(`/api/subscriptions?${userFilter}&pagination[pageSize]=1`),
            { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
          );
          if (userRes.ok) {
            const userData = await userRes.json();
            isSubscribed = (userData.data || []).length > 0;
          }
        }
      } else if (targetChatRoomParam) {
        const countFilter = `filters[targetChatRoom][id][$eq]=${targetChatRoomParam}&filters[type][$eq]=chat_room`;
        const countRes = await fetch(
          getStrapiUrl(`/api/subscriptions?${countFilter}&pagination[pageSize]=1`),
          { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
        );
        if (countRes.ok) {
          const countData = await countRes.json();
          subscriberCount = countData.meta?.pagination?.total || 0;
        }

        if (authUser?.id) {
          const userFilter = `filters[subscriber][id][$eq]=${authUser.id}&filters[targetChatRoom][id][$eq]=${targetChatRoomParam}&filters[type][$eq]=chat_room`;
          const userRes = await fetch(
            getStrapiUrl(`/api/subscriptions?${userFilter}&pagination[pageSize]=1`),
            { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
          );
          if (userRes.ok) {
            const userData = await userRes.json();
            isSubscribed = (userData.data || []).length > 0;
          }
        }
      }

      return NextResponse.json({ isSubscribed, subscriberCount });
    }

    // Case B: List all active subscriptions for logged-in user
    if (!authUser?.id) {
      return NextResponse.json({ subscriptions: [] });
    }

    const listRes = await fetch(
      getStrapiUrl(
        `/api/subscriptions?filters[subscriber][id][$eq]=${authUser.id}&populate[targetUser][fields][0]=username&populate[targetUser][fields][1]=handle&populate[targetUser][fields][2]=avatarUrl&populate[targetChatRoom][fields][0]=name&populate[targetChatRoom][fields][1]=slug`
      ),
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );

    if (!listRes.ok) {
      return NextResponse.json({ subscriptions: [] });
    }

    const listData = await listRes.json();
    const subscriptions = (listData.data || []).map((sub: any) => ({
      id: String(sub.id),
      type: sub.attributes?.type || sub.type || 'channel',
      targetUser: sub.attributes?.targetUser?.data
        ? {
            id: String(sub.attributes.targetUser.data.id),
            username: sub.attributes.targetUser.data.attributes?.username,
            handle: sub.attributes.targetUser.data.attributes?.handle,
            avatarUrl: sub.attributes.targetUser.data.attributes?.avatarUrl,
          }
        : sub.targetUser
        ? {
            id: String(sub.targetUser.id),
            username: sub.targetUser.username,
            handle: sub.targetUser.handle,
            avatarUrl: sub.targetUser.avatarUrl,
          }
        : null,
      targetChatRoom: sub.attributes?.targetChatRoom?.data
        ? {
            id: String(sub.attributes.targetChatRoom.data.id),
            name: sub.attributes.targetChatRoom.data.attributes?.name,
            slug: sub.attributes.targetChatRoom.data.attributes?.slug,
          }
        : sub.targetChatRoom
        ? {
            id: String(sub.targetChatRoom.id),
            name: sub.targetChatRoom.name,
            slug: sub.targetChatRoom.slug,
          }
        : null,
    }));

    return NextResponse.json({ subscriptions });
  } catch (error: any) {
    console.error('GET /api/subscriptions error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, targetId, type = 'channel' } = body;

    if (action !== 'toggle' || !targetId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let targetUserObj: any = null;
    let resolvedTargetId = targetId;

    if (type === 'channel') {
      targetUserObj = await resolveTargetUser(targetId);
      if (targetUserObj?.id) {
        resolvedTargetId = targetUserObj.id;
      }
    }

    // Check if subscription already exists
    const queryFilter =
      type === 'channel'
        ? `filters[subscriber][id][$eq]=${authUser.id}&filters[targetUser][id][$eq]=${resolvedTargetId}&filters[type][$eq]=channel`
        : `filters[subscriber][id][$eq]=${authUser.id}&filters[targetChatRoom][id][$eq]=${resolvedTargetId}&filters[type][$eq]=chat_room`;

    const existingRes = await fetch(
      getStrapiUrl(`/api/subscriptions?${queryFilter}`),
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );

    let existingItems: any[] = [];
    if (existingRes.ok) {
      const existingData = await existingRes.json();
      existingItems = existingData.data || [];
    }

    let isSubscribed = false;

    if (existingItems.length > 0) {
      // Unsubscribe all matching entries
      for (const item of existingItems) {
        const recId = item.documentId || String(item.id);
        await fetch(getStrapiUrl(`/api/subscriptions/${recId}`), {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          },
        });
      }
      isSubscribed = false;
    } else {
      // Subscribe
      const payloadData: any = {
        type,
        subscriber: authUser.id,
      };

      if (type === 'channel') {
        payloadData.targetUser = resolvedTargetId;
      } else {
        payloadData.targetChatRoom = resolvedTargetId;
      }

      const createRes = await fetch(getStrapiUrl('/api/subscriptions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({ data: payloadData }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error('Failed to create subscription in Strapi:', errText);
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
      }
      isSubscribed = true;

      // Trigger notification to creator if subscribing to channel
      if (type === 'channel' && String(resolvedTargetId) !== String(authUser.id)) {
        try {
          await fetch(getStrapiUrl('/api/notifications'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            },
            body: JSON.stringify({
              data: {
                recipient: resolvedTargetId,
                type: 'new_subscriber',
                title: 'Neuer Abonnent! 🎉',
                message: `${authUser.username || authUser.handle || 'Ein Nutzer'} abonniert jetzt deinen Kanal.`,
                link: `/user/${authUser.handle || authUser.id}`,
                isRead: false,
              },
            }),
          });
        } catch (e) {
          console.error('Failed to create new_subscriber notification:', e);
        }
      }
    }

    // Update subscribersCount on User in Strapi if channel
    let subscriberCount = 0;

    if (type === 'channel' && targetUserObj?.id) {
      const currentCount = Number(targetUserObj.subscribersCount || 0);
      const newCount = isSubscribed ? currentCount + 1 : Math.max(0, currentCount - 1);
      subscriberCount = newCount;

      try {
        await fetch(getStrapiUrl(`/api/users/${targetUserObj.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          },
          body: JSON.stringify({ subscribersCount: newCount }),
        });
      } catch (e) {
        console.error('Failed to update user subscribersCount in Strapi:', e);
      }
    } else {
      const countFilter =
        type === 'channel'
          ? `filters[targetUser][id][$eq]=${resolvedTargetId}&filters[type][$eq]=channel`
          : `filters[targetChatRoom][id][$eq]=${resolvedTargetId}&filters[type][$eq]=chat_room`;

      const countRes = await fetch(
        getStrapiUrl(`/api/subscriptions?${countFilter}&pagination[pageSize]=1`),
        { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
      );

      if (countRes.ok) {
        const countData = await countRes.json();
        subscriberCount = countData.meta?.pagination?.total || 0;
      }
    }

    return NextResponse.json({ isSubscribed, subscriberCount });
  } catch (error: any) {
    console.error('POST /api/subscriptions error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
