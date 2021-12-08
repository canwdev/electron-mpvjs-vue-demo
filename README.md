# Electron + Mpv.js + Vue Demo

![img](./screenshot.png)

- Electron 12.2.2
- Vue ^2.6.11

## Install Setup

1. get `mpvjs.node` from https://github.com/Kagami/mpv.js/releases
2. get `mpv-1.dll` from libmpv ([Windows Download](https://mpv.srsfckn.biz/mpv-dev-latest.7z))
3. put `mpvjs.node` and `mpv-1.dll` to `static/mpv.js/` folder

```
# Install dependencies
yarn
cd frontend
yarn

# Start frontend
dev:frontend

# Start electron
dev:electron
```
## Reference

- https://github.com/Kagami/mpv.js
- https://github.com/mchome/arclight
