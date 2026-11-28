const THEMES = [
  "surrealism",
  "sculpture",
  "japanese woodblock",
  "modernist photography",
  "textile",
  "bauhaus",
  "abstract",
  "portrait",
  "architecture",
  "etching",
  "avant-garde",
  "ceramics"
];

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

  // Same-origin IIIF image proxy so client-side canvas dithering never hits CORS errors
  const imgId = url.searchParams.get("img");
  if (imgId) {
    if (!/^[a-f0-9-]{8,64}$/i.test(imgId)) {
      return new Response("Invalid image id", { status: 400 });
    }
    const iiif = `https://www.artic.edu/iiif/2/${imgId}/full/843,/0/default.jpg`;
    const upstream = await fetch(iiif, {
      headers: { "User-Agent": "CIRKULAR-Archive/1.0 (https://cirkular.pages.dev)" }
    });
    if (!upstream.ok) return new Response("Image unavailable", { status: upstream.status });
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") || "image/jpeg",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=86400"
      }
    });
  }

  // Fresh museum artwork discovery from Art Institute of Chicago Open Access API (100k+ public domain works)
  try {
    const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    const page = 1 + Math.floor(Math.random() * 10);
    const apiUrl = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(theme)}&query[term][is_public_domain]=true&fields=id,title,artist_title,date_display,image_id&limit=28&page=${page}`;
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "CIRKULAR-Archive/1.0 (https://cirkular.pages.dev)" }
    });
    if (!res.ok) throw new Error("ARTIC unavailable");
    const data = await res.json();
    const valid = (data?.data || []).filter((a) => a?.image_id && a?.title);
    const items = shuffle(valid).slice(0, 12).map((a) => ({
      id: a.id,
      title: a.title,
      artist: a.artist_title || "Archive",
      date: a.date_display || "",
      src: `/api/history?img=${encodeURIComponent(a.image_id)}`
    }));

    return new Response(JSON.stringify({ theme, items }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "no-store"
      }
    });
  } catch {
    return new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" }
    });
  }
}
