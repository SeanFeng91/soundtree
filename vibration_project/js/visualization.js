/**
 * 可视化模块
 * 负责绘制波形图、频谱图等数据可视化
 */

class Visualization {
    constructor() {
        this.waveformPlot = null;
        this.frequencyPlot = null;
        this.waveformContainer = 'waveform-plot';
        this.frequencyContainer = 'frequency-plot';
    }

    /**
     * 初始化图表
     */
    init() {
        this.initWaveformPlot();
        this.initFrequencyPlot();
    }

    /**
     * 初始化波形图
     */
    initWaveformPlot() {
        const layout = {
            title: {
                text: '波形图',
                font: { color: '#f3f4f6', size: 14 }
            },
            xaxis: {
                title: '时间 (秒)',
                color: '#d1d5db',
                gridcolor: '#374151',
                showgrid: true
            },
            yaxis: {
                title: '幅度',
                color: '#d1d5db',
                gridcolor: '#374151',
                showgrid: true
            },
            plot_bgcolor: '#1f2937',
            paper_bgcolor: '#1f2937',
            font: { color: '#f3f4f6' },
            margin: { l: 50, r: 30, t: 40, b: 40 },
            showlegend: false
        };

        const config = {
            displayModeBar: false,
            responsive: true
        };

        const data = [{
            x: [],
            y: [],
            type: 'scatter',
            mode: 'lines',
            line: { color: '#60a5fa', width: 2 },
            name: '波形'
        }];

        Plotly.newPlot(this.waveformContainer, data, layout, config);
    }

    /**
     * 初始化频谱图
     */
    initFrequencyPlot() {
        const layout = {
            title: {
                text: '频谱图',
                font: { color: '#f3f4f6', size: 14 }
            },
            xaxis: {
                title: '频率 (Hz)',
                color: '#d1d5db',
                gridcolor: '#374151',
                showgrid: true,
                range: [20, 2000]
            },
            yaxis: {
                title: '幅度',
                color: '#d1d5db',
                gridcolor: '#374151',
                showgrid: true
            },
            plot_bgcolor: '#1f2937',
            paper_bgcolor: '#1f2937',
            font: { color: '#f3f4f6' },
            margin: { l: 50, r: 30, t: 40, b: 40 },
            showlegend: false
        };

        const config = {
            displayModeBar: false,
            responsive: true
        };

        const data = [{
            x: [],
            y: [],
            type: 'scatter',
            mode: 'lines',
            line: { color: '#10b981', width: 2 },
            name: '频谱',
            fill: 'tozeroy',
            fillcolor: 'rgba(16, 185, 129, 0.2)'
        }];

        Plotly.newPlot(this.frequencyContainer, data, layout, config);
    }

    /**
     * 更新波形图
     * @param {Array} waveformData - 波形数据 [{time, amplitude}]
     */
    updateWaveformPlot(waveformData) {
        if (!waveformData || waveformData.length === 0) {
            this.clearWaveformPlot();
            return;
        }

        const times = waveformData.map(d => d.time);
        const amplitudes = waveformData.map(d => d.amplitude);

        const update = {
            x: [times],
            y: [amplitudes]
        };

        Plotly.restyle(this.waveformContainer, update, [0]);
    }

    /**
     * 更新频谱图
     * @param {Array} frequencyData - 频谱数据 [{frequency, amplitude}]
     */
    updateFrequencyPlot(frequencyData) {
        if (!frequencyData || frequencyData.length === 0) {
            this.clearFrequencyPlot();
            return;
        }

        const frequencies = frequencyData.map(d => d.frequency);
        const amplitudes = frequencyData.map(d => d.amplitude);

        const update = {
            x: [frequencies],
            y: [amplitudes]
        };

        Plotly.restyle(this.frequencyContainer, update, [0]);
    }

    /**
     * 清空波形图
     */
    clearWaveformPlot() {
        const update = {
            x: [[]],
            y: [[]]
        };
        Plotly.restyle(this.waveformContainer, update, [0]);
    }

    /**
     * 清空频谱图
     */
    clearFrequencyPlot() {
        const update = {
            x: [[]],
            y: [[]]
        };
        Plotly.restyle(this.frequencyContainer, update, [0]);
    }

    /**
     * 绘制生成的正弦波
     * @param {number} frequency - 频率
     * @param {number} duration - 持续时间
     * @param {number} amplitude - 幅度
     */
    plotGeneratedSineWave(frequency, duration, amplitude = 1.0) {
        const sampleRate = 1000; // 采样率
        const numSamples = sampleRate * duration;
        const waveformData = [];

        for (let i = 0; i < numSamples; i++) {
            const time = i / sampleRate;
            const value = amplitude * Math.sin(2 * Math.PI * frequency * time);
            waveformData.push({ time, amplitude: value });
        }

        this.updateWaveformPlot(waveformData);

        // 绘制频谱（单一频率）
        const frequencyData = [
            { frequency: frequency, amplitude: amplitude }
        ];
        this.updateFrequencyPlot(frequencyData);
    }

