const FALLBACK_CHANNELS = [
  { id: "un-chien-andalou_1929", title: "BUÑUEL & DALÍ — UN CHIEN ANDALOU" },
  { id: "Meshes_Of_The_Afternoon_Maya_Deren", title: "MAYA DEREN — MESHES OF THE AFTERNOON" },
  { id: "BalletMecanique_1924_Man_Ray_Fernand_Leger_Dudley_Murphy_DADA_Visual_Poetry", title: "MAN RAY & LÉGER — BALLET MÉCANIQUE" },
  { id: "le-sang-dun-poete-aka-the-blood-of-a-poet_1930", title: "JEAN COCTEAU — BLOOD OF A POET" },
  { id: "ChelovekskinoapparatomManWithAMovieCamera", title: "DZIGA VERTOV — MOVIE CAMERA" },
  { id: "ArteReneClairwFrancisPicabiaErikSatieEntracte1924", title: "PICABIA & SATIE — ENTR'ACTE" },
  { id: "1016-sam-anemic-cinema-4-184-030", title: "MARCEL DUCHAMP — ANÉMIC CINÉMA" },
  { id: "Rhythmus21", title: "HANS RICHTER — RHYTHMUS 21" },
  { id: "Vampyr_201612", title: "CARL DREYER — VAMPYR" }
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
    // Prefer fast-starting web MP4s (512kb / < 80MB) — identical sharpness in dither, 5x faster startup
    const mp4s = files.filter((f) => /\.mp4$/i.test(f.name) && !/\.ia\.mp4$/i.test(f.name));
    mp4s.sort((a, b) => (Number(a.size || 9e12) - Number(b.size || 9e12)));
    const mp4 = mp4s.find((f) => Number(f.size || 0) > 400_000) || mp4s[0] || files.find((f) => /\.mp4$/i.test(f.name));
    if (!mp4) return null;
    const srt = files.find((f) => /\.(asr\.)?srt$/i.test(f.name));
    const out = {
      file: mp4.name,
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

  // 1. Tight, high-taste avant-garde & video-art discovery (strictly excluding Prelinger corporate/old-timey reels)
  if (url.searchParams.get("list") === "1") {
    try {
      const ARTIST_GROUPS = [
        '("Maya Deren" OR "Man Ray" OR "Luis Bunuel" OR "Salvador Dali" OR "Jean Cocteau" OR "Marcel Duchamp" OR "Fernand Leger")',
        '("Andy Warhol" OR "Stan Brakhage" OR "Kenneth Anger" OR "Jonas Mekas" OR "Bruce Conner" OR "Nam June Paik" OR "Oskar Fischinger")',
        '("Chris Marker" OR "Agnes Varda" OR "Jean-Luc Godard" OR "Andrei Tarkovsky" OR "Jean Vigo" OR "Dziga Vertov" OR "Carl Theodor Dreyer")',
        '("Alejandro Jodorowsky" OR "Derek Jarman" OR "Chantal Akerman" OR "Norman McLaren" OR "Len Lye" OR "Hans Richter" OR "Rene Clair")',
        '("Yayoi Kusama" OR "Marina Abramovic" OR "Basquiat" OR "Keith Haring" OR "David Lynch" OR "Shinya Tsukamoto" OR "Bill Viola")',
        '("Wong Kar-wai" OR "Akira Kurosawa" OR "Yasujiro Ozu" OR "Federico Fellini" OR "Michelangelo Antonioni" OR "Ingmar Bergman" OR "Francois Truffaut")',
        '("Louis Malle" OR "Vera Chytilova" OR "Sergei Parajanov" OR "Wim Wenders" OR "Fassbinder" OR "Pasolini" OR "Werner Herzog")',
        '("Claire Denis" OR "Harmony Korine" OR "Gregg Araki" OR "Jean-Pierre Melville" OR "Abbas Kiarostami" OR "Takashi Miike" OR "Gus Van Sant")',
        '("John Cassavetes" OR "Jim Jarmusch" OR "Hal Hartley" OR "Todd Haynes" OR "John Waters" OR "David Cronenberg" OR "Terry Gilliam")',
        '("Kenji Mizoguchi" OR "Masaki Kobayashi" OR "Hiroshi Teshigahara" OR "Seijun Suzuki" OR "Nagisa Oshima" OR "Sion Sono" OR "Kiyoshi Kurosawa")',
        '("Edward Yang" OR "Hou Hsiao-hsien" OR "Tsai Ming-liang" OR "Apichatpong Weerasethakul" OR "Park Chan-wook" OR "Bong Joon-ho" OR "Hong Sang-soo")',
        '("Robert Bresson" OR "Eric Rohmer" OR "Jacques Rivette" OR "Jacques Demy" OR "Alain Resnais" OR "Marguerite Duras" OR "Leos Carax")',
        '("Luchino Visconti" OR "Vittorio De Sica" OR "Roberto Rossellini" OR "Bernardo Bertolucci" OR "Dario Argento" OR "Mario Bava" OR "Elio Petri")',
        '("Bela Tarr" OR "Krzysztof Kieslowski" OR "Andrzej Zulawski" OR "Milos Forman" OR "Jan Svankmajer" OR "Jiri Trnka" OR "Karel Zeman")',
        '("Pedro Almodovar" OR "Victor Erice" OR "Carlos Saura" OR "Lucrecia Martel" OR "Glauber Rocha" OR "Raul Ruiz" OR "Patricio Guzman")',
        '("Satyajit Ray" OR "Ritwik Ghatak" OR "Ousmane Sembene" OR "Djibril Diop Mambety" OR "Youssef Chahine" OR "Mohsen Makhmalbaf" OR "Jafar Panahi")',
        '("Michael Snow" OR "Hollis Frampton" OR "Paul Sharits" OR "Tony Conrad" OR "Harry Smith" OR "Jordan Belson" OR "James Whitney")',
        '("Shirley Clarke" OR "Barbara Hammer" OR "Carolee Schneemann" OR "Valie Export" OR "Martha Rosler" OR "Joan Jonas" OR "Pipilotti Rist")',
        '("Vito Acconci" OR "Bruce Nauman" OR "Chris Burden" OR "John Baldessari" OR "Gordon Matta-Clark" OR "Richard Serra" OR "Robert Smithson")',
        '("Matthew Barney" OR "Douglas Gordon" OR "Steve McQueen" OR "Isaac Julien" OR "Arthur Jafa" OR "Hito Steyerl" OR "Ryan Trecartin")',
        '("Chris Cunningham" OR "Michel Gondry" OR "Spike Jonze" OR "Jonathan Glazer" OR "Gaspar Noe" OR "Nicolas Winding Refn" OR "Yorgos Lanthimos")',
        '("Alexander McQueen" OR "Rei Kawakubo" OR "Yohji Yamamoto" OR "Issey Miyake" OR "Martin Margiela" OR "Helmut Newton" OR "Wolfgang Tillmans")',
        '("Cindy Sherman" OR "Nan Goldin" OR "Robert Mapplethorpe" OR "Diane Arbus" OR "Nobuyoshi Araki" OR "Daido Moriyama" OR "Hiroshi Sugimoto")',
        '("Takashi Murakami" OR "Yoshitomo Nara" OR "Ryoji Ikeda" OR "Carsten Nicolai" OR "Olafur Eliasson" OR "James Turrell" OR "Anish Kapoor")',
        '("Ai Weiwei" OR "Tino Sehgal" OR "Christian Marclay" OR "Tacita Dean" OR "William Kentridge" OR "Shirazeh Houshiary" OR "Shirin Neshat")',
        '("Kahlil Joseph" OR "Garrett Bradley" OR "Martine Syms" OR "Sondra Perry" OR "Kara Walker" OR "Carrie Mae Weems" OR "Theaster Gates")',
        '("Aphex Twin" OR "Bjork" OR "FKA twigs" OR "Arca" OR "Oneohtrix Point Never" OR "Ryuichi Sakamoto" OR "Brian Eno")',
        '("Dieter Rams" OR "Virgil Abloh" OR "Zaha Hadid" OR "Tadao Ando" OR "Rem Koolhaas" OR "Le Corbusier" OR "Ettore Sottsass")',
        '("Guy Debord" OR "Harun Farocki" OR "Ulrike Ottinger" OR "Werner Schroeter" OR "Philippe Garrel" OR "Jean Eustache" OR "Maurice Pialat")'
      ];
      const group = ARTIST_GROUPS[Math.floor(Math.random() * ARTIST_GROUPS.length)];
      const videoArtPage = 1 + Math.floor(Math.random() * 5);
      const qArtist = encodeURIComponent(
        `mediatype:movies AND format:"MPEG4" AND ${group} AND NOT collection:prelinger AND NOT subject:("ai-generated" OR "ai art" OR "generative art" OR "porn" OR "porno" OR "hentai" OR "trailer" OR "review" OR "podcast")`
      );
      const qVideoArt = encodeURIComponent(
        `mediatype:movies AND format:"MPEG4" AND subject:"video art" AND NOT collection:prelinger AND NOT subject:("ai-generated" OR "ai art" OR "generative art" OR "porn" OR "porno" OR "hentai" OR "trailer" OR "review" OR "podcast")`
      );
      const [resArtist, resVideoArt] = await Promise.all([
        fetch(`https://archive.org/advancedsearch.php?q=${qArtist}&fl[]=identifier&fl[]=title&fl[]=subject&rows=40&sort[]=downloads+desc&output=json`),
        fetch(`https://archive.org/advancedsearch.php?q=${qVideoArt}&fl[]=identifier&fl[]=title&fl[]=subject&rows=40&page=${videoArtPage}&sort[]=downloads+desc&output=json`)
      ]);
      const dataArtist = resArtist.ok ? await resArtist.json() : null;
      const dataVideoArt = resVideoArt.ok ? await resVideoArt.json() : null;
      const BLOCK_RE = /(\bai\b|ai-generated|ai art|generative|artificial intelligence|deepfake|midjourney|sora|runway|stable diffusion|kling|bobsgame|porn|porno|hentai|onlyfans|ポルノ|エロ|trailer|podcast|reaction|review|lecture|webinar|gameplay)/i;

      const parseDocs = (docs) => (docs || [])
        .filter((d) => {
          if (!d?.identifier || !d?.title || !/^[A-Za-z0-9._-]{2,100}$/.test(d.identifier)) return false;
          const meta = `${d.title} ${Array.isArray(d.subject) ? d.subject.join(" ") : (d.subject || "")}`;
          return !BLOCK_RE.test(meta);
        })
        .map((d) => ({
          id: d.identifier,
          title: String(d.title).replace(/\s+/g, " ").trim().toUpperCase().slice(0, 38)
        }));

      // Pre-resolve and verify that every returned channel actually has a playable MP4 file
      const videoArtDocs = shuffle(parseDocs(dataVideoArt?.response?.docs)).slice(0, 8);
      const artistDocs = shuffle(parseDocs(dataArtist?.response?.docs)).slice(0, 8);
      const candidates = shuffle([...videoArtDocs, ...artistDocs]);
      const resolvedPool = await Promise.all(
        candidates.slice(0, 14).map(async (item) => {
          const info = await resolveMp4Url(item.id);
          return info ? { ...item, file: info.file } : null;
        })
      );

      const seenIds = new Set();
      const seenTitles = new Set();
      const unique = [];
      const addUnique = (item) => {
        if (!item) return false;
        const tKey = item.title.replace(/[^A-Z0-9]/g, "").slice(0, 20);
        if (seenIds.has(item.id) || (tKey && seenTitles.has(tKey))) return false;
        seenIds.add(item.id);
        if (tKey) seenTitles.add(tKey);
        unique.push(item);
        return true;
      };

      for (const item of resolvedPool) {
        if (unique.length >= 12) break;
        addUnique(item);
      }
      for (const item of shuffle(FALLBACK_CHANNELS)) {
        if (unique.length >= 12) break;
        addUnique(item);
      }
      const combined = shuffle(unique).slice(0, 12);

      const channels = combined.map((c, idx) => {
        const num = String(idx + 1).padStart(2, "0");
        const fileParam = c.file ? `&file=${encodeURIComponent(c.file)}` : "";
        return {
          id: num,
          identifier: c.id,
          label: `CH.${num} / ${c.title}`,
          src: `/api/tv?id=${encodeURIComponent(c.id)}${fileParam}`
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

  // 2. Stream any resolved Internet Archive identifier (skip metadata round-trip when file param is provided)
  const id = url.searchParams.get("id") || FALLBACK_CHANNELS[0].id;
  const directFile = url.searchParams.get("file");
  let resolved = null;
  if (directFile && !url.searchParams.get("subs") && /^[A-Za-z0-9._-]{2,120}$/.test(id)) {
    resolved = {
      mp4: `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(directFile)}`,
      srt: ""
    };
  } else {
    resolved = await resolveMp4Url(id);
  }
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
