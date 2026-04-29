# KiCaps — Futures Position Size Calculator

A fast, minimal desktop calculator for futures traders. Enter your stop loss, risk amount, and account balance — KiCaps instantly tells you how many contracts to trade and shows a full stop loss ladder so you can explore nearby setups.

---

## Features

- **Instant position sizing** — contracts calculated in real time as you type
- **Stop Loss Ladder** — scrollable table centered on your current stop loss, showing contracts and actual risk at every nearby level
- **Risk modes** — fixed dollar amount or % of account balance
- **Manual override** — tap +/− to adjust contracts up or down from the auto-calculated value, with a one-click reset to AUTO
- **Risk utilization bar** — visual bar showing how much of your risk budget the position uses
- **Multi-instrument** — ES, NQ, GC, 6E, 6B (Full Size) and MES, MNQ, MGC (Micro)
- **Watchlist** — star your favourite instruments for quick access, reorder freely
- **Dark / Light / System theme**
- **Persistent settings** — balance, risk, and instrument remembered across sessions (configurable)
- **Draggable window** with working minimize, maximize, and close controls

---

## Instruments

| Ticker | Name | Point Value |
|--------|------|-------------|
| ES | E-mini S&P 500 | $50/pt |
| NQ | E-mini Nasdaq | $20/pt |
| GC | Gold Futures | $10/pt |
| 6E | Euro FX | $12.50/pt |
| 6B | British Pound | $6.25/pt |
| MES | Micro S&P | $5/pt |
| MNQ | Micro Nasdaq | $2/pt |
| MGC | Micro Gold | $1/pt |

---

## Running from Source

**Requirements:** Node.js 18+

```bash
git clone https://github.com/Ledian63S/KiCaps.git
cd KiCaps
npm install
npm start
```

---

## Building the Windows App

```bash
npm install
npx electron-packager . KiCaps --platform=win32 --arch=x64 --icon=icon.ico --out=dist --overwrite --ignore="node_modules|\.git|dist|quanta-src"
```

The built app will be at `dist/KiCaps-win32-x64/KiCaps.exe`. No installer needed — just run `KiCaps.exe` directly.

> **Tip:** To create a desktop shortcut, right-click `KiCaps.exe` → Send to → Desktop (create shortcut).

---

## Tech Stack

- [Electron](https://www.electronjs.org/) — cross-platform desktop shell
- [React 18](https://react.dev/) — UI framework (bundled locally, works offline)
- [Babel Standalone](https://babeljs.io/) — in-browser JSX transform
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/) — monospace font

---

## License

MIT
