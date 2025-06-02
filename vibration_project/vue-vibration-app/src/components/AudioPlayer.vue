<template>
  <div class="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
    <h3 class="text-lg font-semibold text-white mb-4">音频处理与播放</h3>
    
    <!-- 音频文件选择 -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-white mb-1">选择音频文件</label>
      <input 
        ref="audioFileInput"
        type="file" 
        accept="audio/*" 
        @change="handleFileChange"
        class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-1 file:px-3 file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white file:rounded file:cursor-pointer hover:file:bg-blue-600"
      />
    </div>
    
    <!-- 音频信息显示 -->
    <div v-if="audioInfo" class="mb-4 p-3 bg-white/5 rounded-lg">
      <div class="text-sm text-gray-300 space-y-1">
        <div>文件: {{ audioInfo.filename }}</div>
        <div>时长: {{ audioInfo.duration?.toFixed(2) }}秒</div>
        <div>采样率: {{ audioInfo.sampleRate }}Hz</div>
        <div>声道数: {{ audioInfo.channels }}</div>
      </div>
    </div>
    
    <!-- 播放控制 -->
    <div class="flex gap-2 mb-4">
      <button 
        @click="processAudio"
        :disabled="!selectedFile || isProcessing"
        class="px-4 py-2 rounded-lg font-medium transition-all duration-200 border-none cursor-pointer bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isProcessing ? '处理中...' : '处理音频' }}
      </button>
      
      <button 
        @click="togglePlayback"
        :disabled="!audioBuffer"
        class="px-4 py-2 rounded-lg font-medium transition-all duration-200 border-none cursor-pointer bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isPlaying ? '⏸️ 暂停' : '▶️ 播放' }}
      </button>
      
      <button 
        @click="stopPlayback"
        :disabled="!audioBuffer"
        class="px-4 py-2 rounded-lg font-medium transition-all duration-200 border-none cursor-pointer bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ⏹️ 停止
      </button>
    </div>
    
    <!-- 播放进度 -->
    <div v-if="audioBuffer && duration > 0" class="mb-4">
      <div class="flex justify-between text-sm text-gray-300 mb-1">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(duration) }}</span>
      </div>
      <div class="w-full bg-gray-700 rounded-full h-2 cursor-pointer" @click="seekTo">
        <div 
          class="bg-blue-500 h-2 rounded-full transition-all duration-100"
          :style="{ width: progressPercentage + '%' }"
        ></div>
      </div>
    </div>
    
    <!-- 波形显示 -->
    <div class="mb-4">
      <div class="block text-sm font-medium text-white mb-2">波形显示</div>
      <div 
        ref="waveformContainer"
        class="h-40 relative overflow-hidden bg-white/5 rounded-lg border border-white/10"
      >
        <canvas 
          ref="waveformCanvas"
          class="absolute inset-0 w-full h-full"
          @mousemove="onWaveformHover"
        ></canvas>
        <!-- 播放位置指示器 -->
        <div 
          v-if="isPlaying && duration > 0"
          class="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none transition-all duration-100"
          :style="{ left: progressPercentage + '%' }"
        ></div>
      </div>
    </div>
    
    <!-- 频谱显示 -->
    <div class="mb-4">
      <div class="block text-sm font-medium text-white mb-2">频谱分析</div>
      <div 
        ref="spectrumContainer"
        class="h-32 bg-white/5 rounded-lg border border-white/10"
      >
        <canvas 
          ref="spectrumCanvas"
          class="w-full h-full"
        ></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// 响应式数据
const audioFileInput = ref(null)
const waveformContainer = ref(null)
const waveformCanvas = ref(null)
const spectrumContainer = ref(null)
const spectrumCanvas = ref(null)

const selectedFile = ref(null)
const audioBuffer = ref(null)
const audioInfo = ref(null)
const isProcessing = ref(false)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const isAudioEnabled = ref(true)
const isExcitationMode = ref(false)

// 音频相关
let audioContext = null
let audioSource = null
let analyser = null
let gainNode = null
let startTime = 0
let pauseTime = 0
let onFrequencyChange = null // 频率变化回调函数

// 动画帧
let animationFrame = null
let waveformCtx = null
let spectrumCtx = null

// 计算属性
const progressPercentage = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

// 生命周期
onMounted(async () => {
  await initAudioContext()
  initCanvas()
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  if (audioSource) {
    audioSource.disconnect()
  }
})

// 方法
async function initAudioContext() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    // 创建分析器节点
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.8
    
    // 创建增益节点
    gainNode = audioContext.createGain()
    gainNode.connect(audioContext.destination)
    
    console.log('AudioContext initialized successfully')
  } catch (error) {
    console.error('Failed to initialize AudioContext:', error)
  }
}

function initCanvas() {
  if (waveformCanvas.value) {
    waveformCtx = waveformCanvas.value.getContext('2d')
    waveformCanvas.value.width = waveformContainer.value.clientWidth
    waveformCanvas.value.height = waveformContainer.value.clientHeight
  }
  
  if (spectrumCanvas.value) {
    spectrumCtx = spectrumCanvas.value.getContext('2d')
    spectrumCanvas.value.width = spectrumContainer.value.clientWidth
    spectrumCanvas.value.height = spectrumContainer.value.clientHeight
  }
}

