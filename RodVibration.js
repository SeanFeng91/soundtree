// RodVibration.js

// 物理常数 (参考 vibesimulate.py，可根据需要调整)
const E = 200e9;    // 杨氏模量 (Pa) - 钢的示例值
const rho = 7850;   // 密度 (kg/m^3) - 钢的示例值

/**
 * 计算圆形截面杆的几何属性
 * @param {number} radius - 杆的半径 (m)
 * @param {number} length - 杆的长度 (m)
 * @returns {{A: number, I: number, L: number}} 包含横截面积(A)，截面惯性矩(I)和长度(L)的对象
 */
function getRodGeometricProperties(radius, length) {
    const A = Math.PI * radius * radius; // 横截面积
    const I = (Math.PI / 4) * Math.pow(radius, 4); // 圆形截面的惯性矩
    return { A, I, L: length };
}

/**
 * 悬臂梁响应函数 (移植并调整自 vibesimulate.py)
 * @param {number} x_pos - 沿梁长度的位置 (0 到 L, 0为固定端)
 * @param {number} time - 当前时间 (s)
 * @param {number} excitationAngularFrequency - 激励角频率 (rad/s)
 * @param {number} excitationAmplitude - 激励幅度 (m, 指的是等效的静态力引起的末端位移或类似量度)
 * @param {number} rodLength - 梁的实际长度 (m)
 * @param {number} rodRadius - 梁的半径 (m)
 * @param {number} [mode=1] - 振动模态阶数 (1-4)
 * @param {number} [zeta=0.05] - 模态阻尼比
 * @returns {number} 在位置x_pos和时间time的位移 (m)
 */
function cantileverResponse(x_pos, time, excitationAngularFrequency, excitationAmplitude, rodLength, rodRadius, mode = 1, zeta = 0.05) {
    const { A, I, L } = getRodGeometricProperties(rodRadius, rodLength);

    if (L === 0 || A === 0 || I === 0) return 0; // 防止除以零

    // 确保 x_pos 在 [0, L] 范围内
    x_pos = Math.max(0, Math.min(x_pos, L));

    // 更精确的 lambda_n 值 (悬臂梁特征方程的根 kL = lambda_n)
    // cos(kL)cosh(kL) + 1 = 0
    const lambda_n_values = [1.87510407, 4.69409113, 7.85475744, 10.99554073];
    if (!(mode >= 1 && mode <= lambda_n_values.length)) {
        console.warn(`Mode must be between 1 and ${lambda_n_values.length}. Defaulting to 1.`);
        mode = 1;
    }
    const lambda_n = lambda_n_values[mode - 1];
    const beta = lambda_n / L; // beta_n = lambda_n / L

    // 模态形状函数 phi_n(x)
    const cosh_beta_x = Math.cosh(beta * x_pos);
    const cos_beta_x = Math.cos(beta * x_pos);
    const sinh_beta_x = Math.sinh(beta * x_pos);
    const sin_beta_x = Math.sin(beta * x_pos);

    // (cosh(lambda_n) + cos(lambda_n)) / (sinh(lambda_n) + sin(lambda_n))
    const sigma_n_numerator = Math.cosh(lambda_n) + Math.cos(lambda_n);
    const sigma_n_denominator = Math.sinh(lambda_n) + Math.sin(lambda_n);
    let sigma_n = 0;
    if (Math.abs(sigma_n_denominator) > 1e-9) {
        sigma_n = sigma_n_numerator / sigma_n_denominator;
    }

    const phi_x = (cosh_beta_x - cos_beta_x) - sigma_n * (sinh_beta_x - sin_beta_x);
    
    // 固有角频率 omega_n
    const omega_n = Math.pow(beta, 2) * Math.sqrt((E * I) / (rho * A));
    if (omega_n === 0) return 0;

    // 频率响应函数 H(omega) 的幅值 |H(omega_exc)|
    // H(s) = 1 / (s^2 + 2*zeta*omega_n*s + omega_n^2) -> s = j*omega_exc
    // |H(omega_exc)| = 1 / sqrt((omega_n^2 - omega_exc^2)^2 + (2*zeta*omega_n*omega_exc)^2)
    let H_magnitude;
    const omega_exc_sq = Math.pow(excitationAngularFrequency, 2);
    const omega_n_sq = Math.pow(omega_n, 2);
    
    const H_denominator_part1 = Math.pow(omega_n_sq - omega_exc_sq, 2);
    const H_denominator_part2 = Math.pow(2 * zeta * omega_n * excitationAngularFrequency, 2);
    const H_denominator_sqrt_arg = H_denominator_part1 + H_denominator_part2;

    if (H_denominator_sqrt_arg < 1e-9) { // 接近无阻尼共振或数值问题
        H_magnitude = 1 / (2 * zeta * omega_n * excitationAngularFrequency + 1e-9); // 避免除零，简化处理
        if (zeta < 1e-6) H_magnitude = 1e3; // 无阻尼时给一个大值
    } else {
        H_magnitude = 1 / Math.sqrt(H_denominator_sqrt_arg);
    }
    
    // 稳态响应 y(x,t) = phi_n(x) * q_n(t) * ScalingFactor
    // q_n(t) for harmonic excitation F0*sin(omega_exc*t) is proportional to H_magnitude * F0 * sin(omega_exc*t - phase_angle)
    // Here, excitationAmplitude is treated as a factor scaling the response magnitude.
    const responseDisplacement = excitationAmplitude * H_magnitude * phi_x * Math.sin(excitationAngularFrequency * time);

    return responseDisplacement;
}

