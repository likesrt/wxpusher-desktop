module.exports = {
  packagerConfig: {
    icon: './src/assets/wxpusher' // 不带.ico
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // iconUrl: 'https://yourdomain.com/path/to/wxpusher.ico', // 建议用公网链接，或暂时注释掉
        setupIcon: './src/assets/wxpusher.ico'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['x64']
    }
  ]
};