function handleFileChange(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    audioInfo.value = {
      filename: file.name,
      size: file.size
    }
  }
}

async function processAudio() {
  if (!selectedFile.value) return
  
  isProcessing.value = true
  
  try {
    const arrayBuffer = await selectedFile.value.arrayBuffer()
    audioBuffer.value = await audioContext.decodeAudioData(arrayBuffer)
    
    // 更新音频信息
    audioInfo.value = {
      ...audioInfo.value,
      duration: audioBuffer.value.duration,
      sampleRate: audioBuffer.value.sampleRate,
      channels: audioBuffer.value.numberOfChannels
    }
    
    duration.value = audioBuffer.value.duration
    
    // 绘制完整波形
    drawWaveform()
    
    console.log('Audio processed successfully')
  } catch (error) {
    console.error('Error processing audio:', error)
    alert('音频处理失败: ' + error.message)
  } finally {
    isProcessing.value = false
  }
}

async function togglePlayback() {
  if (!audioBuffer.value) return
  
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
  
  if (isPlaying.value) {
    pausePlayback()
  } else {
    startPlayback()
  }
}

function startPlayback() {
  if (!audioBuffer.value) return
  
  // 停止当前播放
  if (audioSource) {
    audioSource.disconnect()
  }
  
  // 创建新的音频源
  audioSource = audioContext.createBufferSource()
  audioSource.buffer = audioBuffer.value
  
  // 连接音频图
  audioSource.connect(analyser)
  analyser.connect(gainNode)
  
  // 设置结束回调
  audioSource.onended = () => {
    if (currentTime.value >= duration.value) {
      stopPlayback()
    }
  }
  
  // 开始播放
  const offset = pauseTime > 0 ? pauseTime : 0
  audioSource.start(0, offset)
  startTime = audioContext.currentTime - offset
  isPlaying.value = true
  
  // 开始动画循环
  updateProgress()
  
  console.log('Playback started')
}

function pausePlayback() {
  if (audioSource) {
    audioSource.stop()
    audioSource.disconnect()
    audioSource = null
  }
  
  pauseTime = currentTime.value
  isPlaying.value = false
  
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  
  console.log('Playback paused')
}

function stopPlayback() {
  if (audioSource) {
    audioSource.stop()
    audioSource.disconnect()
    audioSource = null
  }
  
  isPlaying.value = false
  currentTime.value = 0
  pauseTime = 0
  startTime = 0
  
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  
  // 重新绘制完整波形
  drawWaveform()
  
  console.log('Playback stopped')
}

function updateProgress() {
  if (!isPlaying.value) return
  
  currentTime.value = audioContext.currentTime - startTime
  
  if (currentTime.value >= duration.value) {
    stopPlayback()
    return
  }
  
  // 绘制滚动波形
  drawScrollingWaveform()
  
  // 绘制实时频谱
  drawSpectrum()
  
  // 如果在激励模式，分析并传递主导频率
  if (isExcitationMode.value && onFrequencyChange) {
    const dominantFreq = getDominantFrequency()
    if (dominantFreq && dominantFreq.amplitude > 0.1) { // 只有足够强的信号才传递
      onFrequencyChange(dominantFreq.frequency)
    }
  }
  
  animationFrame = requestAnimationFrame(updateProgress)
}

function drawWaveform() {
  if (!waveformCtx || !audioBuffer.value) return
  
  const canvas = waveformCanvas.value
  const ctx = waveformCtx
  const width = canvas.width
  const height = canvas.height
  
  ctx.clearRect(0, 0, width, height)
  
  // 获取音频数据
  const channelData = audioBuffer.value.getChannelData(0)
  const samples = channelData.length
  const step = Math.ceil(samples / width)
  
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 1
  ctx.beginPath()
  
  for (let i = 0; i < width; i++) {
    const sampleIndex = i * step
    const sample = channelData[sampleIndex] || 0
    const y = (sample + 1) * height / 2
    
    if (i === 0) {
      ctx.moveTo(i, y)
    } else {
      ctx.lineTo(i, y)
    }
  }
  
  ctx.stroke()
}