class RodVibrator {
    constructor(rodMesh, rodBaseRadius, rodTipRadius, rodLength) {
        this.rodMesh = rodMesh;
        this.rodLength = rodLength;
        // 使用平均半径进行物理计算可能更合适，或根据具体情况选择
        this.rodEffectiveRadius = (rodBaseRadius + rodTipRadius) / 2;

        // 存储原始顶点位置，以便在其基础上进行变形
        // 注意: Three.js r125+ geometry.attributes.position is a BufferAttribute
        this.originalVertices = this.rodMesh.geometry.attributes.position.array.slice();
        this.numVertices = this.originalVertices.length / 3;

        // 振动参数
        this.currentTime = 0;
        this.targetExcitationAmplitude = 0; // 由音频脉冲驱动
        this.currentExcitationAmplitude = 0;
        
        // 用于驱动振幅的弹簧-阻尼系统参数 (模拟旧的 currentAngleX/Z 的动态行为)
        this.amplitudeVelocity = 0;
        this.amplitudeDamping = 0.95; // 振幅的阻尼
        this.amplitudeSpringiness = 0.1; // 振幅的回弹力

        // 设定一个激励频率，例如该杆件针对第一阶模态的固有频率
        // 或者由外部（如音频分析的频段）决定一个变化的目标激励频率
        const { A, I, L } = getRodGeometricProperties(this.rodEffectiveRadius, this.rodLength);
        const lambda_1 = 1.87510407;
        const beta_1 = lambda_1 / L;
        this.naturalAngularFrequency_mode1 = (L > 0 && A > 0 && I > 0) ? (Math.pow(beta_1, 2) * Math.sqrt((E * I) / (rho * A))) : 10; // 默认10rad/s
        this.excitationAngularFrequency = this.naturalAngularFrequency_mode1; // 默认以一阶固有频率激励
    }

    applyImpulse(strength) {
        // strength 是一个标量，表示冲击强度
        // 这个强度将驱动振动幅度的变化
        this.amplitudeVelocity += strength * 0.5; // 调整系数以获得合适的视觉效果
    }

