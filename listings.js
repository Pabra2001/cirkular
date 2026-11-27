const photo = filename => new URL('./media/' + filename + '.webp', import.meta.url).href;

export const demoListings = [
  {
    name: 'Levi’s SilverTab Loose',
    price: '$24.00',
    why: 'Loose, paint-splattered denim. Knee rip and frayed hems.',
    facts: ['36 × 34', 'Pre-owned', 'Light blue', 'Loose, wide leg'],
    image: photo('jeans'),
    url: 'https://poshmark.com/listing/6ae259fc06c773904478166d',
  },
  {
    name: 'Salomon XT-6 Fiery Red',
    price: '$125.00',
    why: 'Trail sneakers with silver overlays and red soles.',
    labels: ['Listed size', 'Model', 'Colorway', 'Style'],
    facts: ['5', 'XT-6', 'Black, red, silver', 'Trail sneaker'],
    image: photo('salomon-xt6'),
    url: 'https://poshmark.com/listing/6afe04621b7e50bd4890d80c',
  },
  {
    name: 'GANNI Leopard Midi',
    price: '$139.00',
    why: 'Ruched silk-blend midi in leopard print.',
    labels: ['Listed size', 'Fabric', 'Print', 'Length'],
    facts: ['EU 34 / US 2', 'Silk blend', 'Leopard', 'Midi'],
    image: photo('ganni-midi'),
    url: 'https://poshmark.com/listing/6b05b90e78e01d0b4ae738e7',
  },
];
