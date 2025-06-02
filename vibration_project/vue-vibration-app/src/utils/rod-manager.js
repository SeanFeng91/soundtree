/**
 * 杆件管理模块
 * 管理多个杆件的创建、更新和可视化
 */

import { MaterialProperties } from './materials.js';
import { VibrationCalculator } from './vibration-calc.js';

// 创建模块实例
const materialProperties = new MaterialProperties();
const vibrationCalculator = new VibrationCalculator();

class RodManager {
    constructor() {
        // 场景对象（延迟初始化）
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.rods = [];
        this.originalPositions = [];
        this.currentTime = 0;
        this.isPlaying = false;
        this.clock = null; // 延迟初始化
        this.container = null;
        this.selectedRodIndex = 4; // 默认选择第5根杆件
        
        // 振动参数
        this.excitationFreq = 100;
        this.excitationAmp = 0.1;
        this.damping = 0.02;
        this.timeScale = 1.0;
        this.currentMaterial = 'steel';
        
        // 杆件配置
        this.rodCount = 10;
        this.startLength = 20;  // mm
        this.lengthStep = 10;   // mm
        this.diameter = 2.0;    // mm
    }

    /**
     * 初始化3D场景
     * @param {HTMLElement} container - 容器元素
     */
    init(container) {
        console.log('[RodManager.init] 开始初始化3D场景，容器:', container);
        // 检查THREE是否已加载
        if (typeof THREE === 'undefined') {
            console.error('[RodManager.init] THREE.js 尚未加载，无法初始化3D场景');
            return false;
        }
        
        this.container = container;
        this.clock = new THREE.Clock(); // 在这里创建clock
        this.setupScene();
        this.setupLighting();
        this.createAllRods();
        this.setupControls();
        this.startAnimation();
        console.log('[RodManager.init] 3D场景初始化完毕。');
        return true;
    }

