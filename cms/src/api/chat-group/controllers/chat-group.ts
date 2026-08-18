import { Core } from '@strapi/strapi';

interface CreateGroupParams {
  name: string;
  userId: number;
}

interface InviteParams {
  documentId: string;
  userId: number;
  targetUserId: number;
}

interface KickParams {
  documentId: string;
  userId: number;
  targetUserId: number;
}

interface CloseParams {
  documentId: string;
  userId: number;
}

interface SubscribeParams {
  documentId: string;
  userId: number;
  isSubscribed?: boolean;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createGroup(ctx: any) {
    const { name, userId } = ctx.request.body as CreateGroupParams;

    if (!name || !userId) {
      return ctx.badRequest('name and userId are required');
    }

    try {
      const group = await strapi.documents('api::chat-room.chat-room').create({
        data: {
          name,
          type: 'group',
          adminUser: userId,
          participants: [userId],
          isActive: true,
        },
      });

      return { success: true, group };
    } catch (error: any) {
      return ctx.badRequest(error.message || 'Failed to create group');
    }
  },

  async inviteUser(ctx: any) {
    const { documentId, userId, targetUserId } = ctx.request.body as InviteParams;

    if (!documentId || !userId || !targetUserId) {
      return ctx.badRequest('documentId, userId, and targetUserId are required');
    }

    try {
      const group = await strapi.documents('api::chat-room.chat-room').findOne({
        documentId,
      });

      if (!group) {
        return ctx.notFound('Group not found');
      }

      // Admin check
      if (group.adminUser?.id !== userId) {
        return ctx.unauthorized('Only admin can invite users');
      }

      // Check if already a participant
      const isParticipant = group.participants?.some((p: any) => p.id === targetUserId);
      if (isParticipant) {
        return { success: true, message: 'User already a participant' };
      }

      // Add participant
      await strapi.documents('api::chat-room.chat-room').update({
        documentId,
        data: {
          participants: {
            connect: [targetUserId],
          },
        },
      });

      return { success: true };
    } catch (error: any) {
      return ctx.badRequest(error.message || 'Failed to invite user');
    }
  },

  async kickUser(ctx: any) {
    const { documentId, userId, targetUserId } = ctx.request.body as KickParams;

    if (!documentId || !userId || !targetUserId) {
      return ctx.badRequest('documentId, userId, and targetUserId are required');
    }

    try {
      const group = await strapi.documents('api::chat-room.chat-room').findOne({
        documentId,
      });

      if (!group) {
        return ctx.notFound('Group not found');
      }

      // Admin check
      if (group.adminUser?.id !== userId) {
        return ctx.unauthorized('Only admin can kick users');
      }

      // Cannot kick yourself
      if (targetUserId === userId) {
        return ctx.badRequest('Cannot kick yourself');
      }

      // Remove participant
      await strapi.documents('api::chat-room.chat-room').update({
        documentId,
        data: {
          participants: {
            disconnect: [targetUserId],
          },
        },
      });

      return { success: true };
    } catch (error: any) {
      return ctx.badRequest(error.message || 'Failed to kick user');
    }
  },

  async closeGroup(ctx: any) {
    const { documentId, userId } = ctx.request.body as CloseParams;

    if (!documentId || !userId) {
      return ctx.badRequest('documentId and userId are required');
    }

    try {
      const group = await strapi.documents('api::chat-room.chat-room').findOne({
        documentId,
      });

      if (!group) {
        return ctx.notFound('Group not found');
      }

      // Admin check
      if (group.adminUser?.id !== userId) {
        return ctx.unauthorized('Only admin can close the group');
      }

      await strapi.documents('api::chat-room.chat-room').update({
        documentId,
        data: {
          isActive: false,
        },
      });

      return { success: true };
    } catch (error: any) {
      return ctx.badRequest(error.message || 'Failed to close group');
    }
  },

  async toggleSubscribe(ctx: any) {
    const { documentId, userId, isSubscribed } = ctx.request.body as SubscribeParams;

    if (!documentId || !userId) {
      return ctx.badRequest('documentId and userId are required');
    }

    try {
      const group = await strapi.documents('api::chat-room.chat-room').findOne({
        documentId,
      });

      if (!group) {
        return ctx.notFound('Group not found');
      }

      // Check if user is a participant
      const isParticipant = group.participants?.some((p: any) => p.id === userId);
      if (!isParticipant) {
        return ctx.unauthorized('Only participants can subscribe');
      }

      // Find or create subscription
      const existing = await strapi.documents('api::chat-subscription.chat-subscription').findMany({
        filters: {
          user: { id: { $eq: userId } },
          room: { id: { $eq: documentId } },
        },
      });

      if (existing && existing.length > 0) {
        await strapi.documents('api::chat-subscription.chat-subscription').update({
          documentId: existing[0].documentId,
          data: {
            isSubscribed: isSubscribed !== undefined ? isSubscribed : !existing[0].isSubscribed,
            lastNotifiedAt: new Date().toISOString(),
          },
        });
      } else {
        await strapi.documents('api::chat-subscription.chat-subscription').create({
          data: {
            user: userId,
            room: documentId,
            isSubscribed: isSubscribed !== undefined ? isSubscribed : true,
            lastNotifiedAt: new Date().toISOString(),
          },
        });
      }

      return { success: true };
    } catch (error: any) {
      return ctx.badRequest(error.message || 'Failed to toggle subscription');
    }
  },
});
