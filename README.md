# WxPusher 微信推送 Electron 桌面版

> 基于 Electron 的 WxPusher 消息推送客户端，支持扫码登录、消息提醒、桌面通知、托盘驻留等功能。

---

## 功能简介

- 微信扫码登录设备，实时接收 WxPusher 推送
- 消息声音提醒、桌面通知（可开关）
- 历史消息浏览与加载
- 托盘驻留，最小化到托盘
- 可选开机自启（通过托盘菜单切换）

---

## 运行环境

- Node.js 18+
- Windows

---

## 安装与运行

1. **克隆或下载本项目**
2. **安装依赖**

   ```bash
   yarn install
   ```

3. **本地开发启动**

   ```bash
   yarn start
   ```

   启动后会弹出桌面窗口。

---

## 打包发布

1. **安装 electron-builder**（已在依赖中）

   ```bash
   yarn install
   ```

2. **打包应用（根据你的系统）**

   ```bash
   yarn dist
   ```

   打包结果会在 `dist/` 目录下，例如：

   - Windows: `.exe` 安装包 或 `.setup.exe`


---

## 项目结构

```
wxpusher-desktop/
├── main.js              # Electron 主进程
├── index.html           # 渲染进程页面（主界面）
├── preload.js           # 预加载脚本
├── favicon.ico          # 应用图标
├── package.json         # 项目配置
├── README.md            # 本说明文件
└── dist/                # 打包输出目录
```



## 常见问题

- **消息通知不弹出？**
  请确保系统允许该应用的通知权限。
- **扫码无法绑定？**
  请检查网络或 WxPusher 账号状态。
- **自动启动无效？**
  某些系统需要手动授权开机自启。


