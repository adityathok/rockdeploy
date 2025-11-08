#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting deployment process...\n');

// Warna untuk console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[STEP ${step}] ${message}`, 'cyan');
  log('='.repeat(50), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function execCommand(command, cwd = null) {
  try {
    log(`🔧 Executing: ${command}`, 'blue');
    const options = cwd ? { cwd, stdio: 'inherit' } : { stdio: 'inherit' };
    execSync(command, options);
    logSuccess(`Command completed: ${command}`);
  } catch (error) {
    logError(`Failed to execute: ${command}`);
    logError(`Error: ${error.message}`);
    process.exit(1);
  }
}

function copyFile(src, dest) {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(src, dest);
    logSuccess(`Copied: ${src} -> ${dest}`);
  } catch (error) {
    logError(`Failed to copy ${src} to ${dest}: ${error.message}`);
    process.exit(1);
  }
}

function checkFileExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    logError(`${description} not found: ${filePath}`);
    process.exit(1);
  }
  logSuccess(`${description} found: ${filePath}`);
}

try {
  // Step 1: Build Frontend
  logStep(1, 'Building Frontend (rockdash)');

  const rockdashPath = path.join(__dirname, '..', 'rockdash');
  const frontendZipPath = path.join(rockdashPath, '.output', 'build.zip');
  const frontendDestPath = path.join(__dirname, 'dist', 'frontend', 'build.zip');

  // Build frontend
  execCommand('npm run build:prod', rockdashPath);

  // Check if frontend zip exists
  checkFileExists(frontendZipPath, 'Frontend build zip');

  // Copy frontend zip
  copyFile(frontendZipPath, frontendDestPath);

  // Step 2: Build Backend
  logStep(2, 'Building Backend (rockapi)');

  const rockapiPath = path.join(__dirname, '..', 'rockapi');
  const backendZipPath = path.join(rockapiPath, 'dist', 'build.zip');
  const backendDestPath = path.join(__dirname, 'dist', 'backend', 'build.zip');

  // Build backend
  execCommand('npm run build', rockapiPath);

  // Check if backend zip exists
  checkFileExists(backendZipPath, 'Backend build zip');

  // Copy backend zip
  copyFile(backendZipPath, backendDestPath);

  // Step 3: Summary
  logStep(3, 'Deployment Summary');

  logSuccess('Frontend deployed successfully!');
  log(`  📦 Location: ${frontendDestPath}`, 'green');

  logSuccess('Backend deployed successfully!');
  log(`  📦 Location: ${backendDestPath}`, 'green');

  // Show file sizes
  const frontendStats = fs.statSync(frontendDestPath);
  const backendStats = fs.statSync(backendDestPath);

  log('\n📊 Build Sizes:', 'yellow');
  log(`  Frontend: ${(frontendStats.size / 1024 / 1024).toFixed(2)} MB`, 'yellow');
  log(`  Backend: ${(backendStats.size / 1024 / 1024).toFixed(2)} MB`, 'yellow');

  log('\n🎉 Deployment completed successfully!', 'green');
  log('Ready to upload to server!', 'green');

} catch (error) {
  logError(`Deployment failed: ${error.message}`);
  process.exit(1);
}