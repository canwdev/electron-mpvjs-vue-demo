const pkg = require('../../package.json')
const ipcHelperRender = require('@canwdev/electron-utils/ipc/ipc-helper-render')
const wmPreload = require('@canwdev/electron-window-manager/preload')

const self = module.exports = {
  ...wmPreload,
  ...ipcHelperRender,
  pkg,
  require,
  process
}
