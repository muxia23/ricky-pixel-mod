# Ricky Pixel Mod ✦

[简体中文](README.md) | **English**

A pixel-art cat that lives in Claude Code. Ricky reacts to what Claude is doing: eyes closed and forehead star glowing while it thinks, wings flapping and stardust trailing while it calls tools, a happy squint when a turn finishes, and bristling fur when something fails.

![Ricky in Claude Code](docs/hero-en.gif)

## Features

- **Side pane**: a twinkling purple night sky with Ricky flying in the middle. Under the sky sits a practical dashboard:
  - **✦ Tasks**: Claude's todo list with a progress bar; the item in progress shows how long it has been running
  - **✦ Subagents**: each running subagent with its type, elapsed time, call count and what it is doing right now
  - **✦ Recent**: the last 6 tool calls of the main thread, with › running, ✓ done, ✗ failed
  - **✦ Files changed**: every file edited or created this session

  Empty sections hide themselves.
- **Band above the prompt**: a 24×24 Ricky who flies back and forth while Claude works
- **Purple-gold theme**: the spinner reads "Ricky is stargazing…", and each turn ends with "✦ Ricky cast with you for 12s"
- **English or Chinese**: switch with the `language` option

## Moods

| Claude is… | Ricky |
| --- | --- |
| idle | hovers, slowly flapping, blinking now and then |
| thinking | eyes closed, forehead star glowing |
| calling tools | flaps fast and scatters stardust |
| done | happy squint |
| failing | wide eyes, bristling |

![frames](docs/frames-32.png)

## Install

Requires Claude Code **2.1.287 or newer** (mods support) and a truecolor terminal.

```bash
git clone https://github.com/muxia23/ricky-pixel-mod ~/ricky-pixel-mod
claude --plugin-dir ~/ricky-pixel-mod
```

To load it in every session, add this to `~/.claude/settings.json`:

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/ricky-pixel-mod" } }
```

## Usage

- `/ricky` opens the pane
- The pane docks on the right in fullscreen rendering (`/tui fullscreen`) at 110 columns or wider; otherwise it opens above the prompt
- Collapse the band with `ctrl+x ctrl+a`
- `/clear` empties the dashboard

## Options

Open `/config` and find **Language** under ricky-pixel-mod:

| Value | Words |
| --- | --- |
| `en` (default) | English |
| `zh` | 简体中文 |

Or set it in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "ricky-pixel-mod": { "options": { "language": "zh" } } } }
```

## Editing the sprites

Ricky is drawn in `tools/sprites.py`: each frame is drawn as its left half and mirrored. After editing, run:

```bash
python3 tools/sprites.py   # needs Pillow; writes hooks/sprites.ts and the docs/ previews
```

## Development

```bash
claude plugin validate .
claude plugin test .
```

## License & disclaimer

- **Code**: MIT License.
- **Ricky's design** (the pixel data in `tools/sprites.py` and `hooks/sprites.ts`, and the images in `docs/`): fan art inspired by a VALORANT skin character. It is **not** covered by the MIT License and may only be used non-commercially under Riot Games' fan content policy. See [LICENSE](LICENSE).

Ricky Pixel Mod was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.
