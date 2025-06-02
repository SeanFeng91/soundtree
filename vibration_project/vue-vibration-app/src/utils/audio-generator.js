/**
 * 音频生成器模块
 * 用于实时生成振动音频
 */

export class AudioGenerator {
    constructor() {
        this.audioContext = null;
        this.oscillator = null;
        this.gainNode = null;
        this.isPlaying = false;
        this.frequency = 100;
        this.volume = 0.1;
    }

    /**
     * 初始化音频上下文
     */
    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 创建增益节点用于控制音量
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.volume;
            this.gainNode.connect(this.audioContext.destination);
            
            console.log('✓ 音频生成器初始化成功');
            return true;
        } catch (error) {
            console.error('音频生成器初始化失败:', error);
            return false;
        }
    }

    /**
     * 开始播放正弦波
     * @param {number} frequency - 频率（Hz）
     * @param {number} volume - 音量（0-1）
     */
    startSineWave(frequency = this.frequency, volume = this.volume) {
        if (!this.audioContext) {
            console.warn('音频上下文未初始化');
            return false;
        }

        // 停止之前的播放
        this.stop();

        try {
            // 创建振荡器
            this.oscillator = this.audioContext.createOscillator();
            this.oscillator.type = 'sine';
            this.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            
            // 设置音量
            this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            
            // 连接音频节点
            this.oscillator.connect(this.gainNode);
            
            // 开始播放
            this.oscillator.start(this.audioContext.currentTime);
            
            this.isPlaying = true;
            this.frequency = frequency;
            this.volume = volume;
            
            console.log(`▶️ 开始播放正弦波: ${frequency}Hz, 音量: ${volume}`);
            return true;
        } catch (error) {
            console.error('启动正弦波失败:', error);
            return false;
        }
    }

    /**
     * 更新频率
     * @param {number} frequency - 新频率（Hz）
     */
    setFrequency(frequency) {
        if (this.oscillator && this.isPlaying) {
            this.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            this.frequency = frequency;
        }
    }

    /**
     * 更新音量
     * @param {number} volume - 新音量（0-1）
     */
    setVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            this.volume = volume;
        }
    }

    /**
     * 停止播放
     */
    stop() {
        if (this.oscillator && this.isPlaying) {
            try {
                this.oscillator.stop(this.audioContext.currentTime);
                this.oscillator.disconnect();
                this.oscillator = null;
                this.isPlaying = false;
                console.log('⏹️ 停止音频播放');
            } catch (error) {
                // 忽略重复停止的错误
                this.oscillator = null;
                this.isPlaying = false;
            }
        }
    }

    /**
     * 暂停/恢复播放
     */
    togglePlayback() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.startSineWave(this.frequency, this.volume);
        }
        return this.isPlaying;
    }

    /**
     * 获取当前状态
     */
    getStatus() {
        return {
            isPlaying: this.isPlaying,
            frequency: this.frequency,
            volume: this.volume,
            contextState: this.audioContext?.state || 'unknown'
        };
    }

    /**
     * 恢复音频上下文（用户交互后）
     */
    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('✓ 音频上下文已恢复');
                return true;
            } catch (error) {
                console.error('恢复音频上下文失败:', error);
                return false;
            }
        }
        return true;
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.stop();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
} 