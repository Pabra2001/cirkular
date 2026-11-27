import {loopRecommendations} from './demo-loop.js';
import {initRecommendations} from '../cirkular-case-study/plugin/plugin.js?rev=shipping-footer';
import {demoListings} from './listings.js?rev=shipping-footer';

const downloadDialog = document.querySelector('dialog');

const preview = document.querySelector('.plugin-preview');
const root = preview.attachShadow({mode: 'open'});
root.append(preview.querySelector('template').content.cloneNode(true));
const openRecommendations = initRecommendations(root, {listings: demoListings, comparePrice: false});
const syncDemo = loopRecommendations(preview, root, openRecommendations, {
  blocked: () => downloadDialog.open,
  showReducedPreview: true,
});
downloadDialog.addEventListener('close', syncDemo);

document.querySelector('.download').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = '../cirkular-extension.zip';
  a.download = 'cirkular-extension.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();

  downloadDialog.showModal();
  syncDemo();
});
