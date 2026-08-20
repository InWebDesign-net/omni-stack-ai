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
      `${STRAPI_URL}/api/chat-rooms?populate[participants][populate]=*&populate[adminUser][populate]=*&populate[messages][populate]=*&sort=updatedAt:desc&pagination[pageSize]=100`,
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

    return NextResponse.json({
      currentUser: user,
      rooms,
      messages,
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
    const { action, roomId, content, recipientId, participantIds, name, type, senderType } = body;

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

      // Trigger notification for other room participants if sender is a user
      if (user?.id && senderType === 'user' && room) {
        const participants = room.participants || room.attributes?.participants || [];
        const otherParticipants = (Array.isArray(participants) ? participants : [])
          .map((p: any) => p.id || p.documentId)
          .filter((pId: any) => String(pId) !== String(user.id));

        for (const targetRecipientId of otherParticipants) {
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
        console.error('[route.ts] unhandled error', err);
      }
        }
      }

      return NextResponse.json({ message: savedMsg, room, success: true });
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
