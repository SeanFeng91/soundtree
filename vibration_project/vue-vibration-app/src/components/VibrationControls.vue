<template>
  <div class="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
    <h3 class="text-lg font-semibold text-white mb-4">振动参数控制</h3>
    
    <!-- 杆件配置 -->
    <div class="mb-6">
      <h4 class="text-md font-medium text-white mb-3">杆件配置</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 杆件数量 -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-white mb-1">
            杆件数量: <span class="text-blue-400">{{ rodConfig.count }}根</span>
          </label>
          <input 
            v-model.number="rodConfig.count"
            type="range" 
            min="1" 
            max="20" 
            class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            @input="updateRodConfig"
          />
        </div>
        
        <!-- 起始长度 -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-white mb-1">
            起始长度: <span class="text-blue-400">{{ rodConfig.startLength }}mm</span>
          </label>
          <input 
            v-model.number="rodConfig.startLength"
            type="range" 
            min="20" 
            max="100" 
            class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            @input="updateRodConfig"
          />
        </div>
        
        <!-- 长度递增 -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-white mb-1">
            长度递增: <span class="text-blue-400">{{ rodConfig.lengthStep }}mm</span>
          </label>
          <input 
            v-model.number="rodConfig.lengthStep"
            type="range" 
            min="5" 
            max="50" 
            class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            @input="updateRodConfig"
          />
        </div>
        
        <!-- 杆件直径 -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-white mb-1">
            杆件直径: <span class="text-blue-400">{{ rodConfig.diameter }}mm</span>
          </label>
          <input 
            v-model.number="rodConfig.diameter"
            type="range" 
            min="1" 
            max="20" 
            step="0.1"
            class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            @input="updateRodConfig"
          />
        </div>
      </div>
    </div>
    
    <!-- 材料配置 -->
    <div class="mb-6">
      <h4 class="text-md font-medium text-white mb-3">材料特性</h4>
      <div class="space-y-4">
        <!-- 材料选择 -->
        <div>
          <label class="block text-sm font-medium text-white mb-1">材料类型</label>
          <select 
            v-model="materialConfig.type"
            class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="updateMaterialConfig"
          >
            <option value="steel">钢材</option>
            <option value="aluminum">铝材</option>
            <option value="brass">黄铜</option>
            <option value="copper">铜材</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        
        <!-- 自定义材料参数 -->
        <div v-if="materialConfig.type === 'custom'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-white mb-1">
              弹性模量: <span class="text-blue-400">{{ materialConfig.youngModulus }}GPa</span>
            </label>
            <input 
              v-model.number="materialConfig.youngModulus"
              type="range" 
              min="50" 
              max="400" 
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              @input="updateMaterialConfig"
            />
          </div>
          
          <div class="space-y-2">
            <label class="block text-sm font-medium text-white mb-1">
              密度: <span class="text-blue-400">{{ materialConfig.density }}kg/m³</span>
            </label>
            <input 
              v-model.number="materialConfig.density"
              type="range" 
              min="1000" 
              max="12000" 
              step="100"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              @input="updateMaterialConfig"
            />
          </div>
        </div>
        
        <!-- 材料信息显示 -->
        <div v-else class="p-3 bg-white/5 rounded-lg">
          <div class="text-sm text-gray-300 space-y-1">
            <div>弹性模量: {{ getCurrentMaterial.youngModulus }}GPa</div>
            <div>密度: {{ getCurrentMaterial.density }}kg/m³</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 激励配置 -->
    <div class="mb-6">
      <h4 class="text-md font-medium text-white mb-3">激励参数</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 激励类型 -->
        <div>
          <label class="block text-sm font-medium text-white mb-1">激励类型</label>
          <select 
            v-model="excitationConfig.type"
            class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="updateExcitationConfig"
          >
            <option value="sine">正弦波</option>
            <option value="sweep">扫频</option>
            <option value="audio">音频文件</option>
          </select>
        </div>
        
        <!-- 频率 -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-white mb-1">
            频率: <span class="text-blue-400">{{ excitationConfig.frequency }}Hz</span>
          </label>
          <input 
            v-model.number="excitationConfig.frequency"
            type="range" 
            min="20" 
            max="2000" 
            class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            @input="updateExcitationConfig"
          />
        </div>
        
        <!-- 幅度 -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-white mb-1">
            幅度: <span class="text-blue-400">{{ excitationConfig.amplitude }}</span>
          </label>
          <input 
            v-model.number="excitationConfig.amplitude"
            type="range" 
            min="0.1" 
            max="5" 
            step="0.1"
            class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            @input="updateExcitationConfig"
          />
        </div>
        
        <!-- 阻尼比 -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-white mb-1">
            阻尼比: <span class="text-blue-400">{{ excitationConfig.damping }}</span>
          </label>
          <input 
            v-model.number="excitationConfig.damping"
            type="range" 
            min="0.001" 
            max="0.1" 
            step="0.001"
            class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            @input="updateExcitationConfig"
          />
        </div>
      </div>
    </div>
    
    <!-- 模拟控制 -->
    <div class="mb-6">
      <h4 class="text-md font-medium text-white mb-3">模拟控制</h4>
      <div class="flex flex-wrap gap-2 mb-3">
        <button 
          @click="toggleSimulation"
          :class="[
            'px-4 py-2 rounded-lg font-medium transition-all duration-200 border-none cursor-pointer',
            isRunning ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
          ]"
        >
          {{ isRunning ? '⏸️ 暂停' : '▶️ 开始' }}
        </button>
        
        <button 
          @click="resetSimulation"
          class="px-4 py-2 rounded-lg font-medium transition-all duration-200 border-none cursor-pointer bg-gray-600 hover:bg-gray-700 text-white"
        >
          🔄 重置
        </button>
        
        <button 
          @click="calculateResonance"
          class="px-4 py-2 rounded-lg font-medium transition-all duration-200 border-none cursor-pointer bg-green-500 hover:bg-green-600 text-white"
        >
          📊 计算共振
        </button>
      </div>
      
      <!-- 音频控制 -->
      <div class="bg-white/5 rounded-lg p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-white">音频播放</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              v-model="audioEnabled" 
              @change="updateAudioSettings"
              class="sr-only peer"
            >
            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
        <p class="text-xs text-gray-400 mt-1">
          {{ audioEnabled ? '启用音频反馈' : '静默模式' }}
        </p>
      </div>
    </div>
    
    <!-- 波形显示选择 -->
    <div class="mb-4">
      <h4 class="text-md font-medium text-white mb-3">波形显示设置</h4>
      <div class="bg-white/5 rounded-lg p-3">
        <label class="block text-sm font-medium text-white mb-2">
          选择显示杆件: <span class="text-blue-400">杆件{{ selectedRodIndex + 1 }}</span>
        </label>
        <select 
          v-model.number="selectedRodIndex"
          @change="updateSelectedRod"
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option 
            v-for="i in rodConfig.count" 
            :key="i-1" 
            :value="i-1"
          >
            杆件{{ i }} ({{ Math.round(rodConfig.startLength + (i-1) * rodConfig.lengthStep) }}mm)
          </option>
        </select>
        <p class="text-xs text-gray-400 mt-1">
          选择要在波形图中显示振动数据的杆件
        </p>
      </div>
    </div>
    
    <!-- 杆件状态显示 -->
    <div v-if="rodStatus.length > 0" class="mb-4">
      <h4 class="text-md font-medium text-white mb-3">杆件状态</h4>
      <div class="max-h-40 overflow-y-auto bg-white/5 rounded-lg p-3 space-y-2">
        <div 
          v-for="(rod, index) in rodStatus" 
          :key="index"
          class="flex justify-between items-center text-xs py-1 border-b border-gray-700 last:border-b-0"
        >
          <span class="font-medium">
            杆件{{ index + 1 }} ({{ rod.length.toFixed(0) }}mm)
          </span>
          <div class="text-right">
            <span 
              :class="rod.isResonant ? 'text-red-400' : 'text-green-400'"
              class="font-medium"
            >
              {{ rod.isResonant ? '共振' : '正常' }}
            </span>
            <div class="text-gray-400 text-xs">
              {{ rod.naturalFreq.toFixed(1) }}Hz
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// Props 和 Emits
const emit = defineEmits([
  'update-rod-config',
  'update-material-config', 
  'update-excitation-config',
  'toggle-simulation',
  'reset-simulation',
  'calculate-resonance',
  'select-rod',
  'update-audio-settings'
])

