# WxPusher 微信推送 Electron 桌面版

> 基于 Electron 的 WxPusher 消息推送客户端，采用模块化架构设计，支持扫码登录、实时消息推送、桌面通知、托盘驻留等功能。

---

![PixPin_2025-06-15_22-09-16](https://github.com/user-attachments/assets/4acafa93-7302-489d-90fd-34dd93b96651)
![PixPin_2025-06-15_22-09-51](https://github.com/user-attachments/assets/75f41498-49c5-40f2-86ad-b46dfbc1d809)

## 功能特性

### 核心功能
-  **微信扫码登录** - 安全便捷的设备绑定
-  **实时消息推送** - WebSocket 长连接，毫秒级推送
-  **桌面通知** - 原生系统通知，支持点击跳转
-  **声音提醒** - 可自定义的消息提示音
-  **历史消息** - 近七天消息记录，支持分页加载

### 系统集成
-  **系统托盘** - 单击/双击打开主界面，右键快捷菜单
-  **开机自启** - 可选择开机自动启动
-  **窗口管理** - 最小化到托盘，单实例运行
-  **设置同步** - 主进程与渲染进程设置实时同步

---

##  运行环境

- **Node.js** 18+ 
- **操作系统** Windows 10/11
- **网络环境** 需要访问 wxpusher.zjiecode.com

---

##  快速开始

### 1. 克隆项目
```bash
git clone https://github.com/likesrt/wxpusher-desktop.git
cd wxpusher-desktop
```

### 2. 安装依赖
```bash
# 使用 yarn (推荐)
yarn install

# 或使用 npm
npm install
```

### 3. 开发运行
```bash
# 使用 yarn
yarn start

# 或使用 npm
npm start
```

应用启动后将显示登录界面，使用微信扫描二维码完成设备绑定。

---

##  打包发布

### 开发测试打包
```bash
# 创建未打包的应用（用于测试）
yarn pack
# 或
npm run pack
```

### 生产环境打包
```bash
# 创建安装包和便携版
yarn dist
# 或
npm run dist
```

打包结果位于 `dist/` 目录：
- **Windows**: `WxPusher-Desktop Setup 1.0.1.exe` (安装包)
- **Windows**: `WxPusher-Desktop 1.0.1.exe` (便携版)

---

## 📁 项目结构

```
wxpusher-desktop/
├── package.json                    # 项目配置和依赖
├── README.md                       # 项目说明文档
├── src/                            # 源代码目录
│   ├── main/                       # 主进程模块
│   │   ├── main.js                 # 应用入口点
│   │   ├── window-manager.js       # 窗口管理
│   │   ├── tray-manager.js         # 托盘管理
│   │   ├── menu-manager.js         # 菜单管理
│   │   ├── settings-manager.js     # 设置管理
│   │   └── ipc-handler.js          # IPC通信处理
│   ├── preload/                    # 预加载脚本
│   │   └── preload.js              # 安全桥接脚本
│   ├── renderer/                   # 渲染进程文件
│   │   ├── index.html              # 主界面模板
│   │   ├── styles/                 # 样式文件
│   │   │   └── main.css            # 主样式表
│   │   └── scripts/                # JavaScript模块
│   │       ├── config.js           # 配置管理
│   │       ├── storage-manager.js  # 存储管理
│   │       ├── api-manager.js      # API调用
│   │       ├── websocket-manager.js # WebSocket管理
│   │       ├── ui-manager.js       # UI管理
│   │       ├── settings-manager.js # 设置管理
│   │       ├── notification-manager.js # 通知管理
│   │       ├── message-manager.js  # 消息管理
│   │       ├── login-manager.js    # 登录管理
│   │       └── main.js             # 渲染进程入口
│   ├── assets/                     # 静态资源
│   │   ├── icons/                  # 应用图标
│   │   │   ├── wxpusher_32x32.ico
│   │   │   └── wxpusher_256x256.ico
│   │   └── sounds/                 # 音频文件
│   │       └── breeze.mp3          # 通知提示音
│   └── utils/                      # 工具模块
│       └── app-config.js           # 应用配置
└── dist/                           # 构建输出目录
```

---

## ⚙️ 配置说明

### 应用设置
- **开机启动**: 通过托盘菜单或应用菜单切换
- **声音提醒**: 新消息播放提示音
- **桌面通知**: 后台时显示系统通知
- **缓存清理**: 清除登录状态和本地数据

### 开发配置
- **开发者工具**: `Ctrl+Shift+I` 或菜单栏 → 帮助 → 开发者工具
- **应用刷新**: `Ctrl+R` 或菜单栏 → 设置 → 刷新
- **环境变量**: 设置 `NODE_ENV=development` 自动开启开发者工具

---

## 🔧 常见问题

### 功能问题
**Q: 消息通知不显示？**
A: 请检查系统通知权限，确保允许应用显示通知。Windows 10/11 可在设置 → 系统 → 通知中配置。

**Q: 扫码登录失败？**
A: 请检查网络连接，确保能正常访问 wxpusher.zjiecode.com。也可以检查 WxPusher 账号状态。

**Q: 开机自启不生效？**
A: 某些系统需要手动授权开机启动权限。可在任务管理器 → 启动 中查看应用状态。

**Q: 应用无法正常启动？**
A: 请确保 Node.js 版本 ≥ 18，删除 `node_modules` 目录后重新安装依赖。

### 开发问题
**Q: 如何调试渲染进程？**
A: 启动应用后按 `Ctrl+Shift+I` 打开开发者工具，或设置环境变量 `NODE_ENV=development`。

**Q: 如何修改配置？**
A: 修改 `src/renderer/scripts/config.js` 中的配置项，或 `src/utils/app-config.js` 中的应用配置。

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---



---

## 🔗 相关链接

- [WxPusher 官网](https://wxpusher.zjiecode.com)
- [WxPusher API 文档](https://wxpusher.zjiecode.com/docs/)
- [Electron 官方文档](https://www.electronjs.org/docs)
- [项目 GitHub 仓库](https://github.com/likesrt/wxpusher-desktop)

---

## 💖 致谢

感谢 [WxPusher](https://wxpusher.zjiecode.com) 提供的优秀推送服务！