# Quiet Classroom

一个用于课堂自习秩序管理的网页程序：通过麦克风检测环境音量，安静时小鱼睡觉并积累分数，嘈杂时小鱼惊醒并扣分。

## 本地运行

```bash
npm install
npm run dev
```

打开终端显示的本地地址，例如：

```bash
http://localhost:5173
```

## 部署到 Vercel

1. 把整个项目文件夹上传到 GitHub。
2. 打开 Vercel，选择 Add New Project。
3. 导入该 GitHub 仓库。
4. Framework Preset 选择 Vite。
5. Build Command 使用 `npm run build`。
6. Output Directory 使用 `dist`。
7. 点击 Deploy。

部署成功后，Vercel 会提供 HTTPS 链接。麦克风权限需要 HTTPS，因此建议使用 Vercel 链接测试正式功能。

## 注意

如果用户拒绝麦克风权限，程序会进入预览模式，仍然可以测试界面、计分和“测试惊醒”按钮。
