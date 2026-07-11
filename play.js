/**
 * /api/play  (aliased from /api/v1/Play.php via vercel.json rewrite)
 *
 * Query params:
 *   n     - YouTube video id, required
 *   key   - optional API key, only checked if API_KEY env var is set
 *
 * Streams the video's audio track, transcoded to MP3, so it's playable
 * through SA-MP's PlayAudioStreamForPlayer (BASS library expects mp3/ogg/wav,
 * not the webm/opus or m4a/aac that YouTube serves natively).
 */

const ytdl = require("@distube/ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = async (req, res) => {
  try {
    if (process.env.API_KEY) {
      const key = req.query.key;
      if (key !== process.env.API_KEY) {
        return res.status(401).send("Unauthorized");
      }
    }

    const id = req.query.n;
    if (!id || !String(id).trim()) {
      return res.status(400).send("Missing video id parameter \"n\"");
    }

    const videoURL = `https://www.youtube.com/watch?v=${id}`;
    if (!ytdl.validateURL(videoURL)) {
      return res.status(400).send("Invalid video id");
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");

    const audioStream = ytdl(videoURL, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 25,
    });

    let responded = false;

    audioStream.on("error", (err) => {
      console.error("[play] ytdl error:", err);
      if (!responded) {
        responded = true;
        res.status(500).end("Failed to fetch audio source");
      }
    });

    ffmpeg(audioStream)
      .audioBitrate(128)
      .format("mp3")
      .on("error", (err) => {
        console.error("[play] ffmpeg error:", err);
        if (!responded) {
          responded = true;
          if (!res.headersSent) res.status(500).end("Transcoding error");
          else res.end();
        }
      })
      .on("start", () => {
        responded = true;
      })
      .pipe(res, { end: true });
  } catch (err) {
    console.error("[play] error:", err);
    if (!res.headersSent) return res.status(500).send("Internal error");
    return res.end();
  }
};
