const slides = Array.from(document.querySelectorAll(".slide"));
const dots = Array.from(document.querySelectorAll(".dot"));
const counter = document.getElementById("step-counter");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

const KORE_EXAMPLES = {
  A: {
    title: "KORE Grade A · 100% Organic Linen / Hemp",
    desc: "Low-impact natural mono-material — high durability and biodegradable."
  },
  B: {
    title: "KORE Grade B · 100% Cotton",
    desc: "Natural mono-material fiber — durable, breathable, and easier to recycle."
  },
  C: {
    title: "KORE Grade C · 65% Cotton, 35% Polyester",
    desc: "Blended construction — moderate longevity, harder to recycle at end of life."
  },
  D: {
    title: "KORE Grade D · 85% Polyester, 15% Elastane",
    desc: "Synthetic-heavy — petroleum-derived fibers that shed microplastics."
  },
  F: {
    title: "KORE Grade F · 100% Virgin Acrylic / PVC",
    desc: "High-impact synthetic — low breathability, rapid pilling, non-biodegradable."
  }
};

let index = 0;

function render(nextIndex) {
  index = Math.max(0, Math.min(slides.length - 1, nextIndex));
  slides.forEach((s, i) => s.classList.toggle("active", i === index));
  dots.forEach((d, i) => d.classList.toggle("active", i === index));
  counter.textContent = `0${index + 1} / 0${slides.length}`;
  prevBtn.hidden = index === 0;
  nextBtn.textContent = index === slides.length - 1 ? "Activate CIRKULAR" : "Next →";
}

prevBtn.addEventListener("click", () => render(index - 1));
nextBtn.addEventListener("click", () => {
  if (index === slides.length - 1) {
    window.close();
  } else {
    render(index + 1);
  }
});

dots.forEach((dot) => {
  dot.addEventListener("click", () => render(Number(dot.dataset.goto)));
});

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") render(index + 1);
  if (e.key === "ArrowLeft") render(index - 1);
});

const koreButtons = Array.from(document.querySelectorAll(".kore-btn"));
const koreReadout = document.getElementById("kore-readout");
const stampLetter = document.getElementById("stamp-letter");
koreButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const g = btn.dataset.grade;
    koreButtons.forEach((b) => b.classList.toggle("active", b === btn));
    if (stampLetter) stampLetter.textContent = g;
    const info = KORE_EXAMPLES[g];
    if (info) {
      koreReadout.innerHTML = `<strong>${info.title}</strong><p>${info.desc}</p>`;
    }
  });
});

const initialStep = Number(new URLSearchParams(location.search).get("step") || 0);
if (initialStep > 0) render(initialStep);
