import { logError } from '../../../lib/log-error';

/**
 * The layer on top of the catalogue: conversations, likes and playlists.
 *
 * Content alone makes a preview look abandoned — every comment section empty,
 * every heart at zero, every profile without a list. This seeds the traces of
 * people having used it.
 *
 * Everything references content by **slug** and users by **handle**, resolved
 * here. Numeric ids change on every re-seed, and one item is several rows
 * across locales, so a fixture holding ids would point at the wrong row or at
 * nothing the morning after it was written.
 */

interface EngagementFixture {
  comments?: Array<{
    slug: string;
    author: string;
    text: string;
    replies?: Array<{ author: string; text: string }>;
  }>;
  likes?: Array<{ handle: string; videos?: string[]; images?: string[]; articles?: string[] }>;
  subscriptions?: Array<{ subscriber: string; channel: string }>;
  notifications?: Array<{
    recipient: string;
    sender?: string;
    type: 'chat_message' | 'comment_reply' | 'new_video' | 'new_subscriber';
    title: string;
    message?: string;
    link?: string;
    isRead?: boolean;
  }>;
  chatRooms?: Array<{
    slug: string;
    name: string;
    type: 'direct' | 'group' | 'ai' | 'global';
    participants: string[];
    admin?: string;
    isAiEnabled?: boolean;
    messages: Array<{ from: string; text: string }>;
  }>;
  playlists?: Array<{
    owner: string;
    title: string;
    description?: string;
    visibility?: 'private' | 'unlisted' | 'subscribers' | 'public';
    videos: string[];
  }>;
}

