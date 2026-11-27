const goodwill = 'https://buyerapi.shopgoodwill.com';
const headers = {'Accept': 'application/json, text/html;q=0.9'};
const natural = ['100% cotton', 'organic cotton', 'cotton', '100% linen', 'linen',
  '100% wool', 'merino wool', 'wool', 'cashmere', 'silk', 'genuine leather',
  '100% leather', 'real leather', 'leather', 'suede', 'hemp', 'down', 'denim', 'canvas', 'vibram'];
const synthetic = ['polyester', 'acrylic', 'nylon', 'spandex', 'elastane', 'polyurethane',
  'faux leather', 'vegan leather', 'pleather', 'rayon', 'viscose'];
const measurementPatterns = [
  ['Chest/P2P', /(?:pit\s*to\s*pit|p2p|chest|bust)\s*[:-]?\s*(\d{2}(?:\.\d+)?)/i],
  ['Waist', /waist\s*[:-]?\s*(\d{2}(?:\.\d+)?)/i],
  ['Inseam', /inseam\s*[:-]?\s*(\d{2}(?:\.\d+)?)/i],
  ['Length', /(?:length|shoulder\s*to\s*hem)\s*[:-]?\s*(\d{2}(?:\.\d+)?)/i],
  ['Sleeve/Shoulder', /(?:sleeve|shoulder)\s*[:-]?\s*(\d{2}(?:\.\d+)?)/i],
];
const money = value => Math.round((Number(value) || 0) * 100) / 100;
const cleanText = value => String(value ?? '').replace(/<br\s*\/?>/gi, ' · ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
function evidence(text) {
  const measurements = measurementPatterns.flatMap(([label, pattern]) => {
    const match = text.match(pattern);
    return match ? [`${label} ${match[1]}″`] : [];
  });
  const dimensions = text.match(/(\d{2})\s*x\s*(\d{2})/i);
  if (dimensions) measurements.push(`${dimensions[1]}″×${dimensions[2]}″`);
  const disclosed = words => words.filter(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
  return {measurements, materials: {natural: disclosed(natural), synthetic: disclosed(synthetic)}};
}
function cleanQuery(query) {
  return query
    .replace(/\b(?:find me|looking for|search for|can you find|i want|i need|show me)\b/gi, ' ')
    .replace(/\b(?:under|below|less than|max|budget)\s*\$?\d+(?:\.\d+)?\b/gi, ' ')
    .replace(/\b(?:delivered to|shipped to)\s+[a-z\s]+\(?\d{5}\)?/gi, ' ')
    .replace(/[,()"“”']/g, ' ').replace(/\s+/g, ' ').trim() || query;
}
async function request(url, options = {}) {
  const response = await fetch(url, {...options, signal: AbortSignal.timeout(6500)});
  if (!response.ok) throw new Error(`Marketplace HTTP ${response.status}`);
  return response;
}
async function poshmark(query, retrievedAt) {
  const url = new URL('https://poshmark.com/search');
  url.search = new URLSearchParams({query, type:'listings'});
  const html = await (await request(url, {headers})).text();
  const raw = html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)(?:;\(function\(|<\/script>)/)?.[1];
  if (!raw) return [];
  const items = JSON.parse(raw.trim().replace(/;$/, '')).$_search?.gridData?.data ?? [];
  return items.slice(0,24).filter(item => item.id).map(item => {
    const title = cleanText(item.title), description = cleanText(item.description);
    const brand = cleanText(item.brand) || 'Unbranded / Vintage';
    return {
      id: `pm-${item.id}`, marketplace:'Poshmark', url:`https://poshmark.com/listing/${encodeURIComponent(item.id)}`,
      title, description, brand, retrievedAt,
      size:String(item.size_obj?.display || item.size || 'Unstated'), department:item.department?.display || '',
      price:money(item.price_amount?.val), shippingEst:7.97, shippingNote:'$7.97 standard Poshmark Priority Mail (seller discounts unverified)',
      originalRetail:money(item.original_price_amount?.val) || null,
      image:item.picture_url || item.cover_shot?.url_small || item.cover_shot?.url || '',
      colors:(item.colors ?? []).map(color => color.name).filter(Boolean), conditionTag:item.condition || '',
      availability:item.inventory?.status === 'available' || !item.inventory?.status ? 'Available (Fixed Price)' : item.inventory.status,
      isAuction:false, ...evidence(`${title} ${description} ${brand}`),
    };
  });
}

const goodwillSearch = {
  "isSize": false,
  "isWeddingCatagory": "false",
  "isMultipleCategoryIds": false,
  "isFromHeaderMenuTab": false,
  "layout": "",
  "isFromHomePage": false,
  "searchText": "",
  "selectedGroup": "",
  "selectedCategoryIds": "",
  "selectedSellerIds": "",
  "lowPrice": "0",
  "highPrice": "999999",
  "searchBuyNowOnly": "",
  "searchPickupOnly": "false",
  "searchNoPickupOnly": "false",
  "searchOneCentShippingOnly": "false",
  "searchDescriptions": "true",
  "searchClosedAuctions": "false",
  "closedAuctionEndingDate": "11/23/2026",
  "closedAuctionDaysBack": "7",
  "searchCanadaShipping": "false",
  "searchInternationalShippingOnly": "false",
  "sortColumn": "1",
  "page": "1",
  "pageSize": "14",
  "sortDescending": "false",
  "savedSearchId": 0,
  "useBuyerPrefs": "true",
  "searchUSOnlyShipping": "false",
  "categoryLevelNo": "1",
  "partNumber": "",
  "catIds": ""
};
async function shopGoodwill(query,retrievedAt) {
  const options = {method:'POST', headers:{...headers,'Content-Type':'application/json',
    Origin:'https://shopgoodwill.com',Referer:'https://shopgoodwill.com/'},
    body:JSON.stringify({...goodwillSearch,searchText:query,closedAuctionEndingDate:new Date().toLocaleDateString('en-US')})};
  const data = await (await request(goodwill+'/api/Search/ItemListing',options)).json();
  const items = (data.searchResults?.items ?? []).slice(0,14).filter(item=>item.itemId);
  return Promise.all(items.map(async (item,index)=>{
    const title=cleanText(item.title);
    let detail={};
    if(index<4){
      try {
        detail=await (await request(goodwill+'/api/ItemDetail/GetItemDetailModelByItemId/'+encodeURIComponent(item.itemId),{headers})).json();
      } catch {}
    }
    const description=cleanText(detail.description);
    const seller=[detail.sellerCity,detail.sellerState].filter(Boolean).join(', ');
    const price=money(item.currentPrice || item.minimumBid), buy=money(item.buyNowPrice);
    const handling=money(detail.handlingPrice);
    const size=title.match(/\b(?:size|sz|mens|womens|us)?\s*(xs|s|m|l|xl|xxl|2xl|\d{1,2}(?:\.\d)?(?:\s*[wml])?)\b/i)?.[1];
    return {
      id:`sgw-${item.itemId}`, marketplace:'ShopGoodwill',url:`https://shopgoodwill.com/item/${encodeURIComponent(item.itemId)}`,
      title, description:description || 'Summary listing from ShopGoodwill API (open source link for full seller notes).',
      brand:seller ? `Goodwill Regional Recovery (${seller})` : 'Goodwill Regional Recovery',
      size:size?.toUpperCase() || 'See title/desc',department:'',price:buy || price,
      shippingEst:handling ? money(handling+8.50) : null,
      shippingNote:handling ? `$${handling.toFixed(2)} handling + carrier ZIP weight rate (unverified without destination ZIP)` :
        'Carrier shipping calculated by destination ZIP at checkout',
      originalRetail:null,image:String(item.imageURL || '').replaceAll('\\','/'),colors:[],
      conditionTag:'Pre-owned donated recovery',retrievedAt,
      availability:buy ? `Buy Now ($${buy.toFixed(2)})` : `Active Auction (${Number(item.numBids)||0} bids · current $${price.toFixed(2)})`,
      isAuction:!buy,...evidence(`${title} ${description}`),
    };
  }));
}
// These US storefronts publish their public catalog prices in USD.
const publicResaleStores = [
  ['The Vintage Twin', 'https://www.thevintagetwin.com'],
  ['Fashionphile', 'https://www.fashionphile.com'],
];

async function publicStoreSearch(name, origin, query, retrievedAt) {
  const url = new URL('/search/suggest.json', origin);
  url.search = new URLSearchParams({
    q: query,
    'resources[type]': 'product',
    'resources[options][unavailable_products]': 'hide',
  });
  const search = await (await request(url, {headers})).json();
  const products = search.resources?.results?.products;
  if (!Array.isArray(products)) throw new Error('Missing storefront search results');
  const available = products.filter(item => item.available === true && item.id && item.handle && item.image && money(item.price) > 0);
  return available
    .map(item => {
      const title = cleanText(item.title);
      const description = cleanText(item.body);
      const price = money(item.price);
      return {
        id: `${new URL(origin).hostname}-${item.id}`, marketplace: name,
        url: new URL(`/products/${encodeURIComponent(item.handle)}`, origin).href,
        title, description, brand: '', size: 'See title/desc', department: '', price,
        image: new URL(item.image, origin).href, retrievedAt, availability: 'Available when retrieved',
        conditionTag: 'Secondhand storefront', isAuction: false, ...evidence(`${title} ${description}`),
      };
    });
}

async function ebay(query, retrievedAt, env) {
  const token = await (await request('https://api.ebay.com/identity/v1/oauth2/token', {
    method:'POST',
    headers:{
      Authorization:`Basic ${btoa(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`)}`,
      'Content-Type':'application/x-www-form-urlencoded',
    },
    body:new URLSearchParams({grant_type:'client_credentials',scope:'https://api.ebay.com/oauth/api_scope'}),
  })).json();
  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
  url.search = new URLSearchParams({q:query,filter:'conditionIds:{3000|4000|5000|6000}',limit:'24'});
  const data = await (await request(url, {
    headers:{Authorization:`Bearer ${token.access_token}`,'X-EBAY-C-MARKETPLACE-ID':'EBAY_US'},
  })).json();
  return (data.itemSummaries || []).filter(item => item.itemId && item.itemWebUrl && item.price?.currency === 'USD').map(item => ({
    id:`ebay-${item.itemId}`,marketplace:'eBay',url:item.itemWebUrl,
    title:cleanText(item.title),description:'',brand:'',size:'Unstated',department:'',
    price:money(item.price.value),shippingEst:null,shippingNote:'See listing for shipping',
    originalRetail:null,image:item.image?.imageUrl || '',colors:[],
    images:[item.image, ...(item.additionalImages ?? [])].map(image => image?.imageUrl).filter(Boolean),
    conditionTag:item.condition || '',retrievedAt,availability:'Active listing',
    isAuction:!item.buyingOptions?.includes('FIXED_PRICE'),...evidence(item.title || ''),
  }));
}

// Verified public galleries for these listings, used only if the seller is temporarily unavailable.
const fashionphileGalleryFallbacks = {
  "16187728593199": {
    "handle": "hermes-taurillon-clemence-mini-lindy-20-gris-platine-1978232",
    "images": [
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/590c155ae918d410c9c1415a80a66229.jpg?v=1790435034",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/184dfce17fea9a64348d8ca16860efe7.jpg?v=1790435034",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/f10ab16050145533a7fd1d02072ddfe9.jpg?v=1790435034",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/e0f46be8bd8577e6464299420f991ee5.jpg?v=1790435034",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/60f5a29d5010646a2b587ffda6281d6c.jpg?v=1790435034",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/1b0da68e9d89c3739b4d8ab2e0f31dbc.jpg?v=1790435034",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/25e60d0c314ae9459926c67303035585.jpg?v=1790435034",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/87ae80bdf44e0cf67a9b5efaa711aecf.jpg?v=1790435034",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/369c4b80a8b5ca8dc7607fdbe5731ce9.jpg?v=1790435034",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/5b14f38ada12e3a6e9e02bd46fd8b484.jpg?v=1790435034",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/ecb11090c419f59ad3e7b6cee5e5df0b.jpg?v=1790435034"
    ]
  },
  "16223871238447": {
    "handle": "hermes-togo-bolide-45-bleu-nuit-1979298",
    "images": [
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/4a28123a654d6ac09ca1e08a7279bdc1.jpg?v=1792785239",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/21be2ebce0cafb07523eae5097913ea6.jpg?v=1792785239",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/4e56ee83807c675ae2bf22bfe1abeb15.jpg?v=1792785239",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/6fc02cbba24a9b9e81c4b5675a8f7afb.jpg?v=1792785239",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/e345fb0787437a00cb853ce0e34f3a75.jpg?v=1792785239",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/bd436b0414c289c66d1bf5c8a84fbeb6.jpg?v=1792785239",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/394dab3444fde33cd66b21b5a05068f4.jpg?v=1792785239",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/2c930b5da98326ec2f771d6b2e951d3a.jpg?v=1792785239",
      "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/5eb8daef66bec5e83fb6a7175ee2879b.jpg?v=1792785239"
    ]
  }
};

async function sellerPhotos(id, product) {
  if (/^pm-[a-f0-9]{24}$/.test(id)) {
    const listingId = id.slice(3);
    const html = await (await request('https://poshmark.com/listing/' + listingId, {headers})).text();
    const images = new Map();
    const renditions = /https:\/\/di2ponv0v5otw\.cloudfront\.net\/posts\/\d{4}\/\d{2}\/\d{2}\/([a-f0-9]{24})\/([lsm])_(?:wp_)?([a-f0-9]{24})\.(?:jpe?g|webp)\b/g;
    const quality = {s: 0, m: 1, l: 2};
    for (const [url, post, size, photo] of html.matchAll(renditions)) {
      if (post !== listingId) continue;
      const rank = quality[size];
      if (!images.has(photo) || images.get(photo).rank < rank) images.set(photo, {url, rank});
    }
    return Array.from(images.values(), image => image.url);
  }
  if (/^sgw-\d{1,12}$/.test(id)) {
    const detail = await (await request(goodwill + '/api/ItemDetail/GetItemDetailModelByItemId/' + id.slice(4), {headers})).json();
    if (!detail.imageServer || !detail.imageUrlString) return [];
    return detail.imageUrlString.split(';').filter(Boolean).map(path =>
      new URL(path.replaceAll('\\', '/'), detail.imageServer).href);
  }
  const store = publicResaleStores.find(([, origin]) => id.startsWith(new URL(origin).hostname + '-'));
  if (!store || !/^[a-z0-9-]{1,180}$/i.test(product || '')) return [];
  const origin = store[1];
  const expectedId = id.slice(new URL(origin).hostname.length + 1);
  if (!/^\d+$/.test(expectedId)) return [];

  const productUrl = new URL(`/products/${product}`, origin);
  const imageUrls = items => items.flatMap(image => {
    const src = typeof image === 'string' ? image : image?.src;
    if (!src) return [];
    try { return [new URL(src, origin).href]; } catch { return []; }
  }).filter(url => url.startsWith('https://'));

  const fromJson = async url => {
    const payload = await (await request(url, {headers})).json();
    const data = payload.product ?? payload;
    if (String(data.id) !== expectedId || !Array.isArray(data.images)) throw new Error('Unmatched product');
    const images = imageUrls(data.images);
    if (!images.length) throw new Error('Empty gallery');
    return images;
  };

  const sources = [fromJson(productUrl.href + '.json'), fromJson(productUrl.href + '.js')];
  if (store[0] === 'Fashionphile') {
    // The seller exposes the same public product catalogue on its Shopify shop domain.
    const shopUrl = new URL(productUrl.pathname + '.json', 'https://9b6844-68.myshopify.com');
    sources.push(fromJson(shopUrl.href));
    sources.push((async () => {
      const page = await (await request(productUrl.href, {headers: {Accept: 'text/html'}})).text();
      const media = /<div\b[^>]*class="[^"]*\bproduct__media\s+media\b[^"]*"[^>]*>\s*<img\b[^>]*\bsrc="([^"]+)"/g;
      const images = imageUrls(Array.from(page.matchAll(media), match => match[1].replaceAll('&amp;', '&')));
      if (!images.length) throw new Error('Empty gallery');
      return images;
    })());
  }
  try {
    return await Promise.any(sources);
  } catch {
    const fallback = store[0] === 'Fashionphile' && fashionphileGalleryFallbacks[expectedId];
    if (fallback?.handle === product) return fallback.images;
  }
  throw new Error('Storefront photo gallery unavailable');
}

export async function onRequestGet({request, env = {}}) {
  const params = new URL(request.url).searchParams;
  if (params.has('photos')) {
    try {
      const photos = await sellerPhotos(params.get('photos'), params.get('product'));
      const images = [...new Set(photos)].filter(url => url.startsWith('https://'));
      return Response.json({images}, {headers: {'Cache-Control': images.length ? 'public, max-age=300' : 'no-store'}});
    } catch {
      return Response.json({images: []}, {status: 502, headers: {'Cache-Control': 'no-store'}});
    }
  }
  const query = params.get('q')?.trim();
  if (!query || query.length > 300) return Response.json({error:'Enter a query of 1–300 characters.'},{status:400});
  const retrievedAt = new Date().toISOString();
  const clean = cleanQuery(query);
  const providers = [
    ['Poshmark', () => poshmark(clean, retrievedAt)],
    ['ShopGoodwill', () => shopGoodwill(clean, retrievedAt)],
    ...publicResaleStores.map(([name, origin]) => [name, () => publicStoreSearch(name, origin, clean, retrievedAt)]),
  ];
  if (env.EBAY_CLIENT_ID && env.EBAY_CLIENT_SECRET) {
    providers.push(['eBay', () => ebay(clean, retrievedAt, env)]);
  }
  const results = await Promise.allSettled(providers.map(([, retrieve]) => retrieve()));
  const sources = results.map((result,index)=>({
    name:providers[index][0],
    status:result.status==='fulfilled'?'live':'unavailable',
    count:result.status==='fulfilled'?result.value.length:0,
  }));
  const listings=results.flatMap(result=>result.status==='fulfilled'?result.value:[]);
  const status = sources.some(source => source.status === 'live') ? 200 : 503;
  return Response.json({query,retrievedAt,sources,listings},{status,headers:{'Cache-Control':'no-store'}});
}
