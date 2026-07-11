/**
 * /api/search  (aliased from /api/v1/Search.php via vercel.json rewrite)
 *
 * Query params:
 *   n     - search query (song name), required
 *   key   - optional API key, only checked if API_KEY env var is set
 *
 * Response: plain-text with XML-style tags, matching what OnlineMusic.inc
 * expects to parse with PlayOnline_Index() / sscanf().
 */

const ytsr = require("youtube-sr");
const YouTube = ytsr.default || ytsr;

module.exports = async (req, res) => {
  try {
    // Optional simple API key check (set API_KEY in Vercel project env vars to enable)
    if (process.env.API_KEY) {
      const key = req.query.key;
      if (key !== process.env.API_KEY) {
        return res.status(401).send("Unauthorized");
      }
    }

    const query = req.query.n;
    if (!query || !String(query).trim()) {
      return res.status(400).send("Missing query parameter \"n\"");
    }

    const result = await YouTube.searchOne(String(query), "video");
    if (!result) {
      return res.status(404).send("No results found");
    }

    const title = sanitize(result.title);
    const channelName = sanitize(result.channel && result.channel.name);
    const durationSeconds = Math.floor((result.duration || 0) / 1000);
    const durationLabel = formatDuration(durationSeconds);
    const views = result.views || 0;
    const uploadedAt = sanitize(result.uploadedAt || "");
    const verified = result.channel && result.channel.verified ? 1 : 0;
    const id = result.id;

    if (!id) {
      return res.status(404).send("No playable result found");
    }

    const body =
      `<title>${title}</title>` +
      `<duration>${durationLabel}</duration>` +
      `<durationseconds>${durationSeconds}</durationseconds>` +
      `<channelName>${channelName}</channelName>` +
      `<uploadedAt>${uploadedAt}</uploadedAt>` +
      `<views>${views}</views>` +
      `<verified>${verified}</verified>` +
      `<id>${id}</id>`;

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(body);
  } catch (err) {
    console.error("[search] error:", err);
    return res.status(500).send("Internal error while searching");
  }
};

// Strip characters that would break the "<tag>...</tag>" parsing on the PAWN side
function sanitize(str) {
  if (!str) return "";
  return String(str).replace(/[<>]/g, "").slice(0, 200);
}

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
