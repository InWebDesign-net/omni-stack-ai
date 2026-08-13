import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

async function getOrCreateRoomBySlug(slug: string, name: string = 'Omni Chat', type: string = 'direct', authHeader: string = '') {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authHeader) headers['Authorization'] = authHeader;
  if (process.env.STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;

  // 1. Try finding room by slug
  const findRes = await fetch(`${STRAPI_URL}/api/chat-rooms?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`, {
    headers,
    cache: 'no-store',
  });

  if (findRes.ok) {
    const data = await findRes.json();
    if (Array.isArray(data.data) && data.data.length > 0) {
      return data.data[0];
    }
  }

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
      },
    }),
  });

  if (createRes.ok) {
    const data = await createRes.json();
    return data.data;
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const searchUser = searchParams.get('searchUser');

    const authHeader = req.headers.get('authorization') || '';
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
          if (u.allowDirectMessages === 'nobody') return false;
          const matchUsername = u.username && u.username.toLowerCase().includes(q);
          const matchHandle = u.handle && u.handle.toLowerCase().includes(q);
          return matchUsername || matchHandle;
        });

        return NextResponse.json({ users: eligibleUsers });
      }
      return NextResponse.json({ users: [] });
    }

    // Fetch chat rooms from Strapi REST API
    const roomsRes = await fetch(`${STRAPI_URL}/api/chat-rooms?populate=*&sort=updatedAt:desc&pagination[pageSize]=100`, {
      headers,
      cache: 'no-store',
    });

    let rooms: any[] = [];
    if (roomsRes.ok) {
      const data = await roomsRes.json();
      rooms = data?.data || [];
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
      rooms,
      messages,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch chat data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) headers['Authorization'] = authHeader;
    if (process.env.STRAPI_API_TOKEN) headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;

    const body = await req.json();
    const { action, roomId, content, recipientId, name, type, senderType } = body;

    // Action 1: Create a new chatroom (Direct message, Group chat, or AI chat)
    if (action === 'create_room') {
      const slug = `room-${Date.now()}`;
      const room = await getOrCreateRoomBySlug(slug, name || (type === 'ai' ? 'Omni KI-Assistent' : 'Neuer Chat'), type || 'direct', authHeader);
      return NextResponse.json({ room, success: true });
    }

    // Action 2: Send a message in a room
    if (action === 'send_message') {
      if (!roomId || !content) {
        return NextResponse.json({ error: 'roomId and content required' }, { status: 400 });
      }

      // Ensure room exists in Strapi database
      const room = await getOrCreateRoomBySlug(roomId, 'Omni Chat', 'ai', authHeader);
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
          },
        }),
      });

      let savedMsg = null;
      if (createMsgRes.ok) {
        const data = await createMsgRes.json();
        savedMsg = data?.data;
      }

      return NextResponse.json({ message: savedMsg, room, success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process chat action' }, { status: 500 });
  }
}
