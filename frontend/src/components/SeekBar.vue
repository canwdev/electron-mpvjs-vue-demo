<template>
  <div class="seekbar-wrap">
    <input
      ref="seekBar"
      type="range"
      :min="min"
      :max="max"
      :value="value"
      class="seekbar-inner"
      v-bind="$attrs"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @change="handleChange"
    >
  </div>
</template>

<script>
export default {
  name: 'TkSeekbar',
  props: {
    min: {
      type: [Number, String],
      default: 0
    },
    max: {
      type: [Number, String],
      default: 100
    },
    value: {
      type: [Number, String],
      default: 100
    },
  },
  computed: {
    progress() {
      return (this.value / this.max * 100).toFixed(1)
    }
  },
  methods: {
    handleInput(event) {
      this.$emit('input', event.target.value)
    },
    handleFocus(event) {
      this.$emit('focus', event)
    },
    handleBlur(event) {
      this.$emit('blur', event)
    },
    handleChange(event) {
      this.$emit('change', event.target.value)
    }
  }
}
</script>

<style lang="scss" scoped>
.seekbar-wrap {
  .seekbar-inner {
    height: 100%;
    width: 100%;
  }
}
</style>
