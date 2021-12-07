<template>
  <div class="player-test">
    <div class="demo-control">
      <div>
        <label>
          <input v-model="isEnable" type="checkbox">
          isEnable
        </label>
        <label>
          <input v-model="autoplay" type="checkbox">
          autoplay
        </label>
        <label>
          <input v-model="loop" type="checkbox">
          loop
        </label>
        <label>
          <input v-model="debug" type="checkbox">
          debug
        </label>
        <label>
          <input v-model="persistControls" type="checkbox">
          persistControls
        </label>
      </div>

      <form @submit.prevent="updateVideoSrc">
        <input v-model="formSrc" type="text">
        <button type="submit">Submit</button>
        <button type="button" @click="clearSrc">Clear</button>
      </form>

      <ul>
        <li
          v-for="(item) in videoList"
          :key="item"
        >
          <a href="javascript:"
             @click="selectDemoVideo(item)"
          >{{ item }}</a>
        </li>
      </ul>
    </div>


    <MpvPlayer
      v-if="isEnable"
      :src="videoSrc"
      :autoplay="autoplay"
      :loop="loop"
      :debug="debug"
      show-shade
      :persist-controls="persistControls"
    ></MpvPlayer>
  </div>
</template>

<script>
import MpvPlayer from '@/components/MpvPlayer'

export default {
  name: 'PlayerTest',
  components: {
    MpvPlayer
  },
  data() {
    return {
      videoSrc: null,
      formSrc: '',
      isEnable: true,
      autoplay: true,
      loop: true,
      debug: true,
      persistControls: true,
      videoList: [
        'http://127.0.0.1:8080/WebUnsupported/test.avi',
        'http://127.0.0.1:8080/WebUnsupported/video-15s.avi',
        'http://127.0.0.1:8080/WebUnsupported/HDRSample.mkv',
        'http://127.0.0.1:8080/WebUnsupported/SDRSample.mkv',
        'http://127.0.0.1:8080/WebUnsupported/test.mkv',
        'http://127.0.0.1:8080/WebUnsupported/example_tos.mkv',
      ]
    }
  },
  methods: {
    updateVideoSrc() {
      this.videoSrc = this.formSrc
    },
    clearSrc() {
      this.videoSrc = null
    },
    selectDemoVideo(val) {
      this.formSrc = val
      this.updateVideoSrc()
    }
  }
}
</script>

<style lang="scss" scoped>
.player-test {
  max-width: 800px;
  margin: 0 auto;
  padding: 50px 0;

  ::v-deep .player-canvas {
    min-height: 420px;
  }

  .demo-control {
    margin-bottom: 50px;

    form {
      display: flex;

      input {
        flex: 1;
      }
    }
  }


}
</style>
