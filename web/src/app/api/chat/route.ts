import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    const authHeader = req.headers.get('authorization') || '';

    // Fetch chat rooms from Strapi REST API
    const roomsRes = await fetch(`${STRAPI_URL}/api/chat-rooms?populate=*&pagination[pageSize]=100`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
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
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
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
    const body = await req.json();
    const { action, roomId, content, recipientId, name, type } = body;

    // Action 1: Create a new chatroom (Direct message or Group chat)
    if (action === 'create_room') {
      // Check recipient DM privacy settings if starting a 1:1 direct chat
      if (type === 'direct' && recipientId) {
        const userRes = await fetch(`${STRAPI_URL}/api/users/${recipientId}`, {
          headers: authHeader ? { Authorization: authHeader } : {},
        });
        if (userRes.ok) {
          const recipient = await userRes.json();
          if (recipient?.allowDirectMessages === 'nobody') {
            return NextResponse.json(
              { error: 'Dieser Nutzer akzeptiert aktuell keine Direktnachrichten.' },
              { status: 403 }
            );
          }
        }
      }

      const slug = `room-${Date.now()}`;
      const createRoomRes = await fetch(`${STRAPI_URL}/api/chat-rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          data: {
            name: name || 'Neuer Chat',
            slug,
            type: type || 'direct',
            language: 'de',
            isAiEnabled: type === 'ai',
          },
        }),
      });

      if (!createRoomRes.ok) {
        throw new Error(`Failed to create room in Strapi (${createRoomRes.status})`);
      }

      const createdData = await createRoomRes.json();
      return NextResponse.json({ room: createdData?.data });
    }

    // Action 2: Send a message in a room
    if (action === 'send_message') {
      if (!roomId || !content) {
        return NextResponse.json({ error: 'roomId and content required' }, { status: 400 });
      }

      // Save user message to Strapi
      const createMsgRes = await fetch(`${STRAPI_URL}/api/chat-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          data: {
            content,
            senderType: 'user',
            room: roomId,
          },
        }),
      });

      let savedMsg = null;
      if (createMsgRes.ok) {
        const data = await createMsgRes.json();
        savedMsg = data?.data;
      }

      return NextResponse.json({ message: savedMsg, success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process chat action' }, { status: 500 });
  }
}
