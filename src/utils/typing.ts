import { MyContext } from '../types/context';
import { Logger } from './logger';

const logger = new Logger('TypingIndicator');

export class TypingIndicator {
  private active: boolean = false;
  private interval?: NodeJS.Timeout;
  private ctx: MyContext;
  private placeholderMessageId?: number;

  constructor(ctx: MyContext) {
    this.ctx = ctx;
  }

  async start() {
    if (this.active) return;

    this.active = true;

    // Send placeholder that removes the reply keyboard
    try {
      const msg = await this.ctx.reply('⏳', {
        reply_markup: { remove_keyboard: true }
      });
      this.placeholderMessageId = msg.message_id;
    } catch (error) {
      logger.error('Failed to send placeholder message', error);
    }

    // Send initial typing action and repeat every 4 seconds
    this.sendTyping();
    this.interval = setInterval(() => this.sendTyping(), 4000);
  }

  private sendTyping() {
    if (!this.active) return;

    this.ctx.replyWithChatAction('typing').catch((error) => {
      logger.error('Failed to send typing action', error);
      this.stop();
    });
  }

  async stop() {
    if (!this.active) return;

    this.active = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    if (this.placeholderMessageId && this.ctx.chat?.id) {
      try {
        await this.ctx.telegram.deleteMessage(this.ctx.chat.id, this.placeholderMessageId);
      } catch (error) {
        logger.error('Failed to delete placeholder message', error);
      }
      this.placeholderMessageId = undefined;
    }
  }
}
