/**
 * Keeps the room's preview of its newest message up to date.
 *
 * The room list renders one line per room — the last message and its time.
 * Reading that out of the `messages` relation meant populating every message
 * of every room to display a single line each, and Strapi's `strictParams`
 * rejects `limit` inside `populate`, so there is no way to ask for just the
 * newest one over REST. Storing the preview on the room turns that query into
 * a plain field read.
 *
 * This lives in a lifecycle rather than in the route that happens to create
 * messages today, so any other path that creates one keeps the preview
 * correct.
 */

const PREVIEW_MAX = 140;

async function refreshRoomPreview(event: any) {
  const { result } = event;
  const roomId = result?.room?.id ?? event.params?.data?.room;
  if (!roomId) return;

  const content = typeof result?.content === 'string' ? result.content : '';
  const preview = content.length > PREVIEW_MAX ? `${content.slice(0, PREVIEW_MAX - 1)}…` : content;

  try {
    await strapi.db.query('api::chat-room.chat-room').update({
      where: typeof roomId === 'string' ? { documentId: roomId } : { id: roomId },
      data: {
        lastMessageAt: result?.createdAt || new Date().toISOString(),
        lastMessagePreview: preview,
        lastMessageSenderType: result?.senderType || 'user',
      },
    });
  } catch (err: any) {
    // A stale preview must never make sending a message fail.
    strapi.log.error(`Failed to refresh room preview: ${err?.message || err}`);
  }
}

export default {
  async afterCreate(event: any) {
    await refreshRoomPreview(event);
  },
};
