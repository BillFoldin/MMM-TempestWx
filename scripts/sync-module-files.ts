import { getMmmTempestWxJs, getNodeHelperJs, getMmmTempestWxCss, getReadmeMd } from '../src/utils/moduleSourceCode.ts';
import { ModuleConfig } from '../src/types/tempest.ts';
import fs from 'fs';
import path from 'path';

const config: ModuleConfig = {
  stationId: 'YOUR_STATION_ID',
  token: 'YOUR_TEMPEST_TOKEN',
  units: 'imperial',
  pressureUnit: 'inHg',
  updateIntervalSeconds: 60,
  showModalOnTouch: true,
  autoCloseModalSeconds: 30,
  showFeelsLike: true,
  showDewPoint: true,
  showTrendArrows: true,
  mirrorPosition: 'top_right',
  compactMode: false,
  theme: 'native-mirror'
};

const rootDir = process.cwd();

// Write root-level files so Git tracks MMM-TempestWx.js, node_helper.js, MMM-TempestWx.css, and README.md
fs.writeFileSync(path.join(rootDir, 'MMM-TempestWx.js'), getMmmTempestWxJs(), 'utf8');
fs.writeFileSync(path.join(rootDir, 'node_helper.js'), getNodeHelperJs(), 'utf8');
fs.writeFileSync(path.join(rootDir, 'MMM-TempestWx.css'), getMmmTempestWxCss(), 'utf8');
fs.writeFileSync(path.join(rootDir, 'README.md'), getReadmeMd(config), 'utf8');

// Also populate module/ directory (zero npm dependencies, no package.json needed)
const moduleDir = path.join(rootDir, 'module');
if (!fs.existsSync(moduleDir)) {
  fs.mkdirSync(moduleDir, { recursive: true });
}

fs.writeFileSync(path.join(moduleDir, 'MMM-TempestWx.js'), getMmmTempestWxJs(), 'utf8');
fs.writeFileSync(path.join(moduleDir, 'node_helper.js'), getNodeHelperJs(), 'utf8');
fs.writeFileSync(path.join(moduleDir, 'MMM-TempestWx.css'), getMmmTempestWxCss(), 'utf8');
fs.writeFileSync(path.join(moduleDir, 'README.md'), getReadmeMd(config), 'utf8');

// Ensure module/package.json is deleted so MagicMirror has zero module/CommonJS conflicts
const modulePkg = path.join(moduleDir, 'package.json');
if (fs.existsSync(modulePkg)) {
  fs.unlinkSync(modulePkg);
}

console.log('[sync-module-files] Successfully synchronized standalone MagicMirror module files to disk (zero dependencies, no package.json).');
