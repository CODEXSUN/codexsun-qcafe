import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const outDir = resolve(import.meta.dirname, '../apps/q-cafe/web/public/demo-images');
mkdirSync(outDir, { recursive: true });

const demoItems = [
  {
    filename: 'filter-coffee.svg',
    title: 'Filter Coffee',
    category: 'Hot Coffee',
    bgStart: '#4a2c11',
    bgEnd: '#211205',
    accent: '#d4a373',
    icon: `<path d="M120 180 C120 230 180 250 200 250 C220 250 280 230 280 180 L290 120 L110 120 Z" fill="#8c5828" stroke="#d4a373" stroke-width="6"/>
           <path d="M280 135 C310 135 330 155 330 180 C330 205 310 220 275 220" fill="none" stroke="#d4a373" stroke-width="8" stroke-linecap="round"/>
           <ellipse cx="200" cy="120" rx="90" ry="24" fill="#381d09" stroke="#d4a373" stroke-width="6"/>
           <ellipse cx="200" cy="120" rx="76" ry="18" fill="#583111"/>
           <path d="M170 85 Q165 65 175 45 M200 80 Q195 60 205 40 M230 85 Q225 65 235 45" stroke="rgba(255,255,255,0.4)" stroke-width="4" stroke-linecap="round" fill="none"/>`
  },
  {
    filename: 'cappuccino.svg',
    title: 'Cappuccino',
    category: 'Hot Coffee',
    bgStart: '#54361e',
    bgEnd: '#291708',
    accent: '#e6ccb2',
    icon: `<ellipse cx="200" cy="245" rx="110" ry="22" fill="rgba(0,0,0,0.3)"/>
           <path d="M110 150 C110 220 160 240 200 240 C240 240 290 220 290 150 Z" fill="#e6ccb2" stroke="#b08968" stroke-width="5"/>
           <ellipse cx="200" cy="150" rx="90" ry="25" fill="#eddcd2" stroke="#b08968" stroke-width="5"/>
           <ellipse cx="200" cy="150" rx="80" ry="20" fill="#7f5539"/>
           <path d="M200 138 C185 138 175 148 185 158 C195 168 200 172 200 172 C200 172 205 168 215 158 C225 148 215 138 200 138 Z" fill="#eddcd2"/>
           <path d="M290 160 C315 160 330 175 330 195 C330 215 315 225 285 225" fill="none" stroke="#b08968" stroke-width="7" stroke-linecap="round"/>`
  },
  {
    filename: 'iced-latte.svg',
    title: 'Iced Latte',
    category: 'Cold Drinks',
    bgStart: '#1d3557',
    bgEnd: '#0d1b2a',
    accent: '#a8dadc',
    icon: `<path d="M140 100 L155 240 C155 250 170 255 200 255 C230 255 245 250 245 240 L260 100 Z" fill="rgba(255,255,255,0.15)" stroke="#a8dadc" stroke-width="5"/>
           <path d="M145 140 L155 238 C155 245 170 250 200 250 C230 250 245 245 245 238 L255 140 Z" fill="#c49e7a"/>
           <rect x="170" y="150" width="24" height="24" rx="4" fill="rgba(255,255,255,0.7)" transform="rotate(15 182 162)"/>
           <rect x="205" y="175" width="22" height="22" rx="4" fill="rgba(255,255,255,0.7)" transform="rotate(-10 216 186)"/>
           <line x1="215" y1="50" x2="190" y2="230" stroke="#e63946" stroke-width="7" stroke-linecap="round"/>`
  },
  {
    filename: 'masala-chai.svg',
    title: 'Masala Chai',
    category: 'Hot Tea',
    bgStart: '#7c3f1b',
    bgEnd: '#3b1c09',
    accent: '#f4a261',
    icon: `<ellipse cx="200" cy="250" rx="90" ry="16" fill="rgba(0,0,0,0.35)"/>
           <path d="M130 140 L145 230 C145 240 170 246 200 246 C230 246 255 240 255 230 L270 140 Z" fill="#b06c3b" stroke="#f4a261" stroke-width="5"/>
           <ellipse cx="200" cy="140" rx="70" ry="16" fill="#c87d46" stroke="#f4a261" stroke-width="4"/>
           <path d="M185 95 Q175 75 190 55 M215 90 Q205 70 220 50" stroke="rgba(255,255,255,0.4)" stroke-width="4" stroke-linecap="round" fill="none"/>`
  },
  {
    filename: 'paneer-sandwich.svg',
    title: 'Paneer Sandwich',
    category: 'Snacks',
    bgStart: '#2d4739',
    bgEnd: '#132119',
    accent: '#84a98c',
    icon: `<path d="M110 210 L200 130 L290 210 Z" fill="#c99a5e" stroke="#8d6332" stroke-width="6"/>
           <path d="M115 210 L200 140 L285 210 Z" fill="#e7c48f"/>
           <rect x="135" y="185" width="130" height="12" rx="4" fill="#606c38"/>
           <rect x="145" y="175" width="110" height="14" rx="3" fill="#fefae0"/>
           <rect x="150" y="195" width="100" height="10" rx="3" fill="#bc4749"/>
           <line x1="140" y1="205" x2="260" y2="205" stroke="#8d6332" stroke-width="5"/>`
  },
  {
    filename: 'pesto-pasta.svg',
    title: 'Pesto Pasta',
    category: 'Snacks',
    bgStart: '#264653',
    bgEnd: '#112128',
    accent: '#2a9d8f',
    icon: `<ellipse cx="200" cy="210" rx="120" ry="45" fill="#f8f9fa" stroke="#adb5bd" stroke-width="6"/>
           <ellipse cx="200" cy="205" rx="90" ry="32" fill="#52796f"/>
           <circle cx="180" cy="195" r="14" fill="#84a98c"/>
           <circle cx="215" cy="195" r="16" fill="#84a98c"/>
           <circle cx="195" cy="212" r="13" fill="#84a98c"/>
           <circle cx="180" cy="190" r="5" fill="#e63946"/>
           <circle cx="225" cy="200" r="6" fill="#e63946"/>`
  },
  {
    filename: 'croissant.svg',
    title: 'Butter Croissant',
    category: 'Dessert',
    bgStart: '#5c4033',
    bgEnd: '#291810',
    accent: '#ddb892',
    icon: `<ellipse cx="200" cy="240" rx="100" ry="18" fill="rgba(0,0,0,0.3)"/>
           <path d="M110 200 C120 160 160 140 200 140 C240 140 280 160 290 200 C270 215 240 210 200 210 C160 210 130 215 110 200 Z" fill="#dda15e" stroke="#b07d3b" stroke-width="6"/>
           <path d="M165 145 C175 170 175 195 170 210 M235 145 C225 170 225 195 230 210" stroke="#b07d3b" stroke-width="4"/>
           <path d="M195 140 C200 165 200 185 200 210" stroke="#b07d3b" stroke-width="4"/>`
  },
  {
    filename: 'brownie.svg',
    title: 'Chocolate Brownie',
    category: 'Dessert',
    bgStart: '#301b13',
    bgEnd: '#130905',
    accent: '#b07d62',
    icon: `<ellipse cx="200" cy="245" rx="90" ry="16" fill="rgba(0,0,0,0.4)"/>
           <path d="M120 170 L200 130 L280 170 L200 210 Z" fill="#4a2810" stroke="#2c1404" stroke-width="5"/>
           <path d="M120 170 L120 205 L200 245 L200 210 Z" fill="#2c1404"/>
           <path d="M280 170 L280 205 L200 245 L200 210 Z" fill="#381b07"/>
           <circle cx="190" cy="165" r="4" fill="#d4a373"/>
           <circle cx="220" cy="160" r="5" fill="#d4a373"/>
           <circle cx="170" cy="180" r="3" fill="#d4a373"/>`
  },
  {
    filename: 'burger.svg',
    title: 'Veg Burger',
    category: 'Snacks',
    bgStart: '#4f3b20',
    bgEnd: '#1e1408',
    accent: '#f39c12',
    icon: `<ellipse cx="200" cy="250" rx="95" ry="16" fill="rgba(0,0,0,0.3)"/>
           <path d="M130 170 C130 120 160 110 200 110 C240 110 270 120 270 170 Z" fill="#e67e22" stroke="#b95e09" stroke-width="5"/>
           <circle cx="170" cy="135" r="2.5" fill="#fefae0"/>
           <circle cx="200" cy="125" r="2.5" fill="#fefae0"/>
           <circle cx="230" cy="135" r="2.5" fill="#fefae0"/>
           <rect x="125" y="170" width="150" height="12" rx="4" fill="#27ae60"/>
           <rect x="120" y="182" width="160" height="18" rx="5" fill="#78390b"/>
           <rect x="130" y="200" width="140" height="14" rx="4" fill="#f1c40f"/>
           <path d="M130 214 C130 232 160 240 200 240 C240 240 270 232 270 214 Z" fill="#e67e22" stroke="#b95e09" stroke-width="5"/>`
  },
  {
    filename: 'french-fries.svg',
    title: 'French Fries',
    category: 'Snacks',
    bgStart: '#592520',
    bgEnd: '#240d0b',
    accent: '#e74c3c',
    icon: `<ellipse cx="200" cy="250" rx="80" ry="16" fill="rgba(0,0,0,0.3)"/>
           <path d="M140 160 L155 240 L245 240 L260 160 Z" fill="#c0392b" stroke="#962d22" stroke-width="5"/>
           <rect x="175" y="195" width="50" height="30" rx="6" fill="#f1c40f"/>
           <rect x="160" y="90" width="12" height="85" rx="3" fill="#f39c12" transform="rotate(-12 166 132)"/>
           <rect x="180" y="75" width="12" height="100" rx="3" fill="#f1c40f" transform="rotate(-4 186 125)"/>
           <rect x="200" y="70" width="12" height="105" rx="3" fill="#f39c12" transform="rotate(3 206 122)"/>
           <rect x="220" y="80" width="12" height="95" rx="3" fill="#f1c40f" transform="rotate(10 226 127)"/>
           <rect x="238" y="95" width="12" height="80" rx="3" fill="#f39c12" transform="rotate(18 244 135)"/>`
  }
];

for (const item of demoItems) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <linearGradient id="bg-${item.filename}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${item.bgStart}"/>
      <stop offset="100%" stop-color="${item.bgEnd}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="400" height="300" rx="16" fill="url(#bg-${item.filename})"/>
  <circle cx="200" cy="150" r="130" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
  <circle cx="200" cy="150" r="95" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1.5"/>
  <g filter="url(#shadow)">
    ${item.icon}
  </g>
  <rect x="20" y="240" width="110" height="26" rx="13" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="75" y="257" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="${item.accent}" text-anchor="middle">${item.category}</text>
  <text x="380" y="258" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#ffffff" text-anchor="end">${item.title}</text>
</svg>`;

  writeFileSync(resolve(outDir, item.filename), svg, 'utf8');
  console.log(`Generated: ${item.filename}`);
}

console.log('All 10 demo images successfully written to public/demo-images/');
