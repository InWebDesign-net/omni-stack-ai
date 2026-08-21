import { NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth-server';

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

async function getOrCreateRoomBySlug(
  slug: string,
  name: string = 'Omni Chat',
  type: string = 'direct',
  participantIds: (number | string)[] = [],
  authHeader: string = '',
  adminUserId?: number | string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authHeader) headers['Authorization'] = authHeader;
  if (process.env.STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;

  // 1. Try finding room by slug
  const findRes = await fetch(
    `${STRAPI_URL}/api/chat-rooms?filters[slug][$eq]=${encodeURIComponent(slug)}&populate[participants][populate]=*&populate[adminUser][populate]=*&populate[messages][populate]=*`,
    {
      headers,
      cache: 'no-store',
    }
  );

  if (findRes.ok) {
    const data = await findRes.json();
    if (Array.isArray(data.data) && data.data.length > 0) {
      return data.data[0];
    }
  }

  // Deduplicate participant IDs
  const cleanParticipants = Array.from(new Set(participantIds.filter(Boolean)));

  // 2. Create room if it doesn't exist
  const createRes = await fetch(`${STRAPI_URL}/api/chat-rooms`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        name,
        slug,
        type,
        language: 'de',
        isAiEnabled: type === 'ai',
        ...(adminUserId ? { adminUser: adminUserId } : {}),
        ...(cleanParticipants.length > 0 ? { participants: cleanParticipants } : {}),
      },
    }),
  });

  if (createRes.ok) {
    const data = await createRes.json();
    return data.data;
  }

  return null;
}

