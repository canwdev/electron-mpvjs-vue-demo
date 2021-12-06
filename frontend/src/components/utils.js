/**
 * 输出 时:分:秒
 * @param {number} ms 毫秒
 * @returns {string}
 */
export function timeToHMS(ms) {
  const h = parseInt(ms / (60 * 60)).toString().padStart(2, '0') //精确小时，用去余
  const m = parseInt((ms / 60) % 60).toString().padStart(2, '0') //剩余分钟就是用1小时等于60分钟进行趣余
  const s = parseInt(ms % 60).toString().padStart(2, '0')
  return h + ':' + m + ':' + s
}
