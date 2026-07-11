# OnlineMusic Vercel API

Self-hosted replacement for the `dev.rippzy.com` API used by `OnlineMusic.inc`.
Search YouTube and stream audio (transcoded to MP3) for use with SA-MP's
`PlayAudioStreamForPlayer`.

## Endpoints

| Route                     | Rewritten from (OnlineMusic.inc compatible) | Purpose                          |
|----------------------------|----------------------------------------------|-----------------------------------|
| `/api/search?n=<query>`    | `/api/v1/Search.php?n=<query>`               | Search YouTube, return metadata   |
| `/api/play?n=<videoId>`    | `/api/v1/Play.php?n=<videoId>`               | Stream audio as MP3               |

The rewrites in `vercel.json` mean you can point `OnlineMusic.inc` at your
Vercel domain using the **exact same path structure** the original API used
(`/api/v1/Search.php`, `/api/v1/Play.php`) — you only need to change the
domain, not the format strings in the `.inc` file.

## Deploy to Vercel

1. Push this folder to a GitHub repo (or run `vercel` CLI directly from it).
2. Import the repo on [vercel.com](https://vercel.com/new).
3. (Optional) Set an `API_KEY` environment variable in Project Settings if
   you want to require a key on every request.
4. Deploy. Vercel gives you a domain like `your-project.vercel.app`.

Locally, you can test with the Vercel CLI:

```bash
npm install
npx vercel dev
```

## Updating OnlineMusic.inc

In `OnlineMusic.inc`, change these two lines to your own domain:

```pawn
format(tempString, sizeof tempString, "your-project.vercel.app/api/v1/Search.php?n=%s", musicName);
```

```pawn
format(tempURL, sizeof tempURL, "http://your-project.vercel.app/api/v1/Play.php?n=%s", PlayOnline_Index(data, "<id>", "</id>"));
```

If you set `API_KEY`, append `&key=yourkey` to both format strings.

## Important caveats

- **Cold starts & duration limits**: Vercel functions aren't long-running
  servers. `maxDuration` is set to 60s for `/api/play` in `vercel.json`, but
  actual allowed values depend on your Vercel plan — check your dashboard.
  Long songs may risk hitting the limit; if that happens on your plan,
  consider capping the song length or moving `/api/play` to a small VPS
  instead (same code, running under plain Express) while keeping
  `/api/search` on Vercel.
- **No persistent storage**: nothing is cached between requests by default.
  Every play request re-fetches and re-transcodes from YouTube. For a busier
  server, consider adding a cache layer (e.g. Vercel Blob storage or an
  external object store) keyed by video id.
- **`@distube/ytdl-core` breaks periodically**: YouTube changes its player
  signature logic often. If search/play suddenly stops working, that
  package usually needs a version bump — this is the same class of issue
  you already ran into with `Downloader.js`'s PO Token problem.
- **YouTube ToS**: re-streaming YouTube audio through your own server sits
  in a legal gray area, same as the original `dev.rippzy.com` API. That
  risk is on the operator (you), not something this code changes.
- **Abuse protection**: the optional `API_KEY` is a basic gate, not a real
  auth system — it's sent as a plain query string, same caveat as the
  `AUTH` code in your other music streamer project. Fine for a private
  roleplay server, not something to expose as a public product without
  more work (rate limiting, per-key usage caps, etc).
