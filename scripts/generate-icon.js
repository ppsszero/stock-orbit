// SVG → PNG 변환 (Electron nativeImage 활용)
// 이 스크립트는 빌드 시 또는 수동으로 실행
const fs = require('fs');
const path = require('path');

const svgContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'assets', 'logo.svg'), 'utf8');
const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;

// HTML canvas를 써서 PNG로 변환하는 대신, 직접 nativeImage에서 사용할 수 있도록
// data URI를 JSON으로 저장
fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'icon-data.json'),
  JSON.stringify({ dataUri })
);

console.log('Icon data URI saved to public/icon-data.json');
