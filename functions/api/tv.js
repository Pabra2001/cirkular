const FALLBACK_CHANNELS = [
  { id: "un-chien-andalou_1929", title: "BUÑUEL & DALÍ — UN CHIEN ANDALOU" },
  { id: "Meshes_Of_The_Afternoon_Maya_Deren", title: "MAYA DEREN — MESHES OF THE AFTERNOON" },
  { id: "BalletMecanique_1924_Man_Ray_Fernand_Leger_Dudley_Murphy_DADA_Visual_Poetry", title: "MAN RAY & LÉGER — BALLET MÉCANIQUE" },
  { id: "le-sang-dun-poete-aka-the-blood-of-a-poet_1930", title: "JEAN COCTEAU — BLOOD OF A POET" },
  { id: "ChelovekskinoapparatomManWithAMovieCamera", title: "DZIGA VERTOV — MOVIE CAMERA" },
  { id: "ArteReneClairwFrancisPicabiaErikSatieEntracte1924", title: "PICABIA & SATIE — ENTR'ACTE" },
  { id: "1016-sam-anemic-cinema-4-184-030", title: "MARCEL DUCHAMP — ANÉMIC CINÉMA" },
  { id: "Rhythmus21", title: "HANS RICHTER — RHYTHMUS 21" },
  { id: "Vampyr_201612", title: "CARL DREYER — VAMPYR" },
  { id: "American1958", title: "INDUSTRIAL DESIGN — 1958" },
  { id: "ThirdAve1950", title: "NYC 16MM — THIRD AVE EL" },
  { id: "Greenwic1960", title: "GREENWICH VILLAGE — 1960" }
];

const MP4_CACHE = new Map();

async function resolveMp4Url(identifier) {
  if (!/^[A-Za-z0-9._-]{2,120}$/.test(identifier)) return null;
  if (MP4_CACHE.has(identifier)) return MP4_CACHE.get(identifier);
  try {
    const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}/files`);
    if (!res.ok) return null;
    const data = await res.json();
    const files = data?.result || [];
    const mp4 =
      files.find((f) => /\.mp4$/i.test(f.name) && !/\.ia\.mp4$/i.test(f.name) && Number(f.size || 0) < 220_000_000) ||
      files.find((f) => /\.mp4$/i.test(f.name));
    if (!mp4) return null;
    const srt = files.find((f) => /\.(asr\.)?srt$/i.test(f.name));
    const out = {
      mp4: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(mp4.name)}`,
      srt: srt ? `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(srt.name)}` : ""
    };
    if (MP4_CACHE.size > 200) MP4_CACHE.clear();
    MP4_CACHE.set(identifier, out);
    return out;
  } catch {
    return null;
  }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);

  // 1. Dynamic fresh 12-channel avant-garde / experimental art cinema discovery on every visit
  if (url.searchParams.get("list") === "1") {
    try {
      const page = 1 + Math.floor(Math.random() * 14);
      const q = encodeURIComponent(
        'mediatype:movies AND format:"MPEG4" AND (subject:"experimental" OR subject:"avant-garde" OR subject:"surrealism" OR subject:"video art" OR subject:"dada" OR subject:"art film") AND NOT subject:("ai-generated" OR "ai art" OR "generative art" OR "artificial intelligence" OR "deepfake" OR "midjourney" OR "sora" OR "stable diffusion" OR "porn" OR "porno" OR "hentai")'
      );
      const searchUrl = `https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&fl[]=subject&rows=40&page=${page}&output=json`;
      const res = await fetch(searchUrl);
      const data = res.ok ? await res.json() : null;
      const BLOCK_RE = /(\bai\b|ai-generated|ai art|generative|artificial intelligence|deepfake|midjourney|sora|runway|stable diffusion|kling|bobsgame|porn|porno|hentai|onlyfans|ポルノ|エロ)/i;
      const docs = (data?.response?.docs || [])
        .filter((d) => {
          if (!d?.identifier || !d?.title || !/^[A-Za-z0-9._-]{2,100}$/.test(d.identifier)) return false;
          const meta = `${d.title} ${Array.isArray(d.subject) ? d.subject.join(" ") : (d.subject || "")}`;
          return !BLOCK_RE.test(meta);
        })
        .map((d) => ({
          id: d.identifier,
          title: String(d.title).replace(/\s+/g, " ").trim().toUpperCase().slice(0, 38)
        }));

      // Blend 9 fresh random discoveries + 3 shuffled iconic anchors so every visit is genuinely new
      const fresh = shuffle(docs).slice(0, 9);
      const anchors = shuffle(FALLBACK_CHANNELS).slice(0, Math.max(3, 12 - fresh.length));
      const combined = shuffle([...fresh, ...anchors]).slice(0, 12);

      const channels = combined.map((c, idx) => {
        const num = String(idx + 1).padStart(2, "0");
        return {
          id: num,
          identifier: c.id,
          label: `CH.${num} / ${c.title}`,
          src: `/api/tv?id=${encodeURIComponent(c.id)}`
        };
      });

      return new Response(JSON.stringify({ channels }), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "access-control-allow-origin": "*",
          "cache-control": "no-store"
        }
      });
    } catch {
      const channels = shuffle(FALLBACK_CHANNELS).map((c, idx) => {
        const num = String(idx + 1).padStart(2, "0");
        return { id: c.id, num, label: `CH.${num} / ${c.title}`, src: `/api/tv?id=${encodeURIComponent(c.id)}` };
      });
      return new Response(JSON.stringify({ channels }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" }
      });
    }
  }

  // 2. Stream any resolved Internet Archive identifier (video or subtitles)
  const id = url.searchParams.get("id") || FALLBACK_CHANNELS[0].id;
  const resolved = await resolveMp4Url(id);
  if (!resolved) {
    return new Response("Stream unavailable", { status: 404 });
  }

  if (url.searchParams.get("subs") === "1") {
    if (!resolved.srt) {
      return new Response("", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8", "access-control-allow-origin": "*" }
      });
    }
    const subRes = await fetch(resolved.srt, { redirect: "follow" });
    return new Response(subRes.ok ? await subRes.text() : "", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=86400"
      }
    });
  }

  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  const upstream = await fetch(resolved.mp4, { headers, redirect: "follow" });
  const outHeaders = new Headers();
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const val = upstream.headers.get(h);
    if (val) outHeaders.set(h, val);
  }
  outHeaders.set("access-control-allow-origin", "*");
  outHeaders.set("cache-control", "public, max-age=3600");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: outHeaders
  });
}
