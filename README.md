# Tag Maestro

NovelAI 的标签管理面板。装上就能用，不用折腾。

[English](#english) | [中文](#中文)

---

## English

A userscript that sits on top of NovelAI's image generation page. It gives you a tag library, Danbooru/Safebooru search, and an AI prompt assistant — all in one draggable panel.

### What it does

- **Tag library** — save tags into categories, drag to reorder, one-click inject into the prompt box
- **Danbooru gallery** — browse, search, filter by rating, pull tags from any post
- **Safebooru lookup** — quick tag search with post counts and Chinese translations
- **AI assistant** — connects to Gemini or OpenAI-compatible APIs, generates NAI prompts from natural language descriptions. Supports Gemini 3.1 Pro thinking modes and image attachments
- **Bilingual** — full EN/ZH interface, with a 40k+ entry Danbooru tag translation dictionary
- **Autocomplete** — works in NAI's prompt textarea and inside the tag editor. Pulls from your local library + Danbooru's tag database

### Install

1. Get [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. Install the script from [Releases](https://github.com/Alks0/NovelAI-tag-manager/releases) or build it yourself
3. Open [NovelAI Image](https://novelai.net/image) — the panel shows up in the bottom-right corner

### Build from source

```bash
git clone https://github.com/Alks0/NovelAI-tag-manager.git
cd NovelAI-tag-manager
npm install
npm run build
# output: dist/novelai-tag-maestro.user.js
```

### Stack

SolidJS, TypeScript, Vite, [vite-plugin-monkey](https://github.com/nicepkg/vite-plugin-monkey)

### Credits

Tag translations from [Aaalice233/ComfyUI-Danbooru-Gallery](https://github.com/Aaalice233/ComfyUI-Danbooru-Gallery).

### License

MIT

---

## 中文

一个跑在 NovelAI 图像生成页面上的油猴脚本。给你一个标签库、Danbooru/Safebooru 搜索、和 AI 提示词助手——全塞在一个可拖拽面板里。

### 能干嘛

- **标签库** — 按分类保存标签，拖拽排序，一键注入到提示词框
- **Danbooru 画廊** — 浏览、搜索、按评级筛选，从任意帖子拉取标签
- **Safebooru 查询** — 快速标签搜索，带帖子数量和中文翻译
- **AI 助手** — 接 Gemini 或 OpenAI 兼容 API，用自然语言描述生成 NAI 提示词。支持 Gemini 3.1 Pro 思考模式和图片附件
- **双语** — 完整中英界面，内置 4 万+ 条 Danbooru 标签中文翻译词典
- **自动补全** — 在 NAI 提示词框和标签编辑器里都能用，从本地库 + Danbooru 标签数据库拉取

### 安装

1. 装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)
2. 从 [Releases](https://github.com/Alks0/NovelAI-tag-manager/releases) 安装脚本，或自己构建
3. 打开 [NovelAI 图像生成](https://novelai.net/image) — 面板出现在右下角

### 从源码构建

```bash
git clone https://github.com/Alks0/NovelAI-tag-manager.git
cd NovelAI-tag-manager
npm install
npm run build
# 输出: dist/novelai-tag-maestro.user.js
```

### 技术栈

SolidJS, TypeScript, Vite, [vite-plugin-monkey](https://github.com/nicepkg/vite-plugin-monkey)

### 致谢

标签翻译来自 [Aaalice233/ComfyUI-Danbooru-Gallery](https://github.com/Aaalice233/ComfyUI-Danbooru-Gallery)。

### 许可证

MIT
