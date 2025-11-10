#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const FtpDeploy = require('ftp-deploy');
const https = require('https');
const http = require('http');

console.log('🚀 Starting frontend deployment process...\n');

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

let stepStartTime = {};

function logStep(step, message) {
  stepStartTime[step] = Date.now();
  log(`\n[STEP ${step}] ${message}`, 'cyan');
  log('='.repeat(50), 'cyan');
}

function logStepComplete(step, message) {
  const duration = stepStartTime[step] ? ((Date.now() - stepStartTime[step]) / 1000).toFixed(2) : '0.00';
  log(`\n[STEP ${step}] ${message}`, 'green');
  log(`⏱️  Duration: ${duration} seconds`, 'yellow');
  log('='.repeat(50), 'green');
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

function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve({
            statusCode: response.statusCode,
            data: data
          });
        } else {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout after 30 seconds'));
    });
  });
}

async function triggerRemoteDeployment(serverConfig) {
  try {
    log('🚀 Triggering remote deployment...', 'magenta');

    // Generate key: date in dmy format
    const today = new Date();
    const key = today.getDate().toString().padStart(2, '0') +
                (today.getMonth() + 1).toString().padStart(2, '0') +
                today.getFullYear().toString().slice(-2);

    const deployUrl = `${serverConfig.appUrl}/deployer.php?key=${key}&frontend=1`;
    log(`📡 Calling: ${deployUrl}`, 'blue');

    const response = await makeHttpRequest(deployUrl);
    logSuccess(`Remote frontend deployment triggered successfully!`);
    log(`📊 Response: ${response.data}`, 'green');

  } catch (error) {
    logError(`Failed to trigger remote deployment: ${error.message}`);
    process.exit(1);
  }
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
    const config = JSON.parse(configData);

    // Validate required fields for remote deployment
    const requiredFields = ['host', 'username', 'password', 'port', 'remotePathFrontend', 'appUrl'];

    for (const field of requiredFields) {
      if (!config[field]) {
        logError(`Missing required field in server.json: ${field}`);
        process.exit(1);
      }
    }

    return config;
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

    logStepComplete(1, 'Frontend build completed');

    // Step 2: Summary
    logStep(2, 'Frontend Deployment Summary');

    logSuccess('Frontend built successfully!');
    log(`  📦 Location: ${frontendDestPath}`, 'green');

    // Show file size
    const frontendStats = fs.statSync(frontendDestPath);

    log('\n📊 Build Size:', 'yellow');
    log(`  Frontend: ${(frontendStats.size / 1024 / 1024).toFixed(2)} MB`, 'yellow');

    logStepComplete(2, 'Frontend deployment summary completed');

    // Step 3: FTP Upload
    logStep(3, 'Uploading Frontend to FTP Server');

    // Upload Frontend
    await uploadToFtp(
      frontendDestPath,
      serverConfig.remotePathFrontend,
      serverConfig,
      'Frontend build'
    );

    logStepComplete(3, 'Frontend FTP upload completed');

    // Step 4: Trigger Remote Deployment
    logStep(4, 'Triggering Remote Frontend Deployment');

    await triggerRemoteDeployment(serverConfig);

    logStepComplete(4, 'Remote frontend deployment triggered');

    // Step 5: Final Summary
    logStep(5, 'Frontend Deployment Complete');

    logSuccess('Frontend files uploaded and deployment triggered successfully!');
    log('\n🎉 Frontend deployment completed successfully!', 'green');
    log(`📁 Frontend: ${serverConfig.host} → ${serverConfig.remotePathFrontend}`, 'green');
    log(`🚀 Remote deployment: ${serverConfig.appUrl}/deployer.php?frontend=1`, 'green');
    log('\n✨ Frontend ready to go live!', 'green');

    logStepComplete(5, 'Frontend deployment process completed');

  } catch (error) {
    logError(`Frontend deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();