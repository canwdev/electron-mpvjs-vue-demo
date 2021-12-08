<template>
  <div
    class="mpv-player"
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
    <div
      v-show="isPlaying"
      class="play-cover"
      @click="pause"
    ></div>

    <div v-if="debug" class="debug-wrap">
      <div>src: {{ src }}</div>
      <button @click="logInfo">Log</button>
    </div>


    <embed
      class="player-canvas"
      ref="mvpEmbedRef"
      type="application/x-mpvjs"
    />

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
          <span class="time-info time-current">{{ timeToHMS(mCurrent) }}</span><span
          class="split-line _grey">/</span>
          <span class="time-info time-duration _grey">{{ timeToHMS(duration) }}</span>
        </div>

        <div class="control-item actions-right">
          <div v-if="rateList" class="volume-toggle-wrap">
            <div class="volume-toggle-box">
              <button
                v-for="val in rateList"
                :key="val"
                :class="{active: currentRate === val}"
                @click="setRate(val)"
              >{{ val }}</button>
            </div>
            <button @click="toggleVolume">{{currentRate}}x</button>
          </div>

          <div class="volume-toggle-wrap">
            <div class="volume-toggle-box">
              <SeekBar
                :value="volume"
                @input="volumeChange"
                @change="volumeChange"
                :max="100"
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
import SeekBar from './SeekBar'
import screenfull from 'screenfull';
import Mpv from './mpv'

function timeToHMS(ms) {
  const h = parseInt(ms / (60 * 60)).toString().padStart(2, '0') //精确小时，用去余
  const m = parseInt((ms / 60) % 60).toString().padStart(2, '0') //剩余分钟就是用1小时等于60分钟进行趣余
  const s = parseInt(ms % 60).toString().padStart(2, '0')
  return h + ':' + m + ':' + s
}

let timer = null

export default {
  name: 'MpvPlayer',
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
    },
    rateList: {
      type: Array,
      default: () => [2, 1.75, 1.5, 1.25, 1, 0.5]
    },
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
      notSupport: false,
      currentRate: 1,
      ended: false
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
        this.mCurrent = val
      }
    },
  },
  mounted() {
    screenfull.on('error', event => {
      console.error('Failed to enable fullscreen', event)
    })
    screenfull.onchange(() => {
      this.isFullscreen = screenfull.isFullscreen
    })

    try {
      // if (!electronAPI.process || !electronAPI.process.env['VLC_PLUGIN_PATH']) {
      //   this.notSupport = true
      //   return
      // }
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
      const element = this.$refs.mvpEmbedRef
      this.player = new Mpv(element)
      element.addEventListener('message', this.handlePlayerMessage)
    },
    handlePlayerMessage(event) {
      const {type, data} = event.data
      if (type === 'ready') {
        this.updateSrc(this.src)
        this.player.playerReady()
      } else if (type === 'property_change') {
        // this.debugLog(data)
        const {name, value} = data
        if (name === 'duration') {
          this.duration = value
        } else if (name === 'pause') {
          if (!this.isSeeking) {
            this.isPlaying = !value
          }
        } else if (name === 'volume') {
          this.volume = value
        } else if (name === 'options/speed') {
          this.currentRate = value
        } else if (name === 'time-pos') {
          if (!this.isSeeking) {
            this.current = value
          }
        } else if (name === 'eof-reached') {
          // 到达文件末尾
          if (this.loop && value) {
            this.player.seek(0)
            this.play()
          }
          this.ended = value
        } else if (name === 'filename') {
          this.debugLog('SET_FILENAME', value)
        } else {
          this.debugLog(data)
        }
      } else {
        this.debugLog(event.data)
      }

    },
    updateSrc(src) {
      this.cleanupPlayer()
      if (!src) {
        return
      }
      this.player.loadFile(this.src)
      if (this.autoplay) {
        this.play()
      }
      this.showControl()
    },
    cleanupPlayer(isClose) {
      if (this.player) {
        if (isClose) {
          const element = this.$refs.mvpEmbedRef
          element.removeEventListener('message', this.handlePlayerMessage)
        } else {
          this.stop()
        }
      }
    },
    play() {
      if (this.ended) {
        this.player.seek(0)
      }
      this.player.goPlay(true)
    },
    pause() {
      this.player.goPlay(false)
    },
    togglePause() {
      this.player.goPlay(!this.isPlaying)
    },
    stop() {
      this.player.stop()
    },
    setRate(val) {
      console.log(val)
      this.player.setSpeed(val)
    },
    logInfo() {
      console.info('mvpEmbedRef', this.$refs.mvpEmbedRef)
      console.info('player', this.player)
    },
    progressSeeking(value) {
      // this.debugLog('progressSeeking', value)
      this.isSeeking = true
      this.mCurrent = Number(value)
    },
    progressChange(value) {
      value = Number(value)
      // this.debugLog('progressChange', value)
      this.player.seek(value)
      setTimeout(() => {
        this.isSeeking = false
      }, 100)
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
      this.player.setVolume(Number(value))
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

.mpv-player {
  $darkBg: rgba(0, 0, 0, 0.38);
  display: flex;
  position: relative;
  user-select: none;

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

  .player-canvas {
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

          .active {
            color: red;
          }
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