    /**
     * 绘制扫频信号
     * @param {number} startFreq - 起始频率
     * @param {number} endFreq - 结束频率
     * @param {number} duration - 持续时间
     * @param {number} amplitude - 幅度
     */
    plotSweepSignal(startFreq, endFreq, duration, amplitude = 1.0) {
        const sampleRate = 1000;
        const numSamples = sampleRate * duration;
        const waveformData = [];

        for (let i = 0; i < numSamples; i++) {
            const time = i / sampleRate;
            const freq = startFreq + (endFreq - startFreq) * (time / duration);
            const value = amplitude * Math.sin(2 * Math.PI * freq * time);
            waveformData.push({ time, amplitude: value });
        }

        this.updateWaveformPlot(waveformData);

        // 扫频信号的频谱是连续的
        const frequencyData = [];
        const freqStep = (endFreq - startFreq) / 100;
        for (let f = startFreq; f <= endFreq; f += freqStep) {
            frequencyData.push({ 
                frequency: f, 
                amplitude: amplitude * 0.5 // 扫频信号每个频率的能量较小
            });
        }
        this.updateFrequencyPlot(frequencyData);
    }

    /**
     * 显示音频文件的波形和频谱
     * @param {AudioBuffer} audioBuffer - 音频缓冲区
     */
    plotAudioFile(audioBuffer) {
        if (!audioBuffer) return;

        // 获取并显示波形
        const waveformData = audioProcessor.getWaveformData(audioBuffer, 1000);
        this.updateWaveformPlot(waveformData);

        // 分析并显示频谱
        const frequencyData = audioProcessor.analyzeAudioFrequency();
        this.updateFrequencyPlot(frequencyData);
    }

    /**
     * 绘制杆件共振频率对比图
     * @param {Array} rodStatusList - 杆件状态列表
     * @param {number} excitationFreq - 激励频率
     */
    plotResonanceComparison(rodStatusList, excitationFreq) {
        // 创建一个新的图表显示杆件共振频率
        const resonanceData = [];
        const colors = [];
        
        rodStatusList.forEach(rod => {
            rod.naturalFrequencies.forEach((freq, modeIndex) => {
                resonanceData.push({
                    x: rod.length,
                    y: freq,
                    mode: modeIndex + 1,
                    isResonant: Math.abs(freq - excitationFreq) <= freq * 0.05
                });
            });
        });

        // 按模态分组数据
        const modeGroups = {};
        resonanceData.forEach(point => {
            if (!modeGroups[point.mode]) {
                modeGroups[point.mode] = { x: [], y: [], colors: [] };
            }
            modeGroups[point.mode].x.push(point.x);
            modeGroups[point.mode].y.push(point.y);
            modeGroups[point.mode].colors.push(point.isResonant ? '#ff4444' : '#60a5fa');
        });

        // 创建图表数据
        const traces = [];
        Object.keys(modeGroups).forEach(mode => {
            const group = modeGroups[mode];
            traces.push({
                x: group.x,
                y: group.y,
                mode: 'markers',
                type: 'scatter',
                name: `${mode}阶模态`,
                marker: {
                    color: group.colors,
                    size: 8,
                    line: { width: 1, color: '#ffffff' }
                }
            });
        });

        // 添加激励频率线
        traces.push({
            x: [Math.min(...rodStatusList.map(r => r.length)), Math.max(...rodStatusList.map(r => r.length))],
            y: [excitationFreq, excitationFreq],
            mode: 'lines',
            type: 'scatter',
            name: '激励频率',
            line: { color: '#fbbf24', width: 3, dash: 'dash' }
        });

        const layout = {
            title: {
                text: '杆件共振频率对比',
                font: { color: '#f3f4f6', size: 16 }
            },
            xaxis: {
                title: '杆长 (mm)',
                color: '#d1d5db',
                gridcolor: '#374151'
            },
            yaxis: {
                title: '频率 (Hz)',
                color: '#d1d5db',
                gridcolor: '#374151'
            },
            plot_bgcolor: '#1f2937',
            paper_bgcolor: '#1f2937',
            font: { color: '#f3f4f6' },
            showlegend: true,
            legend: { 
                bgcolor: 'rgba(17, 24, 39, 0.8)',
                bordercolor: '#4b5563',
                borderwidth: 1
            }
        };

        // 如果容器不存在，创建一个新的
        const containerId = 'resonance-comparison-plot';
        if (!document.getElementById(containerId)) {
            const container = document.createElement('div');
            container.id = containerId;
            container.style.width = '100%';
            container.style.height = '300px';
            container.style.margin = '10px 0';
            document.getElementById('frequency-plot').parentNode.appendChild(container);
        }

        Plotly.newPlot(containerId, traces, layout, { displayModeBar: false, responsive: true });
    }

    /**
     * 实时更新杆件状态显示
     * @param {Array} rodStatusList - 杆件状态列表
     */
    updateRodStatusDisplay(rodStatusList) {
        const container = document.getElementById('rodStatusList');
        if (!container) return;

        container.innerHTML = '';

        rodStatusList.forEach(rod => {
            const statusDiv = document.createElement('div');
            statusDiv.className = `rod-status ${rod.isResonant ? 'rod-resonant' : ''}`;
            
            const resonantText = rod.isResonant ? ' (共振!)' : '';
            statusDiv.innerHTML = `
                <div style="font-weight: bold;">杆 ${rod.index}: ${rod.length}mm${resonantText}</div>
                <div style="font-size: 11px; margin-top: 2px;">
                    固有频率: ${rod.naturalFrequencies.slice(0, 2).join(', ')} Hz
                </div>
                <div style="font-size: 10px; color: #9ca3af;">
                    材料: ${rod.material}
                </div>
            `;
            
            container.appendChild(statusDiv);
        });
    }

    /**
     * 调整图表大小
     */
    resize() {
        if (document.getElementById(this.waveformContainer)) {
            Plotly.Plots.resize(this.waveformContainer);
        }
        if (document.getElementById(this.frequencyContainer)) {
            Plotly.Plots.resize(this.frequencyContainer);
        }
    }
}

// 确保类导出到全局作用域
window.Visualization = Visualization; 