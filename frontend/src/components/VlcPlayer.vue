<template>
  <div
    class="vlc-player"
    :class="{'_fullscreen': isFullscreen, 'hide-cursor': !isShowControls}"
    @mousemove="handleMouseMove"
  >
    <transition name="fade">
      <div
        v-if="showShade && src"
        v-show="!isPlaying"
        class="play-cover"
        @click="play"
      >
        <div class="icon-wrap" :class="{'cursor-pointer': !isPlaying}">
          <span class="iconfont">▶</span>
        </div>
      </div>
    </transition>

    <div v-if="debug" class="debug-wrap">
      <div>src: {{ src }}</div>
      <button @click="logInfo">Log</button>
    </div>
    <canvas
      ref="vlcCanvas"
      @click="togglePause"
    ></canvas>

    <div v-if="notSupport" class="check-failed">
      <span>Current electron client not support</span>
    </div>

    <transition name="fade">
      <div v-if="isShowControls && controls" class="control-wrap">
        <div class="control-item actions-left">
          <button @click="isPlaying ? pause() : play()">
            {{ isPlaying ? 'Pause' : 'Play' }}
          </button>
        </div>

        <SeekBar
          :value="mCurrent"
          :max="duration"
          @input="progressSeeking"
          @change="progressChange"
          class="control-item progress-bar"
        />

        <div class="control-item time-info-wrap">
          <span class="time-info time-current">{{ timeToHMS(mCurrent / 1000) }}</span><span class="split-line _grey">/</span>
          <span class="time-info time-duration _grey">{{ timeToHMS(duration / 1000) }}</span>
        </div>

        <div class="control-item actions-right">
          <div class="volume-toggle-wrap">
            <div class="volume-toggle-box">
              <SeekBar
                :value="volume"
                @input="volumeChange"
                @change="volumeChange"
                :max="200"
              />
            </div>
            <button @click="toggleVolume">{{ volume > 0 ? 'Vol.' : 'Mute' }}</button>
          </div>
          <button @click="toggleFullscreen">{{ isFullscreen ? 'Exit' : 'Ful.' }}</button>
        </div>
      </div>
    </transition>

  </div>
</template>

<script>
const {electronAPI} = window
import webglVideoRender from 'webgl-video-renderer'
import SeekBar from '@/components/SeekBar'
import screenfull from 'screenfull';

