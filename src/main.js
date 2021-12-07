const path = require('path')
const {
  isDev,
  getCorrectPath,
} = require('@canwdev/electron-utils')
const {app} = require('electron')
const httpServer = require('http-server/lib/http-server')
const portfinder = require('portfinder')
const wm = require('./utils/wm-instance')

let pluginPath = getCorrectPath(path.join(__dirname, '../'), 'static/mpv.js/mpvjs.node;application/x-mpvjs').split('\\').join('/')
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch('ignore-gpu-blacklist')
app.commandLine.appendSwitch('register-pepper-plugins', pluginPath)

let port = 8000 //默认端口
const host = '127.0.0.1'

let mainWindow

const createWindow = () => {
  mainWindow = wm.createWindow({
      width: 1250,
      height: 750,
      minWidth: 1250,
      minHeight: 750,
      icon: path.join(__dirname, '../build/256x256.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: false,
        webSecurity: false,
        plugins: true
      },
      customConfig: {
        isOpenDevTools: isDev,
        saveWindowStateName: 'mainWindow',
      }
    },
    process.env.ELECTRON_START_URL || `http://${host}:${port}`
  )

  /// keep listening on the did-finish-load event, when the mainWindow content has loaded
  mainWindow.webContents.on('did-finish-load', () => {
  })
}


app.on('ready', async () => {
  if (isDev) {
    createWindow()
    // require('vue-devtools').install()
  } else {
    startClientProd(getCorrectPath(path.join(__dirname, '../'), 'frontend/dist'))
  }
})

function startClientProd(publicPath) {
  console.info('starting client prod...', publicPath)

  portfinder.basePort = port
  portfinder.getPort(function (err, portfinder) {
    if (err) {
      createServer()
      throw new Error('端口扫描失败，请用管理员权限运行')
    } else {
      port = portfinder
      createServer(portfinder)
    }
  })

  function createServer() {
    const server = httpServer.createServer({
      proxy: `http://${host}:${port}?`,
      cache: -1,
      root: publicPath,
    })
    server.listen(port, host, createWindow)
  }
}
