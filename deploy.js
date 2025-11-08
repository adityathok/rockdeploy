#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const FtpDeploy = require('ftp-deploy');

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

async function uploadToFtp(localPath, remotePath, serverConfig, description) {
  try {
    log(`📤 Uploading ${description} to FTP...`, 'magenta');

    const config = {
      user: serverConfig.username,
      password: serverConfig.password,
      host: serverConfig.host,
      port: serverConfig.port,
      localRoot: path.dirname(localPath),
      remoteRoot: remotePath,
      include: [path.basename(localPath)],
      deleteRemote: false,
      forcePasv: true
    };

    const ftpDeploy = new FtpDeploy();

    await ftpDeploy.deploy(config);
    logSuccess(`${description} uploaded successfully to ${remotePath}`);

  } catch (error) {
    logError(`Failed to upload ${description}: ${error.message}`);
    process.exit(1);
  }
}

function loadServerConfig() {
  const configPath = path.join(__dirname, 'server.json');

  if (!fs.existsSync(configPath)) {
    logError('server.json not found. Please create it based on server-example.json');
    process.exit(1);
  }

  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    logError(`Failed to parse server.json: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  try {
    // Load server configuration
    const serverConfig = loadServerConfig();
    logSuccess('Server configuration loaded from server.json');

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

    // Step 4: FTP Upload
    logStep(4, 'Uploading to FTP Server');

    // Upload Backend first
    await uploadToFtp(
      backendDestPath,
      serverConfig.remotePathBackend,
      serverConfig,
      'Backend build'
    );

    // Upload Frontend
    await uploadToFtp(
      frontendDestPath,
      serverConfig.remotePathFrontend,
      serverConfig,
      'Frontend build'
    );

    // Step 5: Final Summary
    logStep(5, 'Deployment Complete');

    logSuccess('All files uploaded successfully!');
    log('\n🎉 Deployment completed successfully!', 'green');
    log(`📁 Backend: ${serverConfig.host} → ${serverConfig.remotePathBackend}`, 'green');
    log(`📁 Frontend: ${serverConfig.host} → ${serverConfig.remotePathFrontend}`, 'green');
    log('\n✨ Ready to go live!', 'green');

  } catch (error) {
    logError(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();