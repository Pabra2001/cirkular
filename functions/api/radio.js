const CHANNELS = {
  drone: {
    id: "drone",
    index: "01",
    name: "DRONE",
    subtitle: "Ambient · Drone · Deep Space",
    city: "BERLIN",
    freq: "88.1 MHz",
    streams: [
      "https://ice1.somafm.com/dronezone-128-mp3",
      "https://ice2.somafm.com/dronezone-128-mp3",
      "https://ice4.somafm.com/dronezone-128-mp3",
    ],
  },
  dub: {
    id: "dub",
    index: "02",
    name: "DUB/CLUB",
    subtitle: "Sub-Bass · IDM · Underground Club",
    city: "LONDON",
    freq: "94.6 MHz",
    streams: [
      "https://stream-relay-geo.ntslive.net/stream",
      "https://stream-relay-geo.ntslive.net/stream2",
      "https://ice1.somafm.com/cliqhop-128-mp3",
      "https://ice2.somafm.com/cliqhop-128-mp3",
      "https://ice1.somafm.com/dubstep-128-mp3",
    ],
  },
  punk: {
    id: "punk",
    index: "03",
    name: "POST-PUNK",
    subtitle: "Leftfield · Underground · Guitar",
    city: "NYC",
    freq: "101.3 MHz",
    streams: [
      "https://ice1.somafm.com/bagel-128-mp3",
      "https://ice2.somafm.com/bagel-128-mp3",
      "https://ice1.somafm.com/indiepop-128-mp3",
    ],
  },
  jazz: {
    id: "jazz",
    index: "04",
    name: "NIGHT JAZZ",
    subtitle: "Nu-Jazz · Avant · Late-Night",
    city: "TOKYO",
    freq: "106.7 MHz",
    streams: [
      "https://ice1.somafm.com/sonicuniverse-128-mp3",
      "https://ice2.somafm.com/sonicuniverse-128-mp3",
      "https://ice4.somafm.com/sonicuniverse-128-mp3",
    ],
  },
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);

  if (url.searchParams.get("meta") === "1") {
    const list = Object.values(CHANNELS).map(({ streams, ...rest }) => rest);
    return new Response(JSON.stringify({ channels: list }), {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const chKey = (url.searchParams.get("ch") || "drone").toLowerCase();
  const channel = CHANNELS[chKey] || CHANNELS.drone;

  for (const streamUrl of channel.streams) {
    try {
      const upstream = await fetch(streamUrl, {
        headers: {
          "User-Agent": "CIRKULAR-RADIO/1.0",
          Accept: "audio/mpeg, audio/*;q=0.9, */*;q=0.8",
        },
        redirect: "follow",
      });

      if (upstream.ok && upstream.body) {
        const contentType = upstream.headers.get("content-type") || "audio/mpeg";
        return new Response(upstream.body, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": contentType,
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Cirkular-Channel": channel.id,
          },
        });
      }
    } catch {
      // Try next fallback stream
    }
  }

  return new Response(JSON.stringify({ error: "Stream temporarily unavailable" }), {
    status: 502,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