function isUserParticipantInRoom(room: Record<string, any>, userId: number | string): boolean {
  if (!userId) return false;

  let participantsList: Record<string, any>[] = [];
  if (Array.isArray(room.participants)) {
    participantsList = room.participants;
  } else if (room.participants?.data && Array.isArray(room.participants.data)) {
    participantsList = room.participants.data;
  } else if (room.attributes?.participants && Array.isArray(room.attributes.participants)) {
    participantsList = room.attributes.participants;
  } else if (room.attributes?.participants?.data && Array.isArray(room.attributes.participants.data)) {
    participantsList = room.attributes.participants.data;
  }

  return participantsList.some((p: Record<string, any>) => {
    const pId = p.id || p.documentId;
    return String(pId) === String(userId);
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const searchUser = searchParams.get('searchUser');

    const { user, jwt } = await getCurrentUserFromCookies();
    const authHeader = req.headers.get('authorization') || (jwt ? `Bearer ${jwt}` : '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) headers['Authorization'] = authHeader;
    if (process.env.STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;

    // Search eligible users for starting a new Direct Message
    if (searchUser) {
      const q = searchUser.trim().toLowerCase();
      const usersRes = await fetch(`${STRAPI_URL}/api/users?pagination[pageSize]=100`, {
        headers,
        cache: 'no-store',
      });

      if (usersRes.ok) {
        const allUsers = await usersRes.json();
        const eligibleUsers = (allUsers || []).filter((u: any) => {
          if (user && u.id === user.id) return false; // Don't show current logged in user
          if (u.allowDirectMessages === 'nobody') return false;
          const matchUsername = u.username && u.username.toLowerCase().includes(q);
          const matchHandle = u.handle && u.handle.toLowerCase().includes(q);
          return matchUsername || matchHandle;
        });

        return NextResponse.json({ users: eligibleUsers });
      }
      return NextResponse.json({ users: [] });
    }

    // Ensure Global channel and User AI room exist
    if (user?.id) {
      await getOrCreateRoomBySlug('room-global', 'Globaler Community Chat', 'global', [], authHeader);
      await getOrCreateRoomBySlug(`room-ai-${user.id}`, 'Omni KI-Assistent', 'ai', [user.id], authHeader);
    } else {
      await getOrCreateRoomBySlug('room-global', 'Globaler Community Chat', 'global', [], authHeader);
    }

    // Fetch chat rooms from Strapi REST API with populated participants
    const roomsRes = await fetch(
      // The list shows one line per room, so it reads the denormalised preview
      // on the room itself. Populating `messages` here meant fetching every
      // message ever written to render that line, and `strictParams` rejects
      // `limit` inside `populate`, so there is no way to ask for only the newest.
      `${STRAPI_URL}/api/chat-rooms?populate[participants][fields][0]=id&populate[participants][fields][1]=username&populate[participants][fields][2]=handle&populate[participants][fields][3]=avatarUrl&populate[adminUser][fields][0]=id&populate[adminUser][fields][1]=username&sort=updatedAt:desc&pagination[pageSize]=100`,
      {
        headers,
        cache: 'no-store',
      }
    );

    let rooms: any[] = [];
    if (roomsRes.ok) {
      const data = await roomsRes.json();
      const rawRooms = data?.data || [];

      if (user?.id) {
        rooms = rawRooms.filter((room: any) => {
          const roomType = room.type || room.attributes?.type;
          // Global channels are visible to all users
          if (roomType === 'global') return true;

          // For direct, group, and AI chats: ONLY show if current user is a participant
          return isUserParticipantInRoom(room, user.id);
        });
      } else {
        // Unauthenticated guests only see global public rooms
        rooms = rawRooms.filter((room: any) => (room.type || room.attributes?.type) === 'global');
      }

      // The client renders the preview line out of `messages[last]`, so the
      // denormalised fields are shaped back into a single-element array here.
      // Trimming a fully fetched array — what this did before — still made the
      // server read every message of every room; the cost is in the query, not
      // in the response.
      rooms = rooms.map((room: any) => ({
        ...room,
        messages: room.lastMessagePreview
          ? [
              {
                content: room.lastMessagePreview,
                createdAt: room.lastMessageAt,
                timestamp: room.lastMessageAt,
                senderType: room.lastMessageSenderType || 'user',
              },
            ]
          : [],
      }));
    }

    // Fetch messages for active room if requested
    let messages: any[] = [];
    if (roomId) {
      const msgsRes = await fetch(
        `${STRAPI_URL}/api/chat-messages?filters[room][slug][$eq]=${encodeURIComponent(
          roomId
        )}&populate=*&sort=createdAt:asc&pagination[pageSize]=200`,
        {
          headers,
          cache: 'no-store',
        }
      );
      if (msgsRes.ok) {
        const msgData = await msgsRes.json();
        messages = msgData?.data || [];
      }
    }

    // Fetch current user subscriptions if authenticated
    const subscriptions: Record<string, boolean> = {};
    if (user?.id) {
      try {
        const subRes = await fetch(
          `${STRAPI_URL}/api/subscriptions?filters[type][$eq]=chat_room&filters[subscriber][id][$eq]=${user.id}&populate[targetChatRoom]=*`,
          { headers, cache: 'no-store' }
        );
        if (subRes.ok) {
          const subData = await subRes.json();
          const items = subData.data || [];
          for (const item of items) {
            const roomSlug = item.targetChatRoom?.slug || item.targetChatRoom?.documentId || String(item.targetChatRoom?.id);
            if (roomSlug) {
              subscriptions[roomSlug] = item.isSubscribed !== false;
            }
          }
        }
      } catch (e) {
        console.error('Failed to load user chat subscriptions:', e);
      }
    }

    return NextResponse.json({
      currentUser: user,
      rooms,
      messages,
      subscriptions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch chat data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, jwt } = await getCurrentUserFromCookies();
    const authHeader = req.headers.get('authorization') || (jwt ? `Bearer ${jwt}` : '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) headers['Authorization'] = authHeader;
    if (process.env.STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;

    const body = await req.json();
    const { action, roomId, content, recipientId, participantIds, name, type, senderType, isSubscribed } = body;

    // Action 1: Create a new chatroom (Direct message, Group chat, or AI chat)
    if (action === 'create_room') {
      const slug = `room-${Date.now()}`;

      // Assemble participants
      const participantsToConnect: (number | string)[] = [];
      if (user?.id) participantsToConnect.push(user.id);
      if (recipientId) participantsToConnect.push(recipientId);
      if (Array.isArray(participantIds)) participantsToConnect.push(...participantIds);

      // Check recipient DM privacy settings if starting a 1:1 direct chat
      if (type === 'direct' && recipientId) {
        const userRes = await fetch(`${STRAPI_URL}/api/users/${recipientId}`, { headers });
        if (userRes.ok) {
          const recipient = await userRes.json();
          if (recipient?.allowDirectMessages === 'nobody') {
            return NextResponse.json(
              { error: 'Dieser Nutzer akzeptiert aktuell keine Direktnachrichten.' },
              { status: 403 }
            );
          }
          if (recipient?.allowDirectMessages === 'subscribers_only' && user?.id) {
            const subRes = await fetch(
              `${STRAPI_URL}/api/subscriptions?filters[subscriber][id][$eq]=${user.id}&filters[targetUser][id][$eq]=${recipientId}&filters[type][$eq]=channel`,
              { headers }
            );
            let isSubbed = false;
            if (subRes.ok) {
              const subData = await subRes.json();
              if ((subData.data || []).length > 0) isSubbed = true;
            }
            if (!isSubbed) {
              return NextResponse.json(
                { error: 'Dieser Nutzer erlaubt Direktnachrichten nur seinen Abonnenten. Bitte abonniere den Kanal zuerst.' },
                { status: 403 }
              );
            }
          }
        }
      }

      const room = await getOrCreateRoomBySlug(
        slug,
        name || (type === 'ai' ? 'Omni KI-Assistent' : 'Neuer Chat'),
        type || 'direct',
        participantsToConnect,
        authHeader,
        user?.id
      );
      return NextResponse.json({ room, success: true });
    }

    // Action 2: Send a message in a room
    if (action === 'send_message') {
      if (!roomId || !content) {
        return NextResponse.json({ error: 'roomId and content required' }, { status: 400 });
      }

      const initialParticipants = user?.id ? [user.id] : [];
      const room = await getOrCreateRoomBySlug(roomId, 'Omni Chat', 'ai', initialParticipants, authHeader);
      const roomTarget = room?.documentId || room?.id || roomId;

      // Save message into Strapi
      const createMsgRes = await fetch(`${STRAPI_URL}/api/chat-messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            content,
            senderType: senderType || 'user',
            room: roomTarget,
            ...(user?.id && senderType === 'user' ? { sender: user.id } : {}),
          },
        }),
      });

      let savedMsg = null;
      if (createMsgRes.ok) {
        const data = await createMsgRes.json();
        savedMsg = data?.data;
      }

      // Trigger notification for other room participants if sender is a user and room is not AI (#96)
      if (user?.id && senderType === 'user' && room && room.type !== 'ai') {
        const participants = room.participants || room.attributes?.participants || [];
        const otherParticipants = (Array.isArray(participants) ? participants : [])
          .map((p: any) => ({ id: p.id, documentId: p.documentId }))
          .filter((p: any) => String(p.id) !== String(user.id) && String(p.documentId) !== String(user.id));

        const roomDocId = room.documentId || room.id;
        const roomType = room.type || 'direct';

        let subscribedUserIds = new Set<string>();
        let unsubscribedUserIds = new Set<string>();

        try {
          const subRes = await fetch(
            `${STRAPI_URL}/api/subscriptions?filters[type][$eq]=chat_room&filters[targetChatRoom][documentId][$eq]=${encodeURIComponent(
              roomDocId
            )}&populate[subscriber]=*`,
            { headers, cache: 'no-store' }
          );
          if (subRes.ok) {
            const subData = await subRes.json();
            const subs = subData.data || [];
            for (const s of subs) {
              const subId = s.subscriber?.id || s.subscriber?.documentId;
              if (subId) {
                if (s.isSubscribed === false) {
                  unsubscribedUserIds.add(String(subId));
                } else {
                  subscribedUserIds.add(String(subId));
                }
              }
            }
          }
        } catch (e) {
          console.error('Failed to query room subscriptions:', e);
        }

        for (const p of otherParticipants) {
          const targetRecipientId = p.id;
          const targetKey = String(p.id);

          // Subscription rule (#96):
          // - group: opt-in (must be explicitly subscribed)
          // - direct: opt-out (subscribed by default unless explicitly unsubscribed)
          const shouldNotify =
            roomType === 'group'
              ? subscribedUserIds.has(targetKey)
              : !unsubscribedUserIds.has(targetKey);

          if (shouldNotify && targetRecipientId) {
            try {
              await fetch(`${STRAPI_URL}/api/notifications`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  recipientId: Number(targetRecipientId),
                  type: 'chat_message',
                  title: `Neue Chat-Nachricht von ${user.username || 'Nutzer'}`,
                  message: content.length > 80 ? content.slice(0, 77) + '...' : content,
                  link: `chat:${room.slug || room.id}`,
                }),
              });
            } catch (err) {
              console.error('[route.ts] notification error', err);
            }
          }
        }
      }

      return NextResponse.json({ message: savedMsg, room, success: true });
    }

    // Action 3: Toggle chatroom notification subscription (#96)
    if (action === 'toggle_subscription') {
      const { roomId: targetRoomId } = body;
      if (!targetRoomId || !user?.id) {
        return NextResponse.json({ error: 'roomId and authenticated user required' }, { status: 400 });
      }

      const findRes = await fetch(
        `${STRAPI_URL}/api/chat-rooms?filters[slug][$eq]=${encodeURIComponent(targetRoomId)}`,
        { headers, cache: 'no-store' }
      );
      if (!findRes.ok) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      const findData = await findRes.json();
      const targetRoom = findData?.data?.[0];
      if (!targetRoom) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const roomDocId = targetRoom.documentId || targetRoom.id;

      // Find existing subscription
      const subRes = await fetch(
        `${STRAPI_URL}/api/subscriptions?filters[type][$eq]=chat_room&filters[subscriber][id][$eq]=${user.id}&filters[targetChatRoom][documentId][$eq]=${encodeURIComponent(
          roomDocId
        )}`,
        { headers, cache: 'no-store' }
      );

      const subData = subRes.ok ? await subRes.json() : { data: [] };
      const existing = subData.data?.[0];

      if (existing?.documentId) {
        await fetch(`${STRAPI_URL}/api/subscriptions/${existing.documentId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            data: {
              isSubscribed: Boolean(isSubscribed),
            },
          }),
        });
      } else {
        await fetch(`${STRAPI_URL}/api/subscriptions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            data: {
              type: 'chat_room',
              subscriber: user.id,
              targetChatRoom: roomDocId,
              isSubscribed: Boolean(isSubscribed),
            },
          }),
        });
      }

      return NextResponse.json({ success: true, isSubscribed: Boolean(isSubscribed) });
    }

    // Action 3: Update chatroom settings (e.g. toggle isAiEnabled)
    if (action === 'update_room') {
      const { isAiEnabled } = body;
      const findRes = await fetch(
        `${STRAPI_URL}/api/chat-rooms?filters[slug][$eq]=${encodeURIComponent(roomId)}`,
        { headers, cache: 'no-store' }
      );
      if (findRes.ok) {
        const findData = await findRes.json();
        const targetRoom = findData?.data?.[0];
        if (targetRoom) {
          const roomDocId = targetRoom.documentId || targetRoom.id;
          const updateRes = await fetch(`${STRAPI_URL}/api/chat-rooms/${roomDocId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              data: {
                ...(typeof isAiEnabled === 'boolean' ? { isAiEnabled } : {}),
              },
            }),
          });
          if (updateRes.ok) {
            const updated = await updateRes.json();
            return NextResponse.json({ room: updated.data, success: true });
          }
        }
      }
      return NextResponse.json({ error: 'Room not found or update failed' }, { status: 400 });
    }

    // Action 4: Add a member to room
    if (action === 'add_member') {
      const { targetUserId } = body;
      if (!roomId || !targetUserId) {
        return NextResponse.json({ error: 'roomId and targetUserId are required' }, { status: 400 });
      }

      const findRes = await fetch(
        `${STRAPI_URL}/api/chat-rooms?filters[slug][$eq]=${encodeURIComponent(roomId)}&populate[participants][populate]=*&populate[adminUser][populate]=*`,
        { headers, cache: 'no-store' }
      );
      if (findRes.ok) {
        const findData = await findRes.json();
        const targetRoom = findData?.data?.[0];
        if (targetRoom) {
          const roomDocId = targetRoom.documentId || targetRoom.id;
          const currentParticipants = (targetRoom.participants || []).map((p: any) => p.id || p.documentId);
          if (!currentParticipants.map(String).includes(String(targetUserId))) {
            currentParticipants.push(targetUserId);
          }
          const updateRes = await fetch(`${STRAPI_URL}/api/chat-rooms/${roomDocId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              data: {
                participants: currentParticipants,
              },
            }),
          });
          if (updateRes.ok) {
            const updated = await updateRes.json();
            return NextResponse.json({ room: updated.data, success: true });
          }
        }
      }
      return NextResponse.json({ error: 'Room not found or update failed' }, { status: 400 });
    }

    // Action 5: Remove a member from room
    if (action === 'remove_member') {
      const { targetUserId } = body;
      if (!roomId || !targetUserId) {
        return NextResponse.json({ error: 'roomId and targetUserId are required' }, { status: 400 });
      }

      const findRes = await fetch(
        `${STRAPI_URL}/api/chat-rooms?filters[slug][$eq]=${encodeURIComponent(roomId)}&populate[participants][populate]=*&populate[adminUser][populate]=*`,
        { headers, cache: 'no-store' }
      );
      if (findRes.ok) {
        const findData = await findRes.json();
        const targetRoom = findData?.data?.[0];
        if (targetRoom) {
          const roomDocId = targetRoom.documentId || targetRoom.id;
          const currentParticipants = (targetRoom.participants || [])
            .map((p: any) => p.id || p.documentId)
            .filter((id: any) => String(id) !== String(targetUserId));
          const updateRes = await fetch(`${STRAPI_URL}/api/chat-rooms/${roomDocId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              data: {
                participants: currentParticipants,
              },
            }),
          });
          if (updateRes.ok) {
            const updated = await updateRes.json();
            return NextResponse.json({ room: updated.data, success: true });
          }
        }
      }
      return NextResponse.json({ error: 'Room not found or update failed' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process chat action' }, { status: 500 });
  }
}
