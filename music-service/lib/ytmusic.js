const YTMusic = require('ytmusic-api');

const ytmusic = new YTMusic();
let initialized = false;

async function getClient() {
  if (!initialized) {
    await ytmusic.initialize();
    initialized = true;
  }
  return ytmusic;
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

module.exports = { getClient, formatDuration };
