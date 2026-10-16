#!/usr/bin/env node

const { Command } = require('commander');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const program = new Command();

const REGISTRY_URL = 'https://raw.githubusercontent.com/malesngonten/malesngonten-registry/main/registry.json';
const RAW_BASE_URL = 'https://raw.githubusercontent.com/malesngonten/malesngonten-registry/main';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        fs.closeSync(fs.openSync(dest, 'w'));
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Component keys in registry.json use display names (e.g. "Three Phone Demo"),
// while users install with the export/slug name (e.g. "ThreePhoneDemo",
// "three-phone-demo"). Normalize away separators and casing so every spelling
// of a component resolves to the same registry key.
function normalizeName(name) {
  return String(name).toLowerCase().replace(/[\s_-]/g, '');
}

function findComponent(registry, input) {
  const components = registry.components || {};
  if (components[input]) {
    return { key: input, data: components[input] };
  }
  const target = normalizeName(input);
  for (const [key, data] of Object.entries(components)) {
    if (normalizeName(key) === target) {
      return { key, data };
    }
  }
  return null;
}

program
  .name('malesngonten')
  .description('CLI for adding MalesNgonten Remotion UI components')
  .version('1.0.0');

program
  .command('add <component>')
  .description('Add a component and automatically install required dependencies')
  .action(async (component) => {
    console.log(`\n🚀 Fetching component registry for: ${component}...`);
    try {
      const registry = await fetchJson(REGISTRY_URL);
      const match = findComponent(registry, component);

      if (!match) {
        console.error(`❌ Component "${component}" not found in registry.`);
        const hints = Object.keys(registry.components || {})
          .filter((key) => normalizeName(key).includes(normalizeName(component)))
          .slice(0, 5);
        if (hints.length > 0) {
          console.error(`   Closest matches: ${hints.join(', ')}`);
        }
        process.exit(1);
      }
      const compData = match.data;

      console.log(`📦 Downloading component files for ${compData.name}...`);
      for (const fileObj of compData.files) {
        const fileUrl = `${RAW_BASE_URL}/${fileObj.path}`;
        const destPath = path.join(process.cwd(), 'src', fileObj.path);
        console.log(`   Downloading ${fileObj.path} -> src/${fileObj.path}...`);
        await downloadFile(fileUrl, destPath);
      }

      // Static assets (audio, fonts, .glb models, ...) referenced by the
      // component through staticFile(). Each entry is { path, dest }: "path"
      // is the file inside this repository, "dest" is where it lands in the
      // user's project relative to the project root (usually under public/, so
      // Remotion's staticFile() can resolve it).
      const assets = compData.publicAssets || [];
      for (const asset of assets) {
        const src = typeof asset === 'string' ? asset : asset.path;
        const dest = typeof asset === 'string' ? asset : (asset.dest || asset.path);
        const assetUrl = `${RAW_BASE_URL}/${src}`;
        const assetDest = path.join(process.cwd(), dest);
        console.log(`   Downloading ${src} -> ${dest}...`);
        await downloadFile(assetUrl, assetDest);
      }
      if (assets.length === 0) {
        console.log(`🎨 No extra static assets required for this component.`);
      }

      if (compData.dependencies && compData.dependencies.length > 0) {
        console.log(`\n📦 Automatically installing npm dependencies: ${compData.dependencies.join(', ')}...`);
        try {
          execSync(`npm install ${compData.dependencies.join(' ')}`, { stdio: 'inherit' });
          console.log(`✨ Dependencies installed successfully!`);
        } catch (installErr) {
          console.warn(`⚠️ Warning: Automatic installation encountered an issue. Please run: npm install ${compData.dependencies.join(' ')}`);
        }
      }

      console.log(`\n✨ Successfully added ${compData.name} to your project!\n`);
    } catch (err) {
      console.error(`❌ Error adding component:`, err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