    /**
     * 设置3D场景
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1f2937);

        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(0, 0.1, 0.3);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * 设置光照
     */
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x606060, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1).normalize();
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0x60a5fa, 0.5);
        pointLight.position.set(0, 0.2, 0.2);
        this.scene.add(pointLight);
    }

    /**
     * 创建所有杆件
     */
    createAllRods() {
        this.clearRods();
        
        const material = materialProperties.getMaterial(this.currentMaterial);
        const spacing = 0.015; // 杆件间距 (m)
        const startX = -(this.rodCount - 1) * spacing / 2;

        for (let i = 0; i < this.rodCount; i++) {
            const length = (this.startLength + i * this.lengthStep) / 1000; // mm to m
            const radius = this.diameter / 2000; // mm to m
            const x = startX + i * spacing;

            const rod = this.createSingleRod(length, radius, material.color);
            rod.position.set(x, 0, 0);
            rod.userData = {
                index: i,
                length: length,
                radius: radius,
                material: material,
                naturalFrequencies: materialProperties.calculateAllModalFrequencies(
                    length * 1000, this.diameter, material
                )
            };

            this.scene.add(rod);
            this.rods.push(rod);
            this.originalPositions.push(this.storeOriginalPositions(rod));
        }

        console.log(`[RodManager.createAllRods] 创建了 ${this.rods.length} 个杆件。`);
        if (this.rods.length > 0) {
            console.log('[RodManager.createAllRods] 第一个杆件位置:', this.rods[0].position);
            console.log('[RodManager.createAllRods] 第一个杆件userData:', this.rods[0].userData);
        }

        this.updateCameraView();
    }

    /**
     * 创建单个杆件
     * @param {number} length - 长度 (m)
     * @param {number} radius - 半径 (m)
     * @param {number} color - 颜色
     * @returns {THREE.Mesh} 杆件网格
     */
    createSingleRod(length, radius, color) {
        const heightSegments = 32;
        const geometry = new THREE.CylinderGeometry(radius, radius, length, 8, heightSegments);
        geometry.translate(0, length / 2, 0); // 底部固定

        const material = new THREE.MeshPhongMaterial({ 
            color: color, 
            shininess: 80,
            transparent: true,
            opacity: 0.9
        });

        const rod = new THREE.Mesh(geometry, material);
        rod.castShadow = true;
        rod.receiveShadow = true;

        // 添加底座
        const baseGeometry = new THREE.CylinderGeometry(radius * 1.5, radius * 1.5, radius * 0.5, 8);
        const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = radius * 0.25;
        rod.add(base);

        return rod;
    }

    /**
     * 存储原始顶点位置
     * @param {THREE.Mesh} rod - 杆件
     * @returns {Float32Array} 原始位置
     */
    storeOriginalPositions(rod) {
        return rod.geometry.attributes.position.clone();
    }

    /**
     * 清除所有杆件
     */
    clearRods() {
        this.rods.forEach(rod => {
            this.scene.remove(rod);
            rod.geometry.dispose();
            rod.material.dispose();
        });
        this.rods = [];
        this.originalPositions = [];
    }

    /**
     * 更新相机视角
     */
    updateCameraView() {
        if (this.rods.length > 0) {
            const maxLength = Math.max(...this.rods.map(rod => rod.userData.length));
            this.camera.position.set(0, maxLength * 0.8, maxLength * 1.2);
            this.camera.lookAt(0, maxLength * 0.4, 0);
            console.log('[RodManager.updateCameraView] 相机位置:', this.camera.position);
            console.log('[RodManager.updateCameraView] 相机观察点 (target for lookAt): Vector3(0, ' + maxLength * 0.4 + ', 0)');
        }
    }

    /**
     * 更新杆件变形
     */
    updateRodDeformation() {
        const visualizationData = {
            waveformData: [],
            frequencyData: []
        };
        
        this.rods.forEach((rod, index) => {
            const userData = rod.userData;
            const originalPos = this.originalPositions[index];
            const positions = rod.geometry.attributes.position;

            // 获取该杆件的第一阶自然频率
            const firstModeFreq = userData.naturalFrequencies[0]?.frequency || 100;
            
            // 计算频率比和共振效应
            const frequencyRatio = this.excitationFreq / firstModeFreq;
            const dampingRatio = this.damping;
            
            // 计算幅度放大因子（共振时会显著增大）
            const denominator = Math.sqrt(
                Math.pow(1 - frequencyRatio * frequencyRatio, 2) + 
                Math.pow(2 * dampingRatio * frequencyRatio, 2)
            );
            const magnificationFactor = 1 / Math.max(denominator, 0.01); // 防止除零
            
            // 计算相位延迟
            const phaseDelay = Math.atan2(
                2 * dampingRatio * frequencyRatio, 
                1 - frequencyRatio * frequencyRatio
            );
            
            // 该杆件的实际振动幅度（考虑共振效应）
            const effectiveAmplitude = this.excitationAmp * magnificationFactor * 0.001; // 转换为米
            
            // 限制最大振幅以避免过度变形
            const maxAmplitude = userData.length * 0.1; // 最大不超过杆长的10%
            const limitedAmplitude = Math.min(effectiveAmplitude, maxAmplitude);
            
            // 收集可视化数据 - 选择用户指定的杆件作为代表
            if (index === this.selectedRodIndex) {
                // 添加波形数据点
                visualizationData.waveformData.push({
                    time: this.currentTime,
                    amplitude: limitedAmplitude * Math.sin(2 * Math.PI * this.excitationFreq * this.currentTime - phaseDelay)
                });
            }
            
            // 添加频率响应数据
            visualizationData.frequencyData.push({
                rodIndex: index + 1, // 杆件编号从1开始
                frequency: firstModeFreq,
                amplitude: magnificationFactor,
                isResonant: Math.abs(this.excitationFreq - firstModeFreq) / firstModeFreq <= 0.08
            });

            for (let i = 0; i < positions.count; i++) {
                const origX = originalPos.getX(i);
                const origY = originalPos.getY(i);
                const origZ = originalPos.getZ(i);

                // 将Y坐标转换为沿杆长度的位置（0到L）
                const positionAlongRod = (origY + userData.length / 2);
                const normalizedPosition = positionAlongRod / userData.length;
                
                // 悬臂梁第一阶模态形状函数（简化）
                // 实际的模态形状更复杂，这里用简化的正弦函数
                const modeShape = normalizedPosition * normalizedPosition; // 二次函数近似悬臂梁形状
                
                // 计算该点的位移（在X方向，模拟侧向弯曲）
                const displacement = limitedAmplitude * modeShape * 
                    Math.sin(2 * Math.PI * this.excitationFreq * this.currentTime - phaseDelay);

                // 应用位移（主要在X方向弯曲）
                positions.setX(i, origX + displacement);
                positions.setY(i, origY);
                positions.setZ(i, origZ);
            }

            positions.needsUpdate = true;
            rod.geometry.computeVertexNormals();

            // 检查共振状态（用于可视化效果）
            this.updateRodResonanceStatus(rod, index);
        });
        
        // 更新可视化图表
        this.updateVisualization(visualizationData);
    }
    
    /**
     * 更新可视化图表
     * @param {Object} data - 可视化数据
     */
    updateVisualization(data) {
        if (typeof window !== 'undefined' && window.visualization) {
            // 更新波形图 - 保持最近6秒的数据
            if (data.waveformData.length > 0) {
                if (!this.waveformBuffer) {
                    this.waveformBuffer = [];
                }
                this.waveformBuffer.push(...data.waveformData);
                
                // 只保留最近6秒的数据
                const timeWindow = 6.0;
                const cutoffTime = this.currentTime - timeWindow;
                this.waveformBuffer = this.waveformBuffer.filter(point => point.time >= cutoffTime);
                
                window.visualization.updateWaveformPlot(this.waveformBuffer);
            }
            
            // 更新频率响应图
            if (data.frequencyData.length > 0) {
                window.visualization.updateFrequencyPlot(data.frequencyData);
            }
            
            // 更新共振分析图表
            if (data.frequencyData.length > 0) {
                const resonanceData = data.frequencyData.map(rod => ({
                    length: (this.startLength + (rod.rodIndex - 1) * this.lengthStep), // mm，使用rodIndex-1因为rodIndex从1开始
                    naturalFreq: rod.frequency,
                    isResonant: rod.isResonant
                }));
                window.visualization.updateResonancePlot(resonanceData, this.excitationFreq);
            }
        }
    }

    /**
     * 更新杆件共振状态
     * @param {THREE.Mesh} rod - 杆件
     * @param {number} index - 索引
     */
    updateRodResonanceStatus(rod, index) {
        const userData = rod.userData;
        
        // 只考虑第一阶模态的共振
        const firstModeFreq = userData.naturalFrequencies[0]?.frequency || 100;
        const frequencyRatio = this.excitationFreq / firstModeFreq;
        const magnification = 1 / Math.sqrt(
            Math.pow(1 - frequencyRatio * frequencyRatio, 2) + 
            Math.pow(2 * this.damping * frequencyRatio, 2)
        );
        
        // 检查是否接近第一阶共振
        const isResonant = vibrationCalculator.isResonant(this.excitationFreq, firstModeFreq, 0.08);

        // 根据放大因子和振动状态调整颜色
        if (isResonant && magnification > 3.0) {
            // 强共振：亮红色
            rod.material.color.setHex(0xff4444);
            rod.material.emissive.setHex(0x440000);
        } else if (magnification > 2.0) {
            // 中等共振：橙色
            rod.material.color.setHex(0xff8800);
            rod.material.emissive.setHex(0x220000);
        } else if (magnification > 1.5) {
            // 轻微共振：黄色
            rod.material.color.setHex(0xffdd00);
            rod.material.emissive.setHex(0x110000);
        } else {
            // 非共振状态：恢复原始颜色
            rod.material.color.setHex(userData.material.color);
            rod.material.emissive.setHex(0x000000);
        }
    }

    /**
     * 设置激励参数
     * @param {Object} params - 参数对象
     */
    setExcitationParams(params) {
        if (params.frequency !== undefined) this.excitationFreq = params.frequency;
        if (params.amplitude !== undefined) this.excitationAmp = params.amplitude;
        if (params.damping !== undefined) this.damping = params.damping;
        if (params.timeScale !== undefined) this.timeScale = params.timeScale;
    }

    /**
     * 设置杆件参数
     * @param {Object} params - 参数对象
     */
    setRodParams(params) {
        let needsRecreate = false;

        if (params.count !== undefined && params.count !== this.rodCount) {
            this.rodCount = params.count;
            needsRecreate = true;
        }
        if (params.startLength !== undefined && params.startLength !== this.startLength) {
            this.startLength = params.startLength;
            needsRecreate = true;
        }
        if (params.lengthStep !== undefined && params.lengthStep !== this.lengthStep) {
            this.lengthStep = params.lengthStep;
            needsRecreate = true;
        }
        if (params.diameter !== undefined && params.diameter !== this.diameter) {
            this.diameter = params.diameter;
            needsRecreate = true;
        }

        if (needsRecreate) {
            this.createAllRods();
        }
    }

    /**
     * 设置材料类型
     * @param {string} materialType - 材料类型
     */
    setMaterial(materialType) {
        if (this.currentMaterial !== materialType) {
            this.currentMaterial = materialType;
            this.createAllRods();
        }
    }

    /**
     * 设置自定义材料参数
     * @param {number} youngModulus - 杨氏模量 (GPa)
     * @param {number} density - 密度 (kg/m³)
     */
    setCustomMaterial(youngModulus, density) {
        materialProperties.setCustomMaterial(youngModulus, density);
        if (this.currentMaterial === 'custom') {
            this.createAllRods();
        }
    }

    /**
     * 播放/暂停动画
     */
    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
    }

    /**
     * 重置动画
     */
    reset() {
        this.currentTime = 0;
        this.isPlaying = false;
        this.createAllRods();
    }

    /**
     * 设置控制器
     */
    setupControls() {
        // 添加鼠标控制
        this.renderer.domElement.addEventListener('wheel', (event) => {
            event.preventDefault();
            const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
            this.camera.position.multiplyScalar(zoomFactor);
        });

        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        this.renderer.domElement.addEventListener('mousedown', (event) => {
            isDragging = true;
            previousMousePosition = { x: event.clientX, y: event.clientY };
        });

        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (isDragging) {
                const deltaX = event.clientX - previousMousePosition.x;
                const deltaY = event.clientY - previousMousePosition.y;

                // 围绕Y轴旋转
                const spherical = new THREE.Spherical();
                spherical.setFromVector3(this.camera.position);
                spherical.theta -= deltaX * 0.01;
                spherical.phi += deltaY * 0.01;
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

                this.camera.position.setFromSpherical(spherical);
                this.camera.lookAt(0, 0, 0);

                previousMousePosition = { x: event.clientX, y: event.clientY };
            }
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    /**
     * 开始动画循环
     */
    startAnimation() {
        const animate = () => {
            requestAnimationFrame(animate);

            if (this.isPlaying) {
                const deltaTime = this.clock.getDelta() * this.timeScale;
                this.currentTime += deltaTime;
                this.updateRodDeformation();
            }

            if (this.controls) {
                this.controls.update();
            }
            this.renderer.render(this.scene, this.camera);
        };
        
        if (!this.clock.running) {
             this.clock.start();
        }
        animate();
    }

    /**
     * 窗口大小调整
     */
    onWindowResize() {
        if (this.container && this.camera && this.renderer) {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        }
    }

    /**
     * 获取所有杆件的状态信息
     * @returns {Array} 杆件状态数组
     */
    getRodStatusList() {
        return this.rods.map((rod, index) => {
            const userData = rod.userData;
            const naturalFreqs = userData.naturalFrequencies;
            const isResonant = naturalFreqs.some(freq => 
                vibrationCalculator.isResonant(this.excitationFreq, freq.frequency, 0.05)
            );

            return {
                index: index + 1,
                length: Math.round(userData.length * 1000), // m to mm
                naturalFrequencies: naturalFreqs.map(f => Math.round(f.frequency)),
                isResonant: isResonant,
                material: userData.material.name
            };
        });
    }

    /**
     * 设置选定的杆件索引
     * @param {number} index - 杆件索引（0开始）
     */
    setSelectedRodIndex(index) {
        this.selectedRodIndex = index;
    }
}

// ES6 模块导出
export { RodManager }; 