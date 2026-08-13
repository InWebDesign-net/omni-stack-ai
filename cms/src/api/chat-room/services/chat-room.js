'use strict';

/**
 * chat-room service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::chat-room.chat-room');
