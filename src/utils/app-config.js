const path = require('path');

class AppConfig {
  constructor() {
    this.APP_NAME = 'WxPusher 微信推送';
    this.ICON_PATH = path.join(__dirname, '..', 'assets', 'icons', 'wxpusher_32x32.ico');
    this.ICON_PATH_256 = path.join(__dirname, '..', 'assets', 'icons', 'wxpusher_256x256.ico');
  }
}

module.exports = AppConfig;