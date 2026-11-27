const photo = filename => new URL('./media/' + filename + '.webp', import.meta.url).href;

export const demoListings = [
  {
    name: 'Levi’s SilverTab Loose',
    price: '$24.00',
    why: 'Paint splatters mark the light blue denim. The jeans have a wide-leg cut. A rip at the knee and frayed hems add texture.',
    facts: ['36 × 34', 'Pre-owned', 'Light blue', 'Wide leg'],
    image: photo('jeans'),
    url: 'https://poshmark.com/listing/6ae259fc06c773904478166d',
  },
  {
    name: 'Salomon XT-6 Fiery Red',
    price: '$125.00',
    why: 'These trail sneakers have black uppers. Silver overlays run along the sides of each shoe. Red accents brighten the soles.',
    labels: ['Listed size', 'Model', 'Colorway', 'Style'],
    facts: ['5', 'XT-6', 'Black/red/silver', 'Trail sneaker'],
    image: photo('salomon-xt6'),
    url: 'https://poshmark.com/listing/6afe04621b7e50bd4890d80c',
  },
  {
    name: 'GANNI Leopard Midi',
    price: '$139.00',
    why: 'Leopard print covers the silk blend. Ruching adds texture to the midi dress. A clean square neckline frames the fitted bodice.',
    labels: ['Listed size', 'Fabric', 'Print', 'Length'],
    facts: ['EU 34 · US 2', 'Silk blend', 'Leopard', 'Midi'],
    image: photo('ganni-midi'),
    url: 'https://poshmark.com/listing/6b05b90e78e01d0b4ae738e7',
  },
];