function resetGl(gl) {
  var numTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  for (var unit = 0; unit < numTextureUnits; ++unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.deleteTexture(gl.y.texture)
  gl.deleteTexture(gl.u.texture)
  gl.deleteTexture(gl.v.texture)
}

function timeToHMS(ms) {
  const h = parseInt(ms / (60 * 60)).toString().padStart(2, '0') //精确小时，用去余
  const m = parseInt((ms / 60) % 60).toString().padStart(2, '0') //剩余分钟就是用1小时等于60分钟进行趣余
  const s = parseInt(ms % 60).toString().padStart(2, '0')
  return h + ':' + m + ':' + s
}

const webChimera = electronAPI.require('webchimera.js')

let timer = null

export default {
  name: 'VlcPlayer',
  components: {
    SeekBar
  },
  props: {
    src: {
      type: String,
      default: null
    },
    // 暂停展示按钮
    showShade: {
      type: Boolean,
      default: false
    },
    autoplay: {
      type: Boolean,
      default: false
    },
    loop: {
      type: Boolean,
      default: false
    },
    controls: {
      type: Boolean,
      default: true
    },
    persistControls: {
      type: Boolean,
      default: false
    },
    debug: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isPlaying: false,
      isSeeking: false,
      isFullscreen: false,
      isShowControls: false,
      duration: 0,
      current: 0,
      mCurrent: 0,
      volume: 0,
      notSupport: false
    }
  },
  watch: {
    src: {
      handler(val) {
        this.updateSrc(val)
      }
    },
    current(val) {
      if (!this.isSeeking) {
        this.mCurrent = Math.min(this.duration, val)
      }
    },
    loop(val) {
      if (this.player) {
        this.setPlaylistLoop(val)
      }
    }
  },
  computed: {},
  mounted() {
    screenfull.on('error', event => {
      console.error('Failed to enable fullscreen', event)
    })
    screenfull.onchange(() => {
      this.isFullscreen = screenfull.isFullscreen
    })

    try {
      if (!electronAPI.process || !electronAPI.process.env['VLC_PLUGIN_PATH']) {
        this.notSupport = true
        return
      }
    } catch (e) {
      console.error(e)
      this.notSupport = true
    }
    this.initPlayer()
  },
  beforeDestroy() {
    this.cleanupPlayer(true)
  },
  methods: {
    timeToHMS,

    handleMouseMove() {
      if (!this.controls) return
      this.showControl()
    },
    showControl() {
      this.isShowControls = true
      clearTimeout(timer)
      if (this.persistControls) {
        return
      }
      timer = setTimeout(() => {
        this.isShowControls = false
      }, 2000)
    },
    debugLog(...args) {
      if (!this.debug) {
        return
      }
      console.info(...args)
    },
    initPlayer() {
      const renderContext = webglVideoRender.setupCanvas(this.$refs.vlcCanvas)
      this.renderContext = renderContext
      const player = webChimera.createPlayer()
      this.player = player
      this.debugLog('initPlayer', {
        player,
        renderContext
      })
      // player.onLogMessage = (level, message, format) => {
      //   this.debugLog('onLogMessage', message)
      // }
      this.setPlaylistLoop(this.loop)
      this.volume = player.volume
      player.onFrameReady = (frame) => {
        // console.log('onFrameReady', frame)
        // TODO: 重复调用？
        renderContext.render(frame, frame.width, frame.height, frame.uOffset, frame.vOffset)
      }
      player.onPlaying = () => {
        this.debugLog('onPlaying')
        this.isPlaying = true
      }
      player.onPaused = () => {
        this.debugLog('onPaused')
        this.isPlaying = false
      }
      player.onStopped = () => {
        this.debugLog('onStopped')
        this.isPlaying = false
      }
      player.onTimeChanged = (time) => {
        this.debugLog('onTimeChanged', time)
        this.current = time
      }
      player.onLengthChanged = (time) => {
        this.debugLog('onLengthChanged', time)
        this.duration = time
      }
      player.onEncounteredError = (err) => {
        console.error('onEncounteredError', err)
        this.$emit('error', err)
        this.setPlaylistLoop(false)
      }
      // if (this.debug) {
      //   player.onLogMessage = (level, message, format) => {
      //     this.debugLog('onLogMessage', level, message, format)
      //   }
      // }
      this.updateSrc(this.src)
    },
    updateSrc(src) {
      this.cleanupPlayer()
      if (!src) {
        return
      }
      // this.player.play(src)
      this.player.playlist.clear()
      this.player.playlist.add(src)
      if (this.autoplay) {
        this.play()
      }
      this.showControl()
    },
    cleanupPlayer(isClose) {
      if (this.player) {
        this.player.pause()
        this.isPlaying = false
        this.duration = 0
        this.current = 0
        this.mCurrent = 0
        this.player.stop()
        if (isClose) {
          this.player.close()
          this.player = null
          // TODO: 内存泄露无法解决
          console.log('cleanupPlayer renderContext', this.renderContext)
          // resetGl(this.renderContext.gl)
          this.renderContext = null
        }
      }

      this.$nextTick(() => {
        if (this.renderContext) {
          this.renderContext.fillBlack()
        }
      })
    },
    setPlaylistLoop(val) {
      if (val) {
        this.player.playlist.mode = this.player.playlist.Loop
      } else {
        this.player.playlist.mode = this.player.playlist.Normal
      }
    },
    play() {
      this.player.playlist.play()
    },
    pause() {
      this.player.playlist.pause()
    },
    togglePause() {
      this.player.playlist.togglePause()
    },
    stop() {
      this.player.playlist.stop()
    },
    logInfo() {
      console.info('renderContext', this.renderContext)
      console.info('player', this.player)
    },
    progressSeeking(value) {
      this.debugLog('progressSeeking', value)
      this.isSeeking = true
      this.mCurrent = Number(value)
    },
    progressChange(value) {
      value = Number(value)
      this.debugLog('progressChange', value)
      this.isSeeking = false
      this.player.time = value
    },
    toggleVolume() {
      if (this.volume > 0) {
        this._previousVolume = this.volume
        this.volumeChange(0)
      } else {
        this.volumeChange(this._previousVolume || 100)
      }
    },
    volumeChange(value) {
      this.volume = this.player.volume = Number(value)
    },
    toggleFullscreen() {
      if (screenfull.isEnabled) {
        if (!this.isFullscreen) {
          screenfull.request()
        } else {
          screenfull.exit()
        }
      } else {
        alert('当前浏览器不支持全屏')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

.vlc-player {
  $darkBg: rgba(0, 0, 0, 0.38);
  display: flex;
  position: relative;

  &.hide-cursor {
    * {
      cursor: none;
    }
  }

  .check-failed {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    background: black;
  }

  &._fullscreen {
    position: fixed;
    z-index: 1000;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100%;
    width: 100%;
  }

  .play-cover {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    background: rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;

    .icon-wrap {
      border: 2px solid white;
      border-radius: 50%;
      padding: 10px;
      width: 70px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      cursor: pointer;

      .iconfont {
        font-size: 56px;
        transform: translateX(7px);
      }
    }

  }

  canvas {
    width: 100%;
    height: auto;
    object-fit: contain;
    background: black;
  }

  .debug-wrap {
    position: absolute;
    top: 0;
    left: 0;
    background: $darkBg;
    padding: 10px;
    color: white;
    font-size: 12px;
    font-family: 'Consolas', monospace;
    z-index: 100;
  }

  .control-wrap {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10;
    background: $darkBg;
    color: white;
    display: flex;
    align-items: center;
    height: 35px;
    font-size: 12px;

    .control-item {
      height: 100%;
      display: flex;
      align-items: center;
    }

    .actions-left {
      padding-left: 10px;

      button {
        width: 70px;
      }
    }

    .progress-bar {
      flex: 1;
      padding-left: 10px;
    }

    .time-info-wrap {
      display: flex;
      font-size: 12px;
      padding-left: 20px;
      padding-right: 5px;

      .time-info {
        text-align: center;
      }

      .split-line {
        padding: 5px;
      }

      ._grey {
        opacity: .8;
      }

    }

    .actions-right {
      padding-left: 5px;
      padding-right: 10px;

      .volume-toggle-wrap {
        position: relative;

        .volume-toggle-box {
          position: absolute;
          right: 0;
          top: -100%;
          width: 100px;
          visibility: hidden;
          opacity: 0;
          background: $darkBg;
          padding: 0 5px;
        }

        &:hover {
          .volume-toggle-box {
            visibility: visible;
            opacity: 1;
          }
        }
      }
    }
  }
}
</style>
