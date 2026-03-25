
  # ChronoFly

  This is a code bundle for ChronoFly. The original project is available at https://www.figma.com/design/qurF0iftpe1P9PgxvB3pdH/ChronoFly.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## 手机访问（局域网）

  本机 `http://localhost:5173` **只有电脑自己能打开**。手机必须用 **同一 Wi‑Fi 下电脑的局域网 IP**，例如：

  1. 终端执行 `npm run dev` 后，看 Vite 输出的 **`Network`** 一行，形如 `http://192.168.x.x:5173`。
  2. 在手机 Safari/Chrome 里输入 **这个地址**（不要用 `localhost`）。
  3. 若打不开：检查 **电脑与手机是否同一 Wi‑Fi**；macOS **系统设置 → 网络 → 防火墙** 是否拦截 Node；公司/校园网可能禁止设备互访。

  也可在终端查 IP：`ipconfig getifaddr en0`（Wi‑Fi）或 `ifconfig | grep inet`。

  ## 磨砂 / 玻璃效果在 Safari、Chrome 看不到

  - **iOS / macOS**：若开启 **设置 → 辅助功能 → 显示与文字大小 → 降低透明度**（或 **Reduce Transparency**），系统会**关闭** `backdrop-filter` 磨砂，界面会变成半透明平涂。
  - 请用 **无痕窗口** 或换一台未开该选项的设备再试。
  - 若已部署到线上，请用 **HTTPS** 地址测试（部分环境对混合内容更敏感）。