export default ({ strapi }: { strapi: any }) => ({
  async seed(fixture: EngagementFixture, usersByHandle: Record<string, any>) {
    const steps: string[] = [];

    /** One content row per slug, whichever locale — the like relation takes a row. */
    const findOne = async (uid: string, slug: string) => {
      const rows = await strapi.documents(uid).findMany({
        filters: { slug: { $eq: slug } },
        locale: 'de',
        limit: 1,
        omniInternal: true,
      } as any);
      return rows?.[0] || null;
    };

    /**
     * The English version of a German comment, deliberately without text.
     *
     * It exists so a translation has somewhere to land later, and renders
     * nowhere until it has words — an English reader sees no comment rather
     * than a German one (discussion #93). The demo threads are written in
     * German, so English is the empty side here.
     */
    const createUntranslated = async (documentId: string) => {
      try {
        await strapi.documents('api::comment.comment').update({
          documentId,
          locale: 'en',
          data: { text: '' },
        } as any);
      } catch (e) {
        logError('[seed-engagement] untranslated counterpart', e);
      }
    };

    // ---- Comments, parents before replies so a reply has something to attach to
    let commentCount = 0;
    for (const entry of fixture.comments || []) {
      const author = usersByHandle[entry.author];
      if (!author) continue;
      try {
        const parent = await strapi.documents('api::comment.comment').create({
          data: {
            text: entry.text,
            feedSlug: entry.slug,
            authorName: author.username,
            authorHandle: author.handle,
            authorAvatar: author.avatarUrl,
            user: author.id,
            depth: 0,
            repliesCount: (entry.replies || []).length,
          },
          locale: 'de',
        } as any);
        commentCount += 1;
        await createUntranslated(parent.documentId);

        for (const reply of entry.replies || []) {
          const replyAuthor = usersByHandle[reply.author];
          if (!replyAuthor) continue;
          const created = await strapi.documents('api::comment.comment').create({
            data: {
              text: reply.text,
              feedSlug: entry.slug,
              authorName: replyAuthor.username,
              authorHandle: replyAuthor.handle,
              authorAvatar: replyAuthor.avatarUrl,
              user: replyAuthor.id,
              parent: parent.id,
              depth: 1,
            },
            locale: 'de',
          } as any);
          commentCount += 1;
          await createUntranslated(created.documentId);
        }
      } catch (e) {
        logError(`[seed-engagement] comment on "${entry.slug}"`, e);
      }
    }
    steps.push(`${commentCount} comments`);

    // ---- Likes
    let likeCount = 0;
    for (const entry of fixture.likes || []) {
      const user = usersByHandle[entry.handle];
      if (!user) continue;

      const targets: Array<[string, string, string]> = [
        ...(entry.videos || []).map((s) => ['api::video.video', 'video', s] as [string, string, string]),
        ...(entry.images || []).map((s) => ['api::image.image', 'image', s] as [string, string, string]),
        ...(entry.articles || []).map((s) => ['api::article.article', 'article', s] as [string, string, string]),
      ];

      for (const [uid, relation, slug] of targets) {
        try {
          const row = await findOne(uid, slug);
          if (!row) continue;
          await strapi.documents('api::like.like').create({
            data: { user: user.id, userIdentifier: `user-${user.id}`, [relation]: row.id },
          });
          likeCount += 1;
        } catch (e) {
          logError(`[seed-engagement] like ${relation} "${slug}"`, e);
        }
      }
    }
    steps.push(`${likeCount} likes`);

    // ---- Playlists
    let playlistCount = 0;
    for (const entry of fixture.playlists || []) {
      const owner = usersByHandle[entry.owner];
      if (!owner) continue;
      try {
        const entries: Array<{ video: number }> = [];
        for (const slug of entry.videos) {
          const row = await findOne('api::video.video', slug);
          if (row) entries.push({ video: row.id });
        }
        if (entries.length === 0) continue;

        await strapi.documents('api::playlist.playlist').create({
          data: {
            title: entry.title,
            description: entry.description,
            visibility: entry.visibility || 'private',
            owner: owner.id,
            entries,
          },
        });
        playlistCount += 1;
      } catch (e) {
        logError(`[seed-engagement] playlist "${entry.title}"`, e);
      }
    }
    steps.push(`${playlistCount} playlists`);

    // ---- Chat
    let roomCount = 0;
    let messageCount = 0;
    for (const entry of fixture.chatRooms || []) {
      try {
        const participants = entry.participants
          .map((handle) => usersByHandle[handle]?.id)
          .filter(Boolean);
        if (participants.length === 0) continue;

        const room = await strapi.documents('api::chat-room.chat-room').create({
          data: {
            name: entry.name,
            slug: entry.slug,
            type: entry.type,
            language: 'de',
            isAiEnabled: Boolean(entry.isAiEnabled) || entry.type === 'ai',
            isActive: true,
            participants,
            adminUser: entry.admin ? usersByHandle[entry.admin]?.id : participants[0],
          },
        });
        roomCount += 1;

        let last: any = null;
        for (const message of entry.messages) {
          // `from: 'ai'` has no user behind it, which is the point: the
          // assistant is a sender type, not an account.
          const sender = message.from === 'ai' ? null : usersByHandle[message.from];
          if (message.from !== 'ai' && !sender) continue;

          last = await strapi.documents('api::chat-message.chat-message').create({
            data: {
              room: room.id,
              sender: sender?.id,
              senderType: message.from === 'ai' ? 'ai' : 'user',
              content: message.text,
            },
          });
          messageCount += 1;
        }

        // The room list shows a preview and sorts on it; without this every
        // seeded room looks like it has never been used.
        if (last) {
          await strapi.documents('api::chat-room.chat-room').update({
            documentId: room.documentId,
            data: {
              lastMessageAt: new Date().toISOString(),
              lastMessagePreview: entry.messages[entry.messages.length - 1].text.slice(0, 120),
              lastMessageSenderType: entry.messages[entry.messages.length - 1].from === 'ai' ? 'ai' : 'user',
            },
          });
        }
      } catch (e) {
        logError(`[seed-engagement] chat room "${entry.slug}"`, e);
      }
    }
    steps.push(`${roomCount} chat rooms with ${messageCount} messages`);

    // ---- Subscriptions between the channels
    let subscriptionCount = 0;
    for (const entry of fixture.subscriptions || []) {
      const subscriber = usersByHandle[entry.subscriber];
      const channel = usersByHandle[entry.channel];
      if (!subscriber || !channel) continue;
      try {
        await strapi.documents('api::subscription.subscription').create({
          data: {
            type: 'channel',
            subscriber: subscriber.id,
            targetUser: channel.id,
            // Explicit, because the model distinguishes "subscribed" from
            // "explicitly muted" and from "never decided".
            isSubscribed: true,
          },
        });
        subscriptionCount += 1;
      } catch (e) {
        logError(`[seed-engagement] subscription ${entry.subscriber} -> ${entry.channel}`, e);
      }
    }
    steps.push(`${subscriptionCount} subscriptions`);

    /*
     * Notifications are normally a by-product of activity, and seeded content
     * produces none — nobody was logged in when it was written. Without a few
     * the bell is empty on a preview whose whole point is showing what the app
     * does, so the demo accounts get some that match conversations actually in
     * the fixture: the reply quoted here is a reply that exists.
     */
    let notificationCount = 0;
    for (const entry of fixture.notifications || []) {
      const recipient = usersByHandle[entry.recipient];
      if (!recipient) continue;
      try {
        await strapi.documents('api::notification.notification').create({
          data: {
            type: entry.type,
            title: entry.title,
            message: entry.message,
            link: entry.link,
            isRead: Boolean(entry.isRead),
            recipient: recipient.id,
            sender: entry.sender ? usersByHandle[entry.sender]?.id : undefined,
          },
        });
        notificationCount += 1;
      } catch (e) {
        logError(`[seed-engagement] notification for ${entry.recipient}`, e);
      }
    }
    steps.push(`${notificationCount} notifications`);

    return steps;
  },
});
