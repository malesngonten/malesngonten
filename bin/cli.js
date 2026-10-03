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
      const compData = registry.components[component];
      
      if (!compData) {
        console.error(`❌ Component "${component}" not found in registry.`);
        process.exit(1);
      }

      console.log(`📦 Downloading component files for ${compData.name}...`);
      for (const fileObj of compData.files) {
        const fileUrl = `${RAW_BASE_URL}/${fileObj.path}`;
        const destPath = path.join(process.cwd(), 'src', fileObj.path);
        console.log(`   Downloading ${fileObj.path} -> src/${fileObj.path}...`);
        await downloadFile(fileUrl, destPath);
      }

      console.log(`🎵 Downloading required audio assets...`);
      const audioFiles = ['key-click.wav', 'key-space.wav', 'key-enter.wav', 'fire-whoosh.wav'];
      for (const audio of audioFiles) {
        const audioUrl = `${RAW_BASE_URL}/components/terminal-simulator/assets/audio/${audio}`;
        const audioDest = path.join(process.cwd(), 'public', 'audio', audio);
        await downloadFile(audioUrl, audioDest);
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
