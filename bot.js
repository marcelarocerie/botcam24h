require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();

const token = process.env.BOT_TOKEN;
const cameraOnChannels = process.env.CAMERA_ON_CHANNELS.split(',');
const warningTimeout = parseInt(process.env.WARNING_TIMEOUT);
const warnedUsers = new Map();

client.on('ready', () => {
  console.log(`Logged in as $\{client.user.tag}!`);
});

client.on('error', (error) => {
  console.error('The bot encountered an error:', error);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  console.log(`Voice state update detected for user $\{newState.member.user.tag}. Old Channel: $\{oldState.channelID}, New Channel: $\{newState.channelID}, Camera On: $\{newState.selfVideo}`);

  if (!cameraOnChannels.includes(newState.channelID)) return;

  const member = newState.member;
  const channel = newState.channel;

  if (newState.channelID !== oldState.channelID && !newState.selfVideo) {
    // User joined the voice channel with camera disabled
    console.log(`User $\{member.user.tag} joined the monitored channel "$\{channel.name}" without camera enabled.`);
    handleCameraOff(member, channel);
  } else if (newState.channelID === oldState.channelID && !newState.selfVideo && !warnedUsers.has(member.id)) {
    // User disabled their camera while in the voice channel
    console.log(`User $\{member.user.tag} disabled their camera in the monitored channel "$\{channel.name}".`);
    handleCameraOff(member, channel);
  } else if (newState.selfVideo && warnedUsers.has(member.id)) {
    // User enabled their camera
    console.log(`User $\{member.user.tag} enabled their camera in the monitored channel "$\{channel.name}".`);
    clearWarning(member.id);
  }
});

async function handleCameraOff(member, channel) {
  try {
    const warningMessage = await member.send(`📷 Attention! Please enable your camera in the channel "**$\{channel.name}**" within the next $\{warningTimeout / 1000} seconds, or you will be removed from the channel. 🚨`);
    console.log(`Sent warning message to user $\{member.user.tag}.`);

    const timeoutId = setTimeout(async () => {
      if (!member.voice.selfVideo) {
        await member.voice.setChannel(null);
        await member.send(`❌ You have been removed from the channel "**$\{channel.name}**" due to not enabling your camera. Please rejoin the channel and enable your camera to participate. 🙏`);
        console.log(`User $\{member.user.tag} was removed from the channel "$\{channel.name}" for not enabling their camera.`);
      }
    }, warningTimeout);

    warnedUsers.set(member.id, { timeoutId, warningMessage });
    console.log(`Set timeout for user $\{member.user.tag}.`);
  } catch (error) {
    console.error('Error handling camera off:', error);
  }
}

async function clearWarning(memberId) {
  const userInfo = warnedUsers.get(memberId);
  if (userInfo) {
    clearTimeout(userInfo.timeoutId);
    warnedUsers.delete(memberId);
    console.log(`Cleared warning for user with ID $\{memberId}.`);

    try {
      await userInfo.warningMessage.edit(`✨ Thank you for enabling your camera! Your cooperation is appreciated. 😊👍`);
      console.log(`Edited warning message for user with ID $\{memberId}.`);
    } catch (editError) {
      console.error(`Failed to edit warning message for user with ID $\{memberId}:`, editError);
    }
  }
}

// Log in to Discord
client.login(token);
