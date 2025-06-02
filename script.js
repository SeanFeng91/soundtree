class SoundTree {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.rods = [];
        this.sphere = null;
        
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

        // 创建地面
        this.createGround();
    }

    createRods() {
        this.rods = [];
        
        for (let i = 0; i < this.rodCount; i++) {
            // 计算杆子的位置和方向
            const phi = Math.acos(-1 + (2 * i) / this.rodCount);
            const theta = Math.sqrt(this.rodCount * Math.PI) * phi;
            
            // 杆子长度基于频率索引，低频杆子更长
            const baseLength = this.maxRodHeight - (i / this.rodCount) * (this.maxRodHeight - this.minRodHeight);
            
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
            
            // 计算杆子应该指向的目标点（球心外侧）
            const targetPoint = new THREE.Vector3().addVectors(rodGroup.position, direction);
            
            // 让杆子组朝向正确的方向（从球心向外）
            rodGroup.lookAt(targetPoint);
            
            rodGroup.castShadow = true;
            rodGroup.receiveShadow = true;
            
            // 保存原始信息到组的userData中，添加物理属性
            rodGroup.userData = {
                originalLength: baseLength,
                attachmentPoint: new THREE.Vector3(x, y, z),
                direction: direction.clone(),
                frequencyIndex: i,
                rod: rod,
                originalRotation: rodGroup.rotation.clone(),
                // 物理属性
                angularVelocityX: 0,
                angularVelocityZ: 0,
                currentAngleX: 0,
                currentAngleZ: 0,
                damping: 0.95, // 阻尼系数，越小阻尼越大
                springiness: 0.1 // 回弹力
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

    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioGenerator.audioContext = this.audioContext;
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            return true;
        } catch (error) {
            console.error('音频初始化失败:', error);
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

    setupAudioSource(audioBuffer) {
        // 停止当前播放
        this.stop();

        // 创建增益节点用于音量控制
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 0.5;

        // 连接到分析器
        this.gainNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        // 启用播放控制
        document.getElementById('playButton').disabled = false;
        document.getElementById('pauseButton').disabled = false;
        document.getElementById('stopButton').disabled = false;
    }

    play() {
        if (this.currentAudioBuffer && !this.isPlaying) {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // 创建新的音频源
            this.audioSource = this.audioContext.createBufferSource();
            this.audioSource.buffer = this.currentAudioBuffer;
            this.audioSource.loop = true;
            this.audioSource.connect(this.gainNode);
            
            this.audioSource.start();
            this.isPlaying = true;
        }
    }

    pause() {
        if (this.audioSource && this.isPlaying) {
            this.audioContext.suspend();
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
    }

    setVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    updateVisualization() {
        if (!this.analyser || !this.dataArray || !this.isPlaying) return;

        this.analyser.getByteFrequencyData(this.dataArray);

        // 更新杆子的振动
        for (let i = 0; i < this.rods.length && i < this.dataArray.length; i++) {
            const rodGroup = this.rods[i];
            const userData = rodGroup.userData;
            const frequencyValue = this.dataArray[i] / 255; // 归一化到0-1
            
            // 音频冲击力（只在有音频时产生冲击）
            const impulseStrength = frequencyValue * 0.3; // 冲击强度
            const maxImpulse = Math.PI / 20; // 最大冲击角度
            
            // 当有足够强的音频信号时，给杆子一个冲击
            if (frequencyValue > 0.1) {
                const impulseX = (Math.random() - 0.5) * impulseStrength * maxImpulse;
                const impulseZ = (Math.random() - 0.5) * impulseStrength * maxImpulse;
                
                // 添加到角速度
                userData.angularVelocityX += impulseX;
                userData.angularVelocityZ += impulseZ;
            }
            
            // 物理模拟：弹簧阻尼系统
            // 计算回弹力（试图回到原始位置）
            const restoreForceX = -userData.currentAngleX * userData.springiness;
            const restoreForceZ = -userData.currentAngleZ * userData.springiness;
            
            // 更新角速度（考虑回弹力）
            userData.angularVelocityX += restoreForceX;
            userData.angularVelocityZ += restoreForceZ;
            
            // 应用阻尼
            userData.angularVelocityX *= userData.damping;
            userData.angularVelocityZ *= userData.damping;
            
            // 更新角度
            userData.currentAngleX += userData.angularVelocityX;
            userData.currentAngleZ += userData.angularVelocityZ;
            
            // 应用旋转
            rodGroup.rotation.copy(userData.originalRotation);
            rodGroup.rotateX(userData.currentAngleX);
            rodGroup.rotateZ(userData.currentAngleZ);
            
            // 更新颜色亮度
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
        // 文件上传
        document.getElementById('audioFile').addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                this.showLoading(true);
                try {
                    await this.loadAudioFile(file);
                    this.showLoading(false);
                } catch (error) {
                    console.error('加载音频文件失败:', error);
                    alert('音频文件加载失败，请尝试其他格式的文件');
                    this.showLoading(false);
                }
            }
        });

        // 生成音频按钮
        document.querySelectorAll('.track-button').forEach(button => {
            button.addEventListener('click', async () => {
                const type = button.dataset.type;
                this.showLoading(true);
                try {
                    await this.generateAudio(type);
                    this.showLoading(false);
                } catch (error) {
                    console.error('生成音频失败:', error);
                    alert('音频生成失败，请重试');
                    this.showLoading(false);
                }
            });
        });

        // 播放控制
        document.getElementById('playButton').addEventListener('click', () => {
            this.play();
        });

        document.getElementById('pauseButton').addEventListener('click', () => {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.resume();
            }
        });

        document.getElementById('stopButton').addEventListener('click', () => {
            this.stop();
        });

        // 音量控制
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValue = document.getElementById('volumeValue');
        
        volumeSlider.addEventListener('input', (event) => {
            const volume = parseFloat(event.target.value);
            this.setVolume(volume);
            volumeValue.textContent = Math.round(volume * 100) + '%';
        });
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