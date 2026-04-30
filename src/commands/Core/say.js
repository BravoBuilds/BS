import { SlashCommandBuilder, MessageFlags, ChannelType, EmbedBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Send messages or embeds to a channel")
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Target channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addStringOption(option =>
      option.setName('content')
        .setDescription('Use "/" to split messages or embeds (JSON)')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await InteractionHelper.safeDefer(interaction);

      const channel = interaction.options.getChannel('channel');
      const content = interaction.options.getString('content');

      const parts = content.split('/');

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        try {
          // Try embed (JSON)
          const json = JSON.parse(trimmed);
          const embed = new EmbedBuilder(json);

          await channel.send({ embeds: [embed] });

        } catch {
          // Fallback to plain message
          await channel.send({ content: trimmed });
        }
      }

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [createEmbed({
          title: "✅ Message Sent",
          description: `Sent ${parts.length} item(s) to ${channel}`
        })],
      });

    } catch (error) {
      logger.error('Say command error:', error);

      try {
        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [createEmbed({
            title: 'System Error',
            description: 'Failed to send message(s).',
            color: 'error'
          })],
          flags: MessageFlags.Ephemeral,
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
