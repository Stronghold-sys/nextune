const play = require('play-dl');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { videoId } = req.query;
  try {
    const stream = await play.stream('https://www.youtube.com/watch?v=' + videoId);
    res.json({ streamUrl: stream.url });
  } catch (error) {
    console.error('Stream extraction error:', error);
    res.status(500).json({ error: 'Failed to extract stream: ' + error.message });
  }
};
