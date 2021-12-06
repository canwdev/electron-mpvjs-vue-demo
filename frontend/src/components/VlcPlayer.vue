<template>
  <div class="vlc-player" :class="{'_fullscreen': isFullscreen}">
    <div v-if="debug" class="debug-wrap">
      <div>src: {{ src }}</div>
      <button @click="logInfo">Log</button>
    </div>
    <canvas ref="vlcCanvas"></canvas>

    <div v-if="controls && (src || debug)" class="control-wrap">
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
        <span class="time-info time-current">{{ timeToHMS(mCurrent / 1000) }}</span>/
        <span class="time-info time-duration">{{ timeToHMS(duration / 1000) }}</span>
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
  </div>
</template>

<script>
const {electronAPI} = window
import webglVideoRender from 'webgl-video-renderer'
import SeekBar from '@/components/SeekBar'
import {timeToHMS} from './utils'
import screenfull from 'screenfull';


const webChimera = electronAPI.require('webchimera.js')

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
      duration: 0,
      current: 0,
      mCurrent: 0,
      volume: 0,
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
    this.initPlayer()
    screenfull.on('error', event => {
      console.error('Failed to enable fullscreen', event);
    })
    screenfull.onchange(() => {
      this.isFullscreen = screenfull.isFullscreen
    })
  },
  beforeDestroy() {
    this.cleanupPlayer(true)
  },
  methods: {
    timeToHMS,
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
          screenfull.request();
        } else {
          screenfull.exit();
        }
      } else {
        alert('当前浏览器不支持全屏')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.vlc-player {
  display: flex;
  position: relative;

  &._fullscreen {
    position: fixed;
    z-index: 100;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100%;
    width: 100%;
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
    background: rgba(0, 0, 0, 0.38);
    padding: 10px;
    color: white;
    font-size: 12px;
    font-family: 'Consolas', monospace;
  }

  .control-wrap {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.38);
    color: white;
    display: flex;
    align-items: center;
    min-height: 40px;
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

      .time-info {
        text-align: center;
        padding: 10px;
      }

    }

    .actions-right {
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
          background: rgba(0, 0, 0, 0.38);
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
