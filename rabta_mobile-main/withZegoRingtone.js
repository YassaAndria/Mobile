const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withZegoRingtone(config) {
  // 1. Android raw resources copy
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot; // android directory
      
      const rawDir = path.join(platformRoot, 'app/src/main/res/raw');
      if (!fs.existsSync(rawDir)) {
        fs.mkdirSync(rawDir, { recursive: true });
      }
      
      const sourceDir = path.join(
        projectRoot,
        'node_modules/@zegocloud/zego-uikit-prebuilt-call-rn/android/app/src/main/res/raw'
      );
      
      const filesToCopy = ['zego_incoming.mp3', 'zego_outgoing.mp3'];
      
      for (const fileName of filesToCopy) {
        const sourcePath = path.join(sourceDir, fileName);
        const destPath = path.join(rawDir, fileName);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`[withZegoRingtone] Copied ${fileName} to ${destPath}`);
        } else {
          console.warn(`[withZegoRingtone] Source file not found: ${sourcePath}`);
        }
      }
      
      return config;
    },
  ]);

  // 2. iOS resources copy (if iOS build is run)
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot; // ios directory
      
      const sourceDir = path.join(
        projectRoot,
        'node_modules/@zegocloud/zego-uikit-prebuilt-call-rn/android/app/src/main/res/raw'
      );
      
      const filesToCopy = ['zego_incoming.mp3', 'zego_outgoing.mp3'];
      
      for (const fileName of filesToCopy) {
        const sourcePath = path.join(sourceDir, fileName);
        const destPath = path.join(platformRoot, fileName);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`[withZegoRingtone] Copied ${fileName} to ${destPath}`);
        }
      }
      
      return config;
    },
  ]);

  return config;
}

module.exports = withZegoRingtone;
