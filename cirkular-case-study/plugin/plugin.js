const products = [
  {
    "name": "Levi’s SilverTab Loose",
    "price": "$24.00",
    "facts": [
      "36 × 34",
      "Pre-owned",
      "Light blue",
      "Loose, wide leg"
    ],
    "why": "Faded blue with paint splatter and a loose leg. The seller notes a knee rip and frayed hems.",
    "url": "https://poshmark.com/listing/Levis-SilverTab-Loose-Jeans-Mens-36x34-Light-Wash-Distressed-Paint-Splatter-90s-6ae259fc06c773904478166d",
    "image": "https://di2ponv0v5otw.cloudfront.net/posts/2026/10/28/6ae259fc06c773904478166d/m_6ae259fc06c773904478166e.jpg"
  },
  {
    "name": "Levi’s 569 Loose Straight",
    "price": "$30.00",
    "facts": [
      "36 × 32",
      "Pre-owned",
      "Light to medium blue",
      "Loose straight"
    ],
    "why": "The faded blue wash, whiskering, and paint marks echo the Acne pair. The 569 has a straighter leg.",
    "url": "https://poshmark.com/listing/Levis-569-Loose-Straight-Jeans-Mens-36x32-Light-Wash-Paint-Splatter-Denim-6adf9f0a684147eefcc7e88b",
    "image": "https://di2ponv0v5otw.cloudfront.net/posts/2026/10/26/6adf9f0a684147eefcc7e88b/m_6adf9f0bab650b2c1417ffc4.jpg"
  },
  {
    "name": "Paint-splatter barrel jeans",
    "price": "$32.00",
    "facts": [
      "Women’s M",
      "Like new",
      "Faded light blue",
      "Baggy barrel leg"
    ],
    "why": "Brown and white splatter gives this pair a dirty-wash look. A drawstring waist and barrel leg change the fit.",
    "url": "https://poshmark.com/listing/Barrel-Leg-Jeans-Paint-Splatter-Baggy-Denim-Y2K-Skater-Streetwear-Size-M-6ad937c7de48834720d99dcf",
    "image": "https://di2ponv0v5otw.cloudfront.net/posts/2026/10/21/6ad937c7de48834720d99dcf/m_6ad938118974d0d3c65496e3.jpg"
  }
];

const grade = new URLSearchParams(location.search).get('grade')?.toUpperCase();

if (document.querySelector('.grade-overlay') && ['B', 'C', 'D', 'F'].includes(grade)) {
  document.body.dataset.mode = 'grade';
  document.querySelector('.grade-letter').textContent = grade;
  document.querySelector('.grade-overlay').setAttribute('aria-label', 'KORE grade ' + grade);
  document.title = 'Cirkular · KORE grade ' + grade;
} else if (document.querySelector('.grade-overlay')) {
  initRecommendations(document);
}

export function initRecommendations(root, {listings = products, comparePrice = true, retailPrice = 850} = {}) {
  const rail = root.querySelector('.arrangement');
  const mark = root.querySelector('.mark');
  const recommendations = root.querySelector('#recommendations');
  const detail = root.querySelector('#detail');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = -1;
  let ringMotion;

  const buttons = listings.map((product, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.setAttribute('aria-controls', detail.id);
    const img = new Image();
    img.src = product.image;
    img.alt = '';
    button.append(img);
    button.addEventListener('click', () => select(selected === index ? -1 : index));
    recommendations.append(button);
    return button;
  });
  updateCue();

  mark.addEventListener('click', () => setOpen(recommendations.hidden));
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || recommendations.hidden) return;
    if (selected >= 0) select(-1, true);
    else {
      setOpen(false);
      mark.focus();
    }
  });
  window.addEventListener('resize', stopMotion);
  reduce.addEventListener('change', stopMotion);

  return (featured) => {
    setOpen(true);
    if (featured !== undefined) select(featured, false, false);
  };

  function updateCue() {
    buttons.forEach((button, index) => {
      const suggested = selected < 0 && index === 0;
      const product = listings[index];
      button.toggleAttribute('data-suggested', suggested);
      button.toggleAttribute('data-picked', index === selected);
      button.setAttribute('aria-expanded', String(index === selected));
      button.setAttribute('aria-label', product.name + ', ' + product.price + (suggested ? ', suggested pick' : ''));
    });
  }

  function select(index, restoreFocus = false, focusDetail = true) {
    const previous = selected;
    selected = index;
    ringMotion?.classList.remove('ring-travel');
    updateCue();
    const source = previous >= 0 ? previous : 0;
    if (index >= 0 && index !== source && !reduce.matches) {
      const target = buttons[index];
      const distance = buttons[source].offsetTop - target.offsetTop;
      target.style.setProperty('--ring-offset', `${distance}px`);
      target.classList.add('ring-travel');
      ringMotion = target;
    }
    detail.hidden = selected < 0;
    if (detail.hidden) {
      if (restoreFocus) buttons[previous].focus({preventScroll: true});
      return;
    }

    const product = listings[selected];
    const savings = (retailPrice - Number(product.price.slice(1))).toFixed(2);
    const labels = product.labels ?? ['Listed size', 'Condition', 'Wash', 'Cut'];
    detail.innerHTML = `
      <div class="detail-top">
        <span class="card-source"><span class="card-brand" role="img" aria-label="Cirkular"></span><span class="meta">· Poshmark</span></span>
        <button class="close" type="button" aria-label="Close details">×</button>
      </div>
      <div class="product">
        <img src="${product.image}" alt="">
        <div>
          <span class="meta">Secondhand listing</span>
          <h2>${product.name}</h2>
          <strong>${product.price}</strong>
          ${comparePrice ? `<div class="deal"><s>$${retailPrice} at SSENSE</s><span class="saving">$${savings} less</span></div>` : ''}
        </div>
      </div>
      <p class="why">${product.why}</p>
      <dl class="metrics">
        ${labels.map((label, i) => `<div><dt>${label}</dt><dd>${product.facts[i]}</dd></div>`).join('')}
      </dl>
      <a class="buy" href="${product.url}" target="_blank" rel="noopener">
        <span>Buy now</span>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12 12 4M5 4h7v7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
      <p class="listing-note">Item price before shipping and tax. Confirm measurements with the seller.</p>`;
    const close = detail.querySelector('.close');
    close.addEventListener('click', () => select(-1, true));
    if (focusDetail) close.focus({preventScroll: true});
  }

  function setOpen(open) {
    mark.setAttribute('aria-expanded', String(open));
    rail.toggleAttribute('data-open', open);
    recommendations.hidden = !open;
    if (open) rail.classList.toggle('rail-reveal', !reduce.matches);
    else {
      select(-1);
      stopMotion();
    }
  }

  function stopMotion() {
    rail.classList.remove('rail-reveal');
  }
}
