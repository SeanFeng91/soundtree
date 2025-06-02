class AudioGenerator {
    constructor() {
        this.audioContext = null;
        this.sampleRate = 44100;
    }

    init() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 生成正弦波
    generateSineWave(frequency, duration, amplitude = 0.5) {
        const length = this.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, length, this.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            data[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / this.sampleRate);
        }

        return buffer;
    }

    // 生成单频音调（与generateSineWave相同）
    generateSingleTone(frequency, duration, amplitude = 0.5) {
        return this.generateSineWave(frequency, duration, amplitude);
    }

    // 生成复合音调（多个频率混合）
    generateComplexTone(frequencies, duration, amplitude = 0.3) {
        const length = this.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, length, this.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            let sample = 0;
            frequencies.forEach(freq => {
                sample += amplitude * Math.sin(2 * Math.PI * freq * i / this.sampleRate);
            });
            data[i] = sample / frequencies.length;
        }

        return buffer;
    }

    // 生成扫频音（频率从低到高变化）
    generateSweep(startFreq, endFreq, duration, amplitude = 0.5) {
        const length = this.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, length, this.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            const progress = i / length;
            const frequency = startFreq + (endFreq - startFreq) * progress;
            data[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / this.sampleRate);
        }

        return buffer;
    }

    // 生成节拍音（有规律的节奏）
    generateBeat(frequency, beatFreq, duration, amplitude = 0.5) {
        const length = this.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, length, this.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            const envelope = Math.abs(Math.sin(2 * Math.PI * beatFreq * i / this.sampleRate));
            data[i] = amplitude * envelope * Math.sin(2 * Math.PI * frequency * i / this.sampleRate);
        }

        return buffer;
    }

    // 播放生成的音频
    playBuffer(buffer) {
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start();
        return source;
    }

    // 将音频缓冲区转换为Blob，用于下载
    bufferToWav(buffer) {
        const length = buffer.length;
        const arrayBuffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(arrayBuffer);

        // WAV文件头
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, this.sampleRate, true);
        view.setUint32(28, this.sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);

        // 音频数据
        const channelData = buffer.getChannelData(0);
        let offset = 44;
        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, channelData[i]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }
}

// 导出供其他模块使用
window.AudioGenerator = AudioGenerator; 