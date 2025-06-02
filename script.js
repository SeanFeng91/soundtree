import { RodVibrator } from './RodVibration.js'; // 导入

class SoundTree {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.rods = [];
        this.sphere = null;
        this.clock = new THREE.Clock(); // 添加 Clock
        
        // 音频相关
        this.audioContext = null;
        this.audioSource = null;
        this.analyser = null;
        this.audioElement = null;
        this.dataArray = null;
        this.isPlaying = false;
        this.currentAudioBuffer = null;
        
        // 音频生成器
        this.audioGenerator = null;
        
        // 杆子配置
        this.rodCount = 128; // 杆子数量，对应频率分析的精度
        this.maxRodHeight = 8;
        this.minRodHeight = 1;
        this.sphereRadius = 2;
        
        // 波形图相关
        this.waveformCanvas = null;
        this.waveformCtx = null;
        this.timeDomainDataArray = null; // 用于存储时域数据
        
        this.init();
        this.bindEvents();
    }

    init() {
        this.initThreeJS();
        this.createSoundTree();
        this.initAudioGenerator();
        this.animate();
    }

    initAudioGenerator() {
        this.audioGenerator = new AudioGenerator();
    }

    initThreeJS() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000510);

        // 获取波形图 canvas 和 context
        this.waveformCanvas = document.getElementById('waveformCanvas');
        if (this.waveformCanvas) {
            this.waveformCtx = this.waveformCanvas.getContext('2d');
        } else {
            console.warn('Waveform canvas not found. Ensure HTML is correct.');
        }

        // 创建摄像机
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 5, 20);

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // 添加控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // 添加灯光
        this.addLights();

        // 监听窗口大小变化
        window.addEventListener('resize', () => this.onWindowResize());
    }

    addLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        // 主光源
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // 点光源（用于营造氛围）
        const pointLight = new THREE.PointLight(0x00ffff, 0.5, 50);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);

        // 另一个点光源
        const pointLight2 = new THREE.PointLight(0xff00ff, 0.3, 30);
        pointLight2.position.set(-10, 5, 10);
        this.scene.add(pointLight2);
    }

    createSoundTree() {
        // 创建中心球体
        const sphereGeometry = new THREE.SphereGeometry(this.sphereRadius, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.sphere.castShadow = true;
        this.sphere.receiveShadow = true;
        this.scene.add(this.sphere);

        // 创建杆子
        this.createRods();
        this.displayResonanceFrequencies();

        // 创建地面
        this.createGround();
    }

    createRods() {
        this.rods = [];
        
        for (let i = 0; i < this.rodCount; i++) {
            // 计算杆子的位置和方向
            const phi = Math.acos(-1 + (2 * i) / this.rodCount);
            const theta = Math.sqrt(this.rodCount * Math.PI) * phi;
            
            // 杆子长度基于频率索引，低频杆子更长，采用非线性映射
            let factor = 0;
            if (this.rodCount > 1) {
                const p = i / (this.rodCount - 1); // 归一化索引 (0 to 1)
                factor = Math.sqrt(p); // 非线性因子
            } else if (this.rodCount === 1) {
                factor = 0; // 单杆情况，取最长
            }
            const baseLength = this.maxRodHeight - factor * (this.maxRodHeight - this.minRodHeight);
            
            // 杆子几何体
            const rodGeometry = new THREE.CylinderGeometry(0.05, 0.08, baseLength, 8);
            
            // 杆子材质，颜色基于频率
            const hue = (i / this.rodCount) * 360;
            const rodMaterial = new THREE.MeshPhongMaterial({ 
                color: new THREE.Color().setHSL(hue / 360, 0.7, 0.6),
                shininess: 50
            });
            
            const rod = new THREE.Mesh(rodGeometry, rodMaterial);
            
            // 计算杆子在球面上的固定点
            const x = this.sphereRadius * Math.sin(phi) * Math.cos(theta);
            const y = this.sphereRadius * Math.cos(phi);
            const z = this.sphereRadius * Math.sin(phi) * Math.sin(theta);
            
            // 计算杆子的方向向量（从球心指向外）
            const direction = new THREE.Vector3(x, y, z).normalize();
            
            // 创建一个用于旋转的组
            const rodGroup = new THREE.Group();
            
            // 将杆子添加到组中，杆子的底部在原点，沿Y轴正方向
            rod.position.set(0, baseLength / 2, 0);
            rodGroup.add(rod);
            
            // 设置组的位置为球面上的固定点
            rodGroup.position.copy(new THREE.Vector3(x, y, z));
            
            // 让杆子组朝向正确的方向（从球心向外）
            const yAxis = new THREE.Vector3(0, 1, 0); // 圆柱体默认沿Y轴
            const quaternion = new THREE.Quaternion().setFromUnitVectors(yAxis, direction);
            rodGroup.quaternion.copy(quaternion);
            
            rodGroup.castShadow = true;
            rodGroup.receiveShadow = true;
            
            // 保存原始信息到组的userData中，添加物理属性
            rodGroup.userData = {
                originalLength: baseLength,
                attachmentPoint: new THREE.Vector3(x, y, z),
                direction: direction.clone(),
                frequencyIndex: i,
                rod: rod,
                vibrator: new RodVibrator(rod, 0.05, 0.08, baseLength) // 创建振动器实例
            };
            
            this.rods.push(rodGroup);
            this.scene.add(rodGroup);
        }
    }

    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a1a2e,
            transparent: true,
            opacity: 0.3
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -10;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    displayResonanceFrequencies() {
        const listElement = document.getElementById('frequencyList');
        if (!listElement) {
            console.warn('Frequency list element not found.');
            return;
        }
        listElement.innerHTML = ''; // 清空旧列表

        this.rods.forEach((rodGroup, index) => {
            const vibrator = rodGroup.userData.vibrator;
            if (vibrator && typeof vibrator.naturalAngularFrequency_mode1 === 'number') {
                const angularFrequency = vibrator.naturalAngularFrequency_mode1;
                const frequencyHz = angularFrequency / (2 * Math.PI);
                
                const listItem = document.createElement('li');
                listItem.textContent = `Rod ${index + 1}: ${frequencyHz.toFixed(2)} Hz`;
                listElement.appendChild(listItem);
            }
        });
    }

    async initAudio() {
        // Part 1: Handle existing audioContext or complete its setup
        if (this.audioContext) {
            if (!this.analyser) {
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 2048; 
                this.analyser.smoothingTimeConstant = 0.8;
            }
            // Ensure data arrays are correct for the existing/newly_created analyser
            if (!this.dataArray || this.dataArray.length !== this.analyser.frequencyBinCount) {
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            }
            if (!this.timeDomainDataArray || this.timeDomainDataArray.length !== this.analyser.fftSize) {
                this.timeDomainDataArray = new Uint8Array(this.analyser.fftSize);
            }
            // Ensure audioGenerator (if it exists) has the context
            if (this.audioGenerator && !this.audioGenerator.audioContext) {
                this.audioGenerator.audioContext = this.audioContext;
            } else if (!this.audioGenerator) {
                // If audio context exists but generator doesn't, initialize generator and give it context
                this.initAudioGenerator(); // Assuming this synchronous method exists
                if (this.audioGenerator) this.audioGenerator.audioContext = this.audioContext;
            }
            return true;
        }

        // Part 2: Create new audioContext and all dependencies
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Ensure audioGenerator is initialized and gets the context
            if (!this.audioGenerator) {
                this.initAudioGenerator(); 
            }
            // It's possible initAudioGenerator itself might try to create an AudioContext
            // so we ensure it uses *this* one.
            if (this.audioGenerator) {
                 this.audioGenerator.audioContext = this.audioContext;
            }
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            this.timeDomainDataArray = new Uint8Array(this.analyser.fftSize);
            
            return true;
        } catch (error) {
            console.error('音频初始化失败:', error);
            alert('无法初始化音频系统，部分功能可能无法使用。'); 
            return false;
        }
    }

    async loadAudioFile(file) {
        if (!this.audioContext) {
            await this.initAudio();
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                this.audioContext.decodeAudioData(event.target.result)
                    .then(audioBuffer => {
                        this.currentAudioBuffer = audioBuffer;
                        this.setupAudioSource(audioBuffer);
                        resolve();
                    })
                    .catch(reject);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async generateAudio(type) {
        if (!this.audioContext) {
            await this.initAudio();
        }

        let audioBuffer;
        const duration = 10; // 10秒的音频

        switch (type) {
            case 'sweep':
                audioBuffer = this.audioGenerator.generateSweep(20, 2000, duration, 0.3);
                break;
            case 'complex':
                audioBuffer = this.audioGenerator.generateComplexTone([220, 440, 880, 1760], duration, 0.25);
                break;
            case 'beat':
                audioBuffer = this.audioGenerator.generateBeat(440, 4, duration, 0.4);
                break;
            case 'harmonic':
                audioBuffer = this.audioGenerator.generateComplexTone([261.63, 329.63, 392.00, 523.25], duration, 0.25); // C大调和弦
                break;
            default:
                throw new Error('未知的音频类型');
        }

        this.currentAudioBuffer = audioBuffer;
        this.setupAudioSource(audioBuffer);
    }

    createAndSetupAudioSourceNode(audioBuffer) {
        // If there was a previously active this.audioSource, its onended might still fire.
        // We don't need to disconnect it here as we are returning a NEW node.
        // The old this.audioSource (if any) will be naturally replaced if play() is successful.

        if (!this.audioContext) {
            console.error("AudioContext not available in createAndSetupAudioSourceNode.");
            return null;
        }
        if (!this.analyser) {
            console.error("AnalyserNode not available in createAndSetupAudioSourceNode.");
            // Optionally, connect directly to destination if analyser is missing, or handle error.
            // return null; // Or connect to destination as fallback
        }

        const newSource = this.audioContext.createBufferSource();
        if (!newSource) {
            console.error("Failed to create AudioBufferSourceNode.");
            return null;
        }

        newSource.buffer = audioBuffer;
        if (this.analyser) {
            newSource.connect(this.analyser); // Connect new source to the analyser
        } else {
            // Fallback or error: if no analyser, connect to destination or log error
            console.warn("No analyser node, connecting source directly to destination.");
            newSource.connect(this.audioContext.destination);
        }

        // The onended for *this specific newSource instance*
        newSource.onended = () => {
            console.log("Audio source node ended:", newSource);
            // Check if the source that just ended is still the one referenced by this.audioSource
            if (this.audioSource === newSource) {
                this.isPlaying = false;
                this.audioSource = null; // Clear the reference to the ended source

                const playButton = document.getElementById('playButton');
                const pauseButton = document.getElementById('pauseButton');
                // Stop button state depends on whether there's something to stop/play again.
                // For now, onended means playback stopped, so play can be re-enabled.
                if (playButton) playButton.disabled = false;
                if (pauseButton) pauseButton.disabled = true;
            } else {
                // This onended event is for a source that is no longer the active this.audioSource.
                // This can happen if playback was stopped and restarted quickly with a new source.
                // No state changes should be made based on this old source ending.
                console.log("onended fired for a non-active/replaced source.");
            }
        };
        return newSource;
    }

    play(frequency = null) {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log("AudioContext resumed. Please click play again.");
                // Update UI to inform user to click play again or automatically retry play?
                // For now, user must click again. Ensure buttons reflect this.
                this.isPlaying = false; // Context was suspended, so not playing.
                const playButton = document.getElementById('playButton');
                if (playButton) playButton.disabled = false; // Allow user to click play again
            });
            return; // Important: exit play method after requesting resume.
        }

        let bufferToPlay = null;
        if (frequency && this.audioGenerator) {
            this.showLoading(true);
            const duration = 5;
            bufferToPlay = this.audioGenerator.generateSineWave(frequency, duration);
            this.currentAudioBuffer = bufferToPlay; // Update main current buffer
            this.showLoading(false);
        } else if (this.currentAudioBuffer) {
            bufferToPlay = this.currentAudioBuffer;
        }

        if (bufferToPlay && !this.isPlaying) {
            // Stop and clear any existing source before creating a new one.
            // This ensures that we are not leaving any old sources in an ambiguous state.
            if (this.audioSource) {
                try {
                    this.audioSource.onended = null; // Remove old onended handler
                    this.audioSource.stop(); // Stop it if it's somehow playing
                } catch (e) { /* ignore errors stopping an already stopped source */ }
                this.audioSource.disconnect();
                this.audioSource = null;
            }

            const sourceNodeToStart = this.createAndSetupAudioSourceNode(bufferToPlay);
            
            if (sourceNodeToStart) {
                try {
                    sourceNodeToStart.start(0, this.audioElement ? this.audioElement.currentTime : 0);
                    this.audioSource = sourceNodeToStart; // NOW assign to this.audioSource
                    this.isPlaying = true;
                    console.log("Playing audio with new source:", this.audioSource);

                    const playButton = document.getElementById('playButton');
                    const pauseButton = document.getElementById('pauseButton');
                    const stopButton = document.getElementById('stopButton');
                    if (playButton) playButton.disabled = true;
                    if (pauseButton) pauseButton.disabled = false;
                    if (stopButton) stopButton.disabled = false;
                } catch (e) {
                    console.error("Error starting audio source:", e);
                    this.isPlaying = false; // Ensure isPlaying is false if start fails
                    this.audioSource = null; // Clear if start failed
                    const playButton = document.getElementById('playButton');
                    if (playButton) playButton.disabled = false; // Re-enable play button
                }
            } else {
                console.warn("Failed to create and setup audio source for playback.");
                const playButton = document.getElementById('playButton');
                if(playButton) playButton.disabled = false;
            }
        } else if (this.isPlaying) {
            console.log("Audio is already playing.");
        } else if (!bufferToPlay) {
            console.warn("Cannot play. No buffer available.");
            alert("请先加载或生成音频。");
        }
    }

    pause() {
        if (this.audioSource && this.isPlaying) {
            this.audioContext.suspend();
            
            // 暂停时不给杆子施加新的冲击，但让现有振动自然衰减
            // 这通过在updateVisualization中检查isPlaying状态来实现
        }
    }

    resume() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    stop() {
        if (this.audioSource) {
            this.audioSource.stop();
            this.audioSource = null;
            this.isPlaying = false;
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // 停止时重置所有杆子的振动状态
        this.rods.forEach(rodGroup => {
            if (rodGroup.userData.vibrator) {
                rodGroup.userData.vibrator.reset();
            }
        });
    }

    setVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    updateVisualization() {
        if (!this.analyser || !this.dataArray) return;

        const deltaTime = this.clock.getDelta();
        const totalTime = this.clock.getElapsedTime();

        // 只有在播放时才获取音频数据并施加冲击
        if (this.isPlaying) {
            this.analyser.getByteFrequencyData(this.dataArray);
            if (this.timeDomainDataArray) {
                this.analyser.getByteTimeDomainData(this.timeDomainDataArray); // 获取时域数据
                this.drawWaveform(); // 绘制波形图
            }
            
            // 更新杆子的振动
            for (let i = 0; i < this.rods.length && i < this.dataArray.length; i++) {
                const rodGroup = this.rods[i];
                const userData = rodGroup.userData;
                const frequencyValue = this.dataArray[i] / 255; // 归一化到0-1
                
                // 音频冲击力（只在有音频时产生冲击）
                const impulseStrength = frequencyValue * 0.1; // 调整冲击强度
                
                if (frequencyValue > 0.05) { // 调整阈值
                    userData.vibrator.applyImpulse(impulseStrength);
                }
                
                // 调用振动器的更新方法
                userData.vibrator.update(deltaTime, totalTime);
                
                // 更新颜色亮度 (基于原始杆子网格的材质)
                const hue = (i / this.rods.length) * 360;
                const lightness = 0.4 + frequencyValue * 0.6;
                userData.rod.material.color.setHSL(hue / 360, 0.8, lightness);
            }

            // 让球体根据整体音量旋转
            const averageVolume = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length / 255;
            this.sphere.rotation.y += averageVolume * 0.05;
            this.sphere.rotation.x += averageVolume * 0.02;
            
            // 根据音量调整球体颜色
            const intensity = Math.min(1, averageVolume * 2);
            this.sphere.material.color.setHSL(0.6 + intensity * 0.3, 0.8, 0.3 + intensity * 0.4);
        } else {
            // 暂停或停止时
            if (this.waveformCtx && this.waveformCanvas) {
                this.waveformCtx.clearRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height); // 清除波形图
            }
            // 暂停时：不施加新冲击，但继续更新现有振动以让它们自然衰减
            for (let i = 0; i < this.rods.length; i++) {
                const rodGroup = this.rods[i];
                const userData = rodGroup.userData;
                
                // 只更新现有振动，不施加新冲击
                userData.vibrator.update(deltaTime, totalTime);
                
                // 恢复默认颜色
                const hue = (i / this.rods.length) * 360;
                userData.rod.material.color.setHSL(hue / 360, 0.7, 0.6);
            }
            
            // 恢复球体默认颜色
            this.sphere.material.color.setHSL(0.6, 0.8, 0.3);
        }
    }

    drawWaveform() {
        if (!this.waveformCtx || !this.waveformCanvas || !this.timeDomainDataArray) return;

        const ctx = this.waveformCtx;
        const canvas = this.waveformCanvas;
        const data = this.timeDomainDataArray;
        const sliceWidth = canvas.width * 1.0 / this.analyser.fftSize;

        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgb(0, 200, 0)'; // 绿色波形
        ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除上一帧
        
        ctx.beginPath();
        let x = 0;

        for (let i = 0; i < this.analyser.fftSize; i++) {
            const v = data[i] / 128.0; // 归一化到 0-2
            const y = v * canvas.height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.updateVisualization();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    bindEvents() {
        const audioFileInput = document.getElementById('audioFile');
        const playButton = document.getElementById('playButton');
        const pauseButton = document.getElementById('pauseButton');
        const stopButton = document.getElementById('stopButton');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValueDisplay = document.getElementById('volumeValue');
        const trackButtons = document.querySelectorAll('.track-button');
        const frequencySlider = document.getElementById('frequencySlider');
        const frequencyInput = document.getElementById('frequencyInput');

        if (audioFileInput) {
            audioFileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    this.showLoading(true);
                    await this.loadAudioFile(file);
                    this.showLoading(false);
                    if(playButton) playButton.disabled = false;
                    if(pauseButton) pauseButton.disabled = true; 
                    if(stopButton) stopButton.disabled = true;
                }
            });
        }

        if (playButton) {
            playButton.addEventListener('click', async () => {
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    await this.resume();
                } else if (this.currentAudioBuffer) {
                    this.play();
                } else if (frequencySlider && frequencySlider.value) { 
                    const selectedFrequency = parseFloat(frequencySlider.value);
                    if (!isNaN(selectedFrequency) && selectedFrequency >= 1 && selectedFrequency <= 2000) {
                        this.showLoading(true);
                        // const duration = 5; // Duration is handled within play(frequency) if it generates

                        // Ensure audio system is fully initialized.
                        if (!await this.initAudio()) { 
                            this.showLoading(false);
                            return; 
                        }

                        // At this point, this.audioGenerator.audioContext should be set by initAudio.
                        // Add a sanity check for audioGenerator itself and its context.
                        if (!this.audioGenerator || !this.audioGenerator.audioContext) {
                            console.error("AudioGenerator or its context is not properly initialized.");
                            alert("音频生成器初始化错误，无法播放选定频率。");
                            this.showLoading(false);
                            return;
                        }

                        // Call play with the selected frequency directly.
                        // The play method will handle generating the sine wave and setting up the source.
                        this.play(selectedFrequency);
                        // showLoading(false) is now handled within play(frequency) if it generates the buffer
                        // However, play() itself does showLoading(true) and showLoading(false) only if frequency is passed.
                        // If play() is called for an existing buffer, it does not manage showLoading.
                        // So, if play(selectedFrequency) internally does showLoading(false), we might not need it here.
                        // Let's assume play(selectedFrequency) handles its own loading indicators for generation.
                        // The initial showLoading(true) can remain, and play(selectedFrequency) will call showLoading(false).

                    } else {
                        alert("请选择一个1-2000Hz之间的有效频率。");
                        // return; // No need for showLoading(false) here as it wasn't shown or error occurs before play
                    }
                } else {
                    alert("请先上传音频文件、选择生成的音轨或指定一个频率。");
                    // return; // Likewise
                }
                // Button state updates should happen after play attempts or if play logic handles it.
                // If play() is now asynchronous due to generation, these might need adjustment.
                // For now, assume play() makes these decisions or they are handled by onended.
                if(playButton) playButton.disabled = true;
                if(pauseButton) pauseButton.disabled = false;
                if(stopButton) stopButton.disabled = false;
            });
        }

        if (pauseButton) {
            pauseButton.addEventListener('click', () => {
                this.pause();
                if(playButton) playButton.disabled = false;
                if(pauseButton) pauseButton.disabled = true;
            });
        }

        if (stopButton) {
            stopButton.addEventListener('click', () => {
                this.stop();
                if(playButton) playButton.disabled = false;
                if(pauseButton) pauseButton.disabled = true;
                if(stopButton) stopButton.disabled = true;
            });
        }

        if (volumeSlider && volumeValueDisplay) {
            volumeSlider.addEventListener('input', (event) => {
                const volume = parseFloat(event.target.value);
                this.setVolume(volume);
                volumeValueDisplay.textContent = `${Math.round(volume * 100)}%`;
            });
        }

        if (trackButtons) {
            trackButtons.forEach(button => {
                button.addEventListener('click', async () => {
                    const type = button.dataset.type;
                    this.showLoading(true);
                    await this.generateAudio(type); // This will call setupAudioSource and set currentAudioBuffer
                    this.showLoading(false);
                    if(playButton) playButton.disabled = false; // Enable play after generating
                    if(pauseButton) pauseButton.disabled = true;
                    if(stopButton) stopButton.disabled = true;
                });
            });
        }

        // Frequency slider and input listeners are in index.html, so no need to redeclare here.
        // However, we might need to ensure play button state is updated if frequency changes
        // while audio is not playing.
        if (frequencySlider) {
             frequencySlider.addEventListener('input', () => {
                 if (!this.isPlaying && playButton) {
                     playButton.disabled = false; // Allow playing new frequency
                 }
             });
        }
        if (frequencyInput) {
            frequencyInput.addEventListener('input', () => {
                if (!this.isPlaying && playButton) {
                    playButton.disabled = false; // Allow playing new frequency
                }
            });
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }
}

// 初始化应用
window.addEventListener('load', () => {
    new SoundTree();
}); 