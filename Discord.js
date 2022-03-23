require("dotenv").config();
import { Webhook, MessageBuilder } from "discord-webhook-node";

export default class Discord {
  constructor() {
    this.hook = new Webhook(process.env.DISCORD_WEBHOOK);
  }

  async sendEmbed(title, description) {
    const embed = new MessageBuilder().setTitle(title).setDescription(description).setTimestamp();

    await this.hook.send(embed);
  }

  async info(message) {
    await this.hook.info(message);
  }

  async error(message) {
    await this.hook.error(message);
  }

  async success(message) {
    await this.hook.success(message);
  }

  async send(message) {
    await this.hook.send(message);
  }
}
