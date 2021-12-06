<template>
  <div class="player-test">
    <div class="demo-control">
      <div>
        <label>
          <input type="checkbox" v-model="isEnable">
          isEnable
        </label>
        <label>
          <input type="checkbox" v-model="autoplay">
          autoplay
        </label>
        <label>
          <input type="checkbox" v-model="loop">
          loop
        </label>
        <label>
          <input type="checkbox" v-model="debug">
          debug
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


    <VlcPlayer
      v-if="isEnable"
      :src="videoSrc"
      :autoplay="autoplay"
      :loop="loop"
      :debug="debug"
    ></VlcPlayer>
  </div>
</template>

<script>
import VlcPlayer from '@/components/VlcPlayer'

export default {
  name: 'PlayerTest',
  components: {
    VlcPlayer
  },
  data() {
    return {
      videoSrc: null,
      formSrc: '',
      isEnable: true,
      autoplay: true,
      loop: true,
      debug: true,
      videoList: [
        'http://127.0.0.1:8080/WebUnsupported/test.avi',
        'http://127.0.0.1:8080/WebUnsupported/video-15s.avi',
        'http://127.0.0.1:8080/WebUnsupported/HDRSample.mkv',
        'http://127.0.0.1:8080/WebUnsupported/SDRSample.mkv',
        'http://127.0.0.1:8080/WebUnsupported/test.mkv',
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
