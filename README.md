# Ricky Pixel Mod ✦

一只住在 Claude Code 里的像素猫。Ricky 会跟着 Claude 的状态变表情：思考时闭眼、额头星星发光，调用工具时扇翅膀撒星尘，完成时眯眼笑，出错时炸毛。

A pixel-art cat companion for Claude Code. Ricky reacts to what Claude is doing — thinking, calling tools, finishing, or hitting an error.

![pane](docs/pane.png)

## 功能 / Features

- **侧边面板**：紫色星空，星星闪烁，Ricky 在中间飞。星空下是实用看板：
  - **✦ 任务**：Claude 列的 todo 和进度条，进行中的那条显示已用时
  - **✦ 子 agent**：运行中的子 agent，显示类型、用时、调用次数和当前动作
  - **✦ 最近动作**：最近 6 次工具调用和成功 / 失败状态
  - **✦ 改动文件**：本次会话改过的文件
- **输入框上方横栏**：24×24 的小 Ricky，Claude 工作时在横栏里来回飞
- **紫金主题**：加载提示变成「Ricky 摘星中 ✦」，回合结束显示「✦ Ricky 陪你施法了 12s」

![band](docs/band.png)

## 安装 / Install

需要 Claude Code **2.1.287 或更新版本**（支持 mods），终端需要支持真彩色。

```bash
git clone https://github.com/muxia23/ricky-pixel-mod ~/ricky-pixel-mod
claude --plugin-dir ~/ricky-pixel-mod
```

想每次启动都加载，在 `~/.claude/settings.json` 里加：

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/ricky-pixel-mod" } }
```

## 使用 / Usage

- `/ricky` 打开面板
- 面板要停靠在右侧，需要全屏渲染（`/tui fullscreen`）且终端宽度 ≥ 110 列；否则面板显示在输入框上方
- 横栏可以用 `ctrl+x ctrl+a` 折叠
- `/clear` 会清空看板

## 改造型 / Editing the sprites

像素稿在 `tools/sprites.py`，每帧只画左半边，自动镜像。改完运行：

```bash
python3 tools/sprites.py   # 需要 Pillow；生成 hooks/sprites.ts 和 docs/ 预览图
```

## 开发 / Development

```bash
claude plugin validate .
claude plugin test .
```

## 授权与声明 / License & disclaimer

- **代码**：MIT License。
- **Ricky 的形象**（`tools/sprites.py`、`hooks/sprites.ts` 中的像素数据和 `docs/` 中的图片）：灵感来自 VALORANT 的一款皮肤角色，属于同人作品，**不在 MIT 授权范围内**，仅可按 Riot Games 粉丝内容政策非商业使用。详见 [LICENSE](LICENSE)。

Ricky Pixel Mod was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.
