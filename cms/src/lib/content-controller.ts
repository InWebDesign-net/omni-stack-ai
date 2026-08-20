import { factories } from '@strapi/strapi';
import { CONTENT_KINDS, type ContentKind } from '@omni/shared';

/**
 * Builds the `filtered` + `tags` controller that article, image and video each
 * had their own copy of.
 *
 * The three were identical apart from the UID, the name of the service method
 * doing the filtering, and — accidentally — their error handling: article
 * answered a failed filter with 400 while the other two answered 500. A failed
 * query is a server-side failure, so the factory settles on 500 for all three
 * and logs through `strapi.log` instead of `console`.
 */
export function createContentController(kind: ContentKind, filteredServiceMethod: string) {
  const uid = CONTENT_KINDS[kind].uid;

  return factories.createCoreController(uid as any, ({ strapi }) => ({
    async filtered(ctx: Record<string, any>) {
      try {
        const service = strapi.service(uid) as Record<string, any>;
        const fn = service?.[filteredServiceMethod];
        if (typeof fn !== 'function') {
          throw new Error(`${uid} has no service method "${filteredServiceMethod}"`);
        }
        ctx.body = await fn.call(service, ctx.query);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error(`[${kind}.filtered] ${message}`);
        ctx.status = 500;
        ctx.body = { error: message || `Failed to fetch filtered ${CONTENT_KINDS[kind].plural}` };
      }
    },

    async tags(ctx: Record<string, any>) {
      try {
        const service = strapi.service(uid) as Record<string, any>;
        ctx.body = { data: await service.getAllTags(ctx.query) };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error(`[${kind}.tags] ${message}`);
        ctx.status = 500;
        ctx.body = { error: message || `Failed to aggregate ${kind} tags` };
      }
    },
  }));
}
