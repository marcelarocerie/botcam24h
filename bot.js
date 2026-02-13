require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const token = process.env.BOT_TOKEN;
const cameraOnChannels = process.env.CAMERA_ON_CHANNELS.split(',');
const warningTimeout = parseInt(process.env.WARNING_TIMEOUT);
const warnedUsers = new Map();

client.on('ready', () => {
  console.log(`🤖 BOTCAM 24h está online como ${client.user.tag}`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  if (!newState.channelId) return;
  if (!cameraOnChannels.includes(newState.channelId)) return;

  const member = newState.member;
  const channel = newState.channel;

  if (!member || !channel) return;

  // Entrou no canal monitorado com câmera desligada
  if (newState.channelId !== oldState.channelId && !newState.selfVideo) {
    handleCameraOff(member, channel);
  }

  // Desligou a câmera dentro do canal
  else if (
    newState.channelId === oldState.channelId &&
    !newState.selfVideo &&
    !warnedUsers.has(member.id)
  ) {
    handleCameraOff(member, channel);
  }

  // Ligou a câmera
  else if (newState.selfVideo && warnedUsers.has(member.id)) {
    clearWarning(member.id);
  }
});

async function handleCameraOff(member, channel) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("📷 Atenção!")
      .setDescription(
        `Você entrou no canal **${channel.name}** com a câmera desligada.\n\n` +
        `Por favor, ative sua câmera nos próximos **${warningTimeout / 1000} segundos**.\n` +
        `Caso contrário, você será removido(a) automaticamente do canal. 🚨`
      )
      .setFooter({ text: "BOTCAM 24h • Monitoramento de Câmera" })
      .setTimestamp();

    const warningMessage = await member.send({ embeds: [embed] });

    const timeoutId = setTimeout(async () => {
      if (!member.voice.selfVideo) {
        await member.voice.disconnect();

        const removeEmbed = new EmbedBuilder()
          .setColor(0x8b0000)
          .setTitle("❌ Remoção automática")
          .setDescription(
            `Você foi removido(a) do canal **${channel.name}** por não ativar a câmera a tempo.\n\n` +
            `Entre novamente e ligue sua câmera para participar. 🙏`
          )
          .setFooter({ text: "BOTCAM 24h • Regras da Comunidade" })
          .setTimestamp();

        await member.send({ embeds: [removeEmbed] });
      }
    }, warningTimeout);

    warnedUsers.set(member.id, { timeoutId, warningMessage });

  } catch (error) {
    console.error('Erro ao lidar com câmera desligada:', error);
  }
}

async function clearWarning(memberId) {
  const userInfo = warnedUsers.get(memberId);
  if (userInfo) {
    clearTimeout(userInfo.timeoutId);
    warnedUsers.delete(memberId);

    try {
      const successEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("✨ Perfeito!")
        .setDescription("Obrigada por ativar sua câmera! 😊👍")
        .setFooter({ text: "BOTCAM 24h • Tudo certo agora!" })
        .setTimestamp();

      await userInfo.warningMessage.edit({ embeds: [successEmbed] });
    } catch (error) {
      console.error('Erro ao editar mensagem de aviso:', error);
    }
  }
}

client.login(token);