    update(deltaTime, totalTime) {
        this.currentTime = totalTime;

        // 更新目标振幅 (弹簧-阻尼系统)
        const amplitudeRestPosition = 0;
        const displacementFromRest = this.targetExcitationAmplitude - amplitudeRestPosition;
        const springForce = -displacementFromRest * this.amplitudeSpringiness;
        
        this.amplitudeVelocity += springForce * deltaTime; // deltaTime scaling for spring force
        this.amplitudeVelocity *= Math.pow(this.amplitudeDamping, deltaTime * 60); // Frame-rate independent damping
        this.targetExcitationAmplitude += this.amplitudeVelocity * deltaTime; // deltaTime scaling for velocity

        // 当前振幅平滑过渡到目标振幅 (可选，或直接使用 targetExcitationAmplitude)
        this.currentExcitationAmplitude = this.targetExcitationAmplitude;

        // 如果振幅非常小，可以考虑恢复到原始形状并提前返回以优化性能
        if (Math.abs(this.currentExcitationAmplitude) < 0.0001 && Math.abs(this.amplitudeVelocity) < 0.0001) {
            if (!this.rodMesh.geometry.attributes.position.array.every((val, idx) => val === this.originalVertices[idx])) {
                this.rodMesh.geometry.attributes.position.array.set(this.originalVertices);
                this.rodMesh.geometry.attributes.position.needsUpdate = true;
                if (this.rodMesh.geometry.attributes.normal) {
                    this.rodMesh.geometry.computeVertexNormals(); // Recompute normals if geometry was reset
                }
            }
            return;
        }

        const positions = this.rodMesh.geometry.attributes.position.array;
        
        // 假设杆件沿其局部Y轴伸展，底部在Y=0 (或-L/2，取决于建模)
        // 在 script.js 中，杆子底部在 rodGroup 的原点，杆子向上伸展 baseLength / 2
        // 因此，顶点原始Y坐标 oy 的范围是 [0, rodLength] （如果已经调整过）
        // 或者 [-rodLength/2, rodLength/2] （如果未调整，中心在原点）
        // 对于 CylinderGeometry, 默认是中心在原点，高度为 rodLength.
        // rod.position.set(0, baseLength / 2, 0) 使得其底部在局部Y=0。
        // 所以原始的oy值从 -rodLength/2 到 rodLength/2。
        // 我们需要转换到 x_pos (0 at base, L at tip) for cantileverResponse.
        
        // 随机选择一个弯曲方向 (在杆的局部XZ平面内)
        // 为了演示，我们让它在局部X轴方向弯曲
        // 后续可以根据之前的 impulseX, impulseZ 逻辑来确定一个主导的弯曲方向和相位
        const bendDirection = new THREE.Vector3(1, 0, 0); // 示例：弯向局部X轴
        // 若要更复杂，可以用一个随时间变化的二维向量

        for (let i = 0; i < this.numVertices; i++) {
            const ox = this.originalVertices[i * 3 + 0];
            const oy_original = this.originalVertices[i * 3 + 1]; // 顶点原始Y坐标 (相对于圆柱中心)
            const oz = this.originalVertices[i * 3 + 2];

            // 将顶点原始Y坐标转换为沿梁的实际位置 x_pos (0为固定端, L为自由端)
            // 由于杆子已向上平移 rodLength/2，其局部Y坐标范围是 [0, rodLength]
            // 不对，CylinderGeometry的顶点数据仍然是相对于其自身中心的。
            // 即 oy_original 在 [-rodLength/2, rodLength/2] 之间。
            // x_pos = oy_original + rodLength/2
            const x_pos_along_beam = oy_original + this.rodLength / 2;

            const displacementMagnitude = cantileverResponse(
                x_pos_along_beam,
                this.currentTime,
                this.excitationAngularFrequency,
                this.currentExcitationAmplitude, // 作为激励幅度
                this.rodLength,
                this.rodEffectiveRadius,
                1, // mode
                0.03 // zeta (模态阻尼)
            );

            // 应用位移。位移方向垂直于杆 (Y轴)
            // 这里简单地将位移应用在预设的 bendDirection (局部X轴)
            positions[i * 3 + 0] = ox + displacementMagnitude * bendDirection.x;
            positions[i * 3 + 1] = oy_original; // Y轴(杆长方向)的原始位置不变 (对于纯弯曲)
            positions[i * 3 + 2] = oz + displacementMagnitude * bendDirection.z;
        }

        this.rodMesh.geometry.attributes.position.needsUpdate = true;
        // 变形后需要重新计算法线以保证光照正确
        if (this.rodMesh.geometry.attributes.normal) {
             this.rodMesh.geometry.computeVertexNormals();
        } else {
            // 如果没有法线，可能需要添加或接受不完美的光照
        }
    }
}

// 导出，以便 script.js 可以导入
// 注意：如果 script.js 不是模块，你需要调整导出和导入方式 (例如挂载到window对象)
// 假设 script.js 将作为模块加载
export { RodVibrator, cantileverResponse, getRodGeometricProperties };

// 确保你的HTML中 script.js 是这样引用的: <script type="module" src="script.js"></script>
// 并且 RodVibration.js 与 script.js 在同一目录下，或者使用正确的相对路径。 