import { SlashCommandBuilder, MessageFlags, ChannelType, EmbedBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Send embeds or messages to a channel")
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Target channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addStringOption(option =>
      option.setName('content')
        .setDescription('Use "/" to split messages. Embed format: title;desc|field;value')
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
          // Try JSON first
          const json = JSON.parse(trimmed);
          const embed = new EmbedBuilder(json);
          await channel.send({ embeds: [embed] });
          continue;
        } catch {
          // Not JSON → try custom embed format
        }

        // Custom embed format
        if (trimmed.includes(';')) {
          const sections = trimmed.split('|');

          const [mainTitle, mainDesc] = sections[0].split(';');

          const embed = new EmbedBuilder()
            .setTitle(mainTitle || 'No title')
            .setDescription(mainDesc || 'No description')
            .setColor(0x00AE86);

          // Add fields
          for (let i = 1; i < sections.length; i++) {
            const [name, value] = sections[i].split(';');
            if (name && value) {
              embed.addFields({ name, value });
            }
          }

          await channel.send({ embeds: [embed] });
        } else {
          // Plain text fallback
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
      logger.error('Embed command error:', error);

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