function drawScrollingWaveform() {
  if (!waveformCtx || !audioBuffer.value) return
  
  const canvas = waveformCanvas.value
  const ctx = waveformCtx
  const width = canvas.width
  const height = canvas.height
  
  ctx.clearRect(0, 0, width, height)
  
  // 计算当前显示的时间窗口（显示前后各2秒）
  const windowSize = 4 // 秒
  const startTime = Math.max(0, currentTime.value - windowSize / 2)
  const endTime = Math.min(duration.value, currentTime.value + windowSize / 2)
  
  const sampleRate = audioBuffer.value.sampleRate
  const channelData = audioBuffer.value.getChannelData(0)
  const startSample = Math.floor(startTime * sampleRate)
  const endSample = Math.floor(endTime * sampleRate)
  const totalSamples = endSample - startSample
  
  if (totalSamples <= 0) return
  
  const step = Math.ceil(totalSamples / width)
  
  // 绘制波形
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 1
  ctx.beginPath()
  
  for (let i = 0; i < width; i++) {
    const sampleIndex = startSample + i * step
    if (sampleIndex >= channelData.length) break
    
    const sample = channelData[sampleIndex] || 0
    const y = (sample + 1) * height / 2
    
    if (i === 0) {
      ctx.moveTo(i, y)
    } else {
      ctx.lineTo(i, y)
    }
  }
  
  ctx.stroke()
  
  // 绘制当前播放位置线
  const currentPosition = ((currentTime.value - startTime) / (endTime - startTime)) * width
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(currentPosition, 0)
  ctx.lineTo(currentPosition, height)
  ctx.stroke()
}

function drawSpectrum() {
  if (!spectrumCtx || !analyser) return
  
  const canvas = spectrumCanvas.value
  const ctx = spectrumCtx
  const width = canvas.width
  const height = canvas.height
  
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteFrequencyData(dataArray)
  
  ctx.clearRect(0, 0, width, height)
  
  const barWidth = width / bufferLength
  let x = 0
  
  // 绘制频谱条
  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * height
    
    // 颜色渐变
    const hue = (i / bufferLength) * 300
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
    
    ctx.fillRect(x, height - barHeight, barWidth, barHeight)
    x += barWidth
  }
}

function seekTo(event) {
  if (!audioBuffer.value) return
  
  const rect = event.target.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const newTime = percentage * duration.value
  
  currentTime.value = newTime
  pauseTime = newTime
  
  if (isPlaying.value) {
    // 重新开始播放
    pausePlayback()
    startPlayback()
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function onWaveformHover(event) {
  // 可以添加鼠标悬停显示时间信息的功能
}

// 音频激励相关方法
function startAudioExcitation() {
  if (!audioBuffer.value || !isAudioEnabled.value) {
    console.warn('无音频缓冲区或音频已禁用，无法开始激励')
    return false
  }
  
  isExcitationMode.value = true
  
  // 如果不在播放状态，开始播放
  if (!isPlaying.value) {
    startPlayback()
  }
  
  console.log('🎵 开始音频激励模式')
  return true
}

function stopAudioExcitation() {
  isExcitationMode.value = false
  
  // 停止播放
  if (isPlaying.value) {
    stopPlayback()
  }
  
  console.log('⏹️ 停止音频激励模式')
}

function setAudioEnabled(enabled) {
  isAudioEnabled.value = enabled
  
  // 如果禁用音频且正在激励模式，停止激励
  if (!enabled && isExcitationMode.value) {
    stopAudioExcitation()
  }
  
  console.log('🔊 音频激励', enabled ? '启用' : '禁用')
}

// 获取当前音频的主要频率成分（用于振动分析）
function getAudioFrequencyData() {
  if (!analyser || !isPlaying.value) return null
  
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteFrequencyData(dataArray)
  
  // 找到主要频率成分
  const sampleRate = audioContext.sampleRate
  const frequencies = []
  const threshold = 50 // 频率强度阈值
  
  for (let i = 0; i < bufferLength; i++) {
    if (dataArray[i] > threshold) {
      const frequency = (i * sampleRate) / (2 * bufferLength)
      frequencies.push({
        frequency: frequency,
        amplitude: dataArray[i] / 255.0
      })
    }
  }
  
  // 按幅度排序，返回前5个主要频率
  return frequencies
    .sort((a, b) => b.amplitude - a.amplitude)
    .slice(0, 5)
}

// 设置频率变化回调函数
function setFrequencyChangeCallback(callback) {
  onFrequencyChange = callback
}

// 获取当前音频的主导频率
function getDominantFrequency() {
  if (!analyser || !isPlaying.value) return null
  
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteFrequencyData(dataArray)
  
  // 找到峰值频率
  let maxAmplitude = 0
  let dominantIndex = 0
  
  for (let i = 0; i < bufferLength; i++) {
    if (dataArray[i] > maxAmplitude) {
      maxAmplitude = dataArray[i]
      dominantIndex = i
    }
  }
  
  // 计算频率
  const sampleRate = audioContext.sampleRate
  const dominantFreq = (dominantIndex * sampleRate) / (2 * bufferLength)
  
  return {
    frequency: dominantFreq,
    amplitude: maxAmplitude / 255.0
  }
}

// 监听窗口大小变化
watch([waveformContainer, spectrumContainer], () => {
  initCanvas()
  if (audioBuffer.value) {
    drawWaveform()
  }
})

// 暴露方法供父组件调用
defineExpose({
  startAudioExcitation,
  stopAudioExcitation,
  setAudioEnabled,
  getAudioFrequencyData,
  setFrequencyChangeCallback,
  getDominantFrequency
})
</script> 