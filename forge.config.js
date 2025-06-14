module.exports = {
    packagerConfig: {
      icon: './src/assets/wxpusher.ico'
    },
    rebuildConfig: {},
    makers: [
      {
        name: '@electron-forge/maker-squirrel',
        config: {
          iconUrl: './src/assets/wxpusher.ico',
          setupIcon: './src/assets/wxpusher.ico'
        }
      },
      {
        name: '@electron-forge/maker-zip',
        platforms: ['win32']
      }
    ]
  };
  