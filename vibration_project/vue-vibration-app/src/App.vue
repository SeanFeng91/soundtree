<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AudioPlayer from './components/AudioPlayer.vue'
import VibrationControls from './components/VibrationControls.vue'

// 组件引用
const audioPlayer = ref(null)
const vibrationControls = ref(null)
const threejsContainer = ref(null)
const waveformPlot = ref(null)
const frequencyPlot = ref(null)
const resonancePlot = ref(null)

// 状态数据
const isSimulationRunning = ref(false)
const is3DInitialized = ref(false)
const selectedRodIndex = ref(4)
const audioEnabled = ref(true)
const currentConfig = ref({
  rodCount: 10,
  startLength: 20,
  lengthStep: 10,
  diameter: 5,
  material: 'steel',
  frequency: 100,
  amplitude: 1,
  damping: 0.01
})

// 模拟引擎实例（稍后从utils中导入）
let vibrationEngine = null
let rodManager = null
let visualization = null
let audioGenerator = null

// 生命周期
onMounted(async () => {
  await initializeVibrationEngine()
})

onUnmounted(() => {
  if (vibrationEngine) {
    vibrationEngine.cleanup()
  }
})

// 初始化振动引擎
async function initializeVibrationEngine() {
  try {
    console.log('开始初始化振动引擎...')
    
    // 外部库已在main.js中确保加载完成
    console.log('THREE.js版本:', THREE.REVISION)
    console.log('Plotly版本:', Plotly.version)
    
    // 动态导入我们的JavaScript模块
    const { MaterialProperties } = await import('./utils/materials.js')
    const { VibrationCalculator } = await import('./utils/vibration-calc.js')
    const { RodManager } = await import('./utils/rod-manager.js')
    const { Visualization } = await import('./utils/visualization.js')
    const { AudioGenerator } = await import('./utils/audio-generator.js')
    
    // 初始化3D管理器
    if (threejsContainer.value) {
      rodManager = new RodManager()
      const initResult = rodManager.init(threejsContainer.value)
      if (!initResult) {
        throw new Error('3D场景初始化失败')
      }
      console.log('✓ 3D场景初始化成功')
      is3DInitialized.value = true
    }
    
    // 初始化可视化
    visualization = new Visualization()
    visualization.init()
    window.visualization = visualization // 让RodManager可以访问
    console.log('✓ 可视化模块初始化成功')
    
    // 初始化音频生成器
    audioGenerator = new AudioGenerator()
    await audioGenerator.init()
    window.audioGenerator = audioGenerator // 让其他模块可以访问
    
    // 设置音频频率变化回调
    audioGenerator.setFrequencyChangeCallback(handleAudioFrequencyChange)
    
    // 为AudioPlayer组件设置回调（在组件挂载后）
    if (audioPlayer.value) {
      audioPlayer.value.setFrequencyChangeCallback(handleAudioFrequencyChange)
    }
    
    console.log('✓ 音频生成器初始化成功')
    
    console.log('✓ 振动引擎初始化完成')
  } catch (error) {
    console.error('振动引擎初始化失败:', error)
    throw error
  }
}

// 处理音频频率变化的回调函数
function handleAudioFrequencyChange(frequency) {
  // 更新当前配置中的频率
  currentConfig.value.frequency = frequency
  
  // 实时更新振动系统的激励频率
  if (rodManager && isSimulationRunning.value) {
    rodManager.setExcitationParams({
      ...currentConfig.value,
      frequency: frequency
    })
  }
  
  // 更新控制面板中的实时频率显示
  if (vibrationControls.value) {
    vibrationControls.value.updateCurrentAudioFrequency(frequency)
  }
  
  console.log(`🎵 实时频率: ${frequency.toFixed(1)}Hz`)
}

// 事件处理方法
function handleRodConfigUpdate(config) {
  currentConfig.value = { ...currentConfig.value, ...config }
  if (rodManager) {
    rodManager.setRodParams(config)
  }
}

function handleMaterialConfigUpdate(config) {
  currentConfig.value.material = config.type
  if (rodManager) {
    rodManager.setMaterial(config.type)
  }
}

function handleExcitationConfigUpdate(config) {
  currentConfig.value = { ...currentConfig.value, ...config }
  if (rodManager) {
    rodManager.setExcitationParams(config)
  }
  
  // 只有在音频开启且是正弦波激励时才更新音频频率
  if (audioEnabled.value && audioGenerator && audioGenerator.isPlaying && config.type === 'sine') {
    audioGenerator.setFrequency(config.frequency)
  } else if (audioEnabled.value && audioGenerator && audioGenerator.isPlaying && config.type === 'sweep') {
    // 如果正在播放且切换到扫频，重新开始扫频
    audioGenerator.stop()
    audioGenerator.startFrequencySweep(20, 2000, 10, 0.1)
  }
}

function handleToggleSimulation(running) {
  isSimulationRunning.value = running
  if (rodManager) {
    rodManager.togglePlayPause()
  }
  
  // 音频播放控制 - 考虑音频开关状态和激励类型
  if (audioGenerator && audioEnabled.value) {
    audioGenerator.resumeContext() // 确保音频上下文已激活
    
    if (running) {
      // 根据激励类型决定播放方式
      if (currentConfig.value.type === 'sine') {
        audioGenerator.startSineWave(currentConfig.value.frequency, 0.1)
      } else if (currentConfig.value.type === 'audio') {
        // 播放音频文件（通过AudioPlayer组件）
        if (audioPlayer.value) {
          audioPlayer.value.startAudioExcitation()
        }
      } else if (currentConfig.value.type === 'sweep') {
        // 实现扫频功能
        audioGenerator.startFrequencySweep(20, 2000, 10, 0.1)
      }
    } else {
      audioGenerator.stop()
      if (audioPlayer.value) {
        audioPlayer.value.stopAudioExcitation()
      }
    }
  }
}

function handleResetSimulation() {
  isSimulationRunning.value = false
  if (rodManager) {
    rodManager.reset()
  }
  if (vibrationControls.value) {
    vibrationControls.value.setRunningState(false)
  }
  
  // 停止音频播放
  if (audioGenerator) {
    audioGenerator.stop()
  }
}

function handleCalculateResonance() {
  // 计算共振频率
  console.log('计算共振频率')
  // 实现共振计算逻辑
}

function handleRodSelection(index) {
  selectedRodIndex.value = index
  if (rodManager) {
    rodManager.setSelectedRodIndex(index)
  }
}

function handleAudioSettings(enabled) {
  audioEnabled.value = enabled
  console.log('音频设置:', enabled ? '启用' : '禁用')
  
  if (audioGenerator) {
    if (!enabled && audioGenerator.isPlaying) {
      // 关闭音频时停止播放
      audioGenerator.stop()
    } else if (enabled && isSimulationRunning.value) {
      // 开启音频且模拟正在运行时开始播放
      if (currentConfig.value.type === 'sine') {
        audioGenerator.startSineWave(currentConfig.value.frequency, 0.1)
      } else if (currentConfig.value.type === 'audio') {
        if (audioPlayer.value) {
          audioPlayer.value.startAudioExcitation()
        }
      }
    }
  }
  
  // 同时控制AudioPlayer组件的音频播放
  if (audioPlayer.value) {
    audioPlayer.value.setAudioEnabled(enabled)
    // 确保AudioPlayer有频率变化回调
    audioPlayer.value.setFrequencyChangeCallback(handleAudioFrequencyChange)
  }
}

// 工具方法
function getMaterialName(materialType) {
  const materialNames = {
    steel: '钢材',
    aluminum: '铝材',
    brass: '黄铜',
    copper: '铜材',
    custom: '自定义'
  }
  return materialNames[materialType] || '未知'
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
    <!-- 顶部标题 -->
    <header class="p-6 text-center">
      <h1 class="text-4xl font-bold text-white mb-2">多杆件振动模拟系统</h1>
      <p class="text-gray-300">支持音频驱动的实时振动分析与可视化</p>
    </header>

    <!-- 主体内容 -->
    <main class="container mx-auto px-4 pb-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- 左侧控制面板 -->
        <div class="lg:col-span-1 space-y-6">
          <!-- 振动控制 -->
          <VibrationControls
            ref="vibrationControls"
            @update-rod-config="handleRodConfigUpdate"
            @update-material-config="handleMaterialConfigUpdate"
            @update-excitation-config="handleExcitationConfigUpdate"
            @toggle-simulation="handleToggleSimulation"
            @reset-simulation="handleResetSimulation"
            @calculate-resonance="handleCalculateResonance"
            @select-rod="handleRodSelection"
            @update-audio-settings="handleAudioSettings"
          />
          
          <!-- 音频播放器 -->
          <AudioPlayer ref="audioPlayer" />
        </div>

        <!-- 右侧可视化区域 -->
        <div class="lg:col-span-2 space-y-6">
          <!-- 3D可视化 -->
          <div class="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
            <h3 class="text-lg font-semibold text-white mb-4">3D振动可视化</h3>
            <div 
              ref="threejsContainer"
              id="threejs-container"
              class="h-96 bg-black/20 rounded-lg relative overflow-hidden"
            >
              <!-- Three.js 渲染器将在此处挂载 -->
              <div 
                v-if="!is3DInitialized"
                class="absolute inset-0 flex items-center justify-center text-white/50"
              >
                <div class="text-center">
                  <div class="animate-pulse text-3xl">🔧</div>
                  <p class="mt-2">正在初始化3D场景...</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 图表可视化 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 波形图 -->
            <div class="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
              <h4 class="text-md font-medium text-white mb-3">振动波形</h4>
              <div 
                ref="waveformPlot"
                id="waveform-plot"
                class="h-48 bg-white/5 rounded-lg border border-white/10 overflow-hidden"
              >
                <!-- Plotly 图表将在此处渲染 -->
              </div>
              <p class="text-xs text-gray-300 mt-2">
                📈 显示选定杆件的实时振动位移随时间变化，展示振动的时域特性
              </p>
            </div>

            <!-- 频率图 -->
            <div class="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
              <h4 class="text-md font-medium text-white mb-3">各杆件响应强度</h4>
              <div 
                ref="frequencyPlot"
                id="frequency-plot"
                class="h-48 bg-white/5 rounded-lg border border-white/10 overflow-hidden"
              >
                <!-- Plotly 图表将在此处渲染 -->
              </div>
              <p class="text-xs text-gray-300 mt-2">
                📊 显示各杆件在当前激励频率下的放大因子。绿点为正常响应，红点为共振状态
              </p>
            </div>
          </div>

          <!-- 共振分析图 -->
          <div class="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
            <h4 class="text-md font-medium text-white mb-3">共振分析</h4>
            <div 
              ref="resonancePlot"
              id="resonance-plot"
              class="h-64 bg-white/5 rounded-lg border border-white/10 overflow-hidden"
            >
              <!-- 共振分析图表 -->
            </div>
            <p class="text-xs text-gray-300 mt-2">
              🎯 展示杆长与固有频率的关系：蓝点为各杆件的第一阶固有频率，黄线为当前激励频率。
              红点表示与激励频率接近共振的杆件。杆件越短，固有频率越高。
            </p>
          </div>
        </div>
      </div>
    </main>

    <!-- 状态栏 -->
    <footer class="bg-black/20 backdrop-blur-sm border-t border-white/10 p-4">
      <div class="container mx-auto">
        <div class="flex justify-between items-center text-sm text-gray-300">
          <div>
            状态: <span :class="isSimulationRunning ? 'text-green-400' : 'text-gray-400'">
              {{ isSimulationRunning ? '运行中' : '停止' }}
            </span>
          </div>
          <div class="flex gap-4">
            <span>杆件数量: {{ currentConfig.rodCount }}</span>
            <span>激励频率: {{ currentConfig.frequency }}Hz</span>
            <span>材料: {{ getMaterialName(currentConfig.material) }}</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* 组件特定样式 */
.container {
  max-width: 1400px;
}
</style>
