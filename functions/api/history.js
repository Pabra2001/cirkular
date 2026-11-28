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

  // Same-origin image proxy for Cleveland Museum of Art CDN so client-side canvas dithering never hits CORS
  const imgUrl = url.searchParams.get("img");
  if (imgUrl) {
    if (!/^https:\/\/openaccess-cdn\.clevelandart\.org\//i.test(imgUrl)) {
      return new Response("Invalid image URL", { status: 400 });
    }
    const upstream = await fetch(imgUrl);
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

  // Fresh 20-artwork pull of gallery-displayed Paintings & Sculptures ONLY (zero manuscripts, papers, or vases)
  try {
    const [paintRes, sculpRes] = await Promise.all([
      fetch(`https://openaccess-api.clevelandart.org/api/artworks/?has_image=1&cc0=1&currently_on_view=1&type=Painting&limit=40&skip=${Math.floor(Math.random() * 500)}`),
      fetch(`https://openaccess-api.clevelandart.org/api/artworks/?has_image=1&cc0=1&currently_on_view=1&type=Sculpture&limit=20&skip=${Math.floor(Math.random() * 250)}`)
    ]);
    const paintData = paintRes.ok ? await paintRes.json() : null;
    const sculpData = sculpRes.ok ? await sculpRes.json() : null;
    const combined = [...(paintData?.data || []), ...(sculpData?.data || [])];
    const SKIP_RE = /\b(manuscript|folio|leaf from|letter|document|vase|jar|jug|bowl|plate|cup|dish|coin|seal|fragment)\b/i;
    const valid = combined.filter((a) => a?.images?.web?.url && a?.title && !SKIP_RE.test(a.title));
    const items = shuffle(valid).slice(0, 20).map((a) => ({
      id: a.id,
      title: a.title,
      artist: a.creators?.[0]?.description || "Archive",
      date: a.creation_date || "",
      src: `/api/history?img=${encodeURIComponent(a.images.web.url)}`
    }));

    return new Response(JSON.stringify({ items }), {
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
