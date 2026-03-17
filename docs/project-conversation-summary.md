# ChronoFly 项目对话摘要

> 保存于项目中的对话与决策记录，便于后续设计与开发参考。

---

## 项目概况

- **项目名**：ChronoFly（晨间仪式规划 / 航班倒计时）
- **技术栈**：React + Vite，Tailwind，Framer Motion，date-fns，react-day-picker
- **线上地址**：https://chronoflyforsuzionly.vercel.app/
- **仓库**：GitHub `suzinotsuzie/ChronoFly`

---

## 已实现功能（对话中涉及）

- 颗粒磨砂 + 莫奈睡莲风格背景
- 闹钟区域装饰（Twin Pads 等 SVG，不遮挡文字）
- GO / now 音效（风声、水滴风）+ GO 震动与轻抖
- 头像与昵称：本地上传、圆形头像、标题随昵称更新、默认头像 `public/avatar.png`
- 编辑资料弹窗：英文、与 The Journey 一致的标签样式，EDIT PROFILE / MY RITUAL 全大写
- 航班：日期 + 航班号并排输入，自定义日期选择器（英文、主题一致、Portal 浮层、左对齐头像栏、保持屏幕内）
- 航班数据：AviationStack API 代理（本地 Vite proxy + 线上 Vercel `api/flight.js`），支持 `flight_date` 查询
- GO 按钮：底色与字体多次微调（最终底色 0.2 透明度、字体 C.rosy）
- 部署：Vercel，`vercel.json` 配置 outputDirectory: dist、rewrites、installCommand

---

## 部署与配置要点

- **Vercel 项目**：可保留一个（如 chronoflyforsuzionly），其余重复项目可删除
- **Output Directory**：在 `vercel.json` 中已设为 `dist`；若 404，在 Vercel Dashboard → Settings → General → Build 相关里确认
- **航班数据准确**：在 Vercel 项目 Settings → Environment Variables 添加 `AVIATIONSTACK_KEY`，然后 Redeploy

---

## 手机端访问

- 建议在系统浏览器或 Chrome/Safari 中直接输入链接打开，避免在微信内置浏览器中卡住
- 国内访问 Vercel 可能较慢，需多等或换网络

---

## 相关文件

- 主应用：`src/app/App.tsx`
- 主题与背景：`src/styles/theme.css`
- 航班 API 代理（Vercel）：`api/flight.js`
- 部署配置：`vercel.json`
- 环境变量示例：`.env.example`（含 `VITE_AVIATIONSTACK_KEY` 说明）

---

*此文件由对话内容整理，供后续「新玩法」设计与开发时对照使用。*
