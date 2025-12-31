#!/usr/bin/env node
// Helper script to switch between website and admin vercel configs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configType = process.argv[2];

if (!configType || (configType !== 'website' && configType !== 'admin')) {
  console.log('❌ Usage: node switch-config.js [website|admin]');
  console.log('');
  console.log('Examples:');
  console.log('  node switch-config.js website  # Switch to website config');
  console.log('  node switch-config.js admin     # Switch to admin config');
  process.exit(1);
}

const sourceFile = path.join(__dirname, `vercel.${configType}.json`);
const targetFile = path.join(__dirname, 'vercel.json');

if (!fs.existsSync(sourceFile)) {
  console.error(`❌ Config file not found: ${sourceFile}`);
  process.exit(1);
}

try {
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`✅ Switched to ${configType} configuration`);
  console.log(`   Copied vercel.${configType}.json → vercel.json`);
} catch (error) {
  console.error(`❌ Error switching config: ${error.message}`);
  process.exit(1);
}