// 响应式数据
const rodConfig = ref({
  count: 10,
  startLength: 20,
  lengthStep: 10,
  diameter: 5
})

const materialConfig = ref({
  type: 'steel',
  youngModulus: 200,
  density: 7850
})

const excitationConfig = ref({
  type: 'sine',
  frequency: 100,
  amplitude: 1,
  damping: 0.01
})

const isRunning = ref(false)
const rodStatus = ref([])
const selectedRodIndex = ref(4)
const audioEnabled = ref(true)

// 材料预设
const materialPresets = {
  steel: { youngModulus: 200, density: 7850, name: '钢材' },
  aluminum: { youngModulus: 70, density: 2700, name: '铝材' },
  brass: { youngModulus: 100, density: 8400, name: '黄铜' },
  copper: { youngModulus: 110, density: 8900, name: '铜材' }
}

// 计算属性
const getCurrentMaterial = computed(() => {
  if (materialConfig.value.type === 'custom') {
    return {
      youngModulus: materialConfig.value.youngModulus,
      density: materialConfig.value.density
    }
  }
  return materialPresets[materialConfig.value.type] || materialPresets.steel
})

// 方法
function updateRodConfig() {
  emit('update-rod-config', { ...rodConfig.value })
}

function updateMaterialConfig() {
  const config = {
    type: materialConfig.value.type,
    ...getCurrentMaterial.value
  }
  emit('update-material-config', config)
}

function updateExcitationConfig() {
  emit('update-excitation-config', { ...excitationConfig.value })
}

function toggleSimulation() {
  isRunning.value = !isRunning.value
  emit('toggle-simulation', isRunning.value)
}

function resetSimulation() {
  isRunning.value = false
  emit('reset-simulation')
}

function calculateResonance() {
  emit('calculate-resonance')
}

function updateSelectedRod() {
  emit('select-rod', selectedRodIndex.value)
}

function updateAudioSettings() {
  emit('update-audio-settings', audioEnabled.value)
}

// 监听材料类型变化，自动更新参数
watch(() => materialConfig.value.type, (newType) => {
  if (newType !== 'custom') {
    const preset = materialPresets[newType]
    if (preset) {
      materialConfig.value.youngModulus = preset.youngModulus
      materialConfig.value.density = preset.density
    }
  }
  updateMaterialConfig()
})

// 暴露方法供父组件调用
function updateRodStatus(status) {
  rodStatus.value = status
}

function setRunningState(running) {
  isRunning.value = running
}

defineExpose({
  updateRodStatus,
  setRunningState
})
</script> 