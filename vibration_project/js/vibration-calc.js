/**
 * 振动计算模块
 * 基于悬臂梁理论计算杆件的振动响应
 */

class VibrationCalculator {
    constructor() {
        this.lambdaValues = [1.875, 4.694, 7.855, 10.996]; // 悬臂梁特征值
    }

    /**
     * 计算悬臂梁在指定位置和时间的位移响应
     * @param {number} x - 位置坐标 (m)
     * @param {number} t - 时间 (s)
     * @param {number} L - 杆长 (m)
     * @param {number} r - 杆半径 (m)
     * @param {number} E - 杨氏模量 (Pa)
     * @param {number} rho - 密度 (kg/m³)
     * @param {number} frequency - 激励频率 (Hz)
     * @param {number} amplitude - 激励幅度
     * @param {number} mode - 振动模态 (1-4)
     * @param {number} zeta - 阻尼比
     * @returns {number} 位移响应
     */
    cantileverResponse(x, t, L, r, E, rho, frequency, amplitude, mode = 1, zeta = 0.02) {
        if (mode < 1 || mode > this.lambdaValues.length) {
            mode = 1;
        }

        const lambdaN = this.lambdaValues[mode - 1];
        const A = Math.PI * r * r;
        const I = (Math.PI * Math.pow(r, 4)) / 4;
        const beta = lambdaN / L;
        const omega = frequency * 2 * Math.PI; // Hz to rad/s

        // 计算模态形状函数
        const phi = this.calculateModeShape(x, L, lambdaN);

        // 计算固有频率
        const omegaN = Math.pow(beta, 2) * Math.sqrt((E * I) / (rho * A));

        // 频率响应计算
        let responseValue = 0;
        const freqDiffThreshold = 0.1 * omegaN;

        if (Math.abs(omega - omegaN) < freqDiffThreshold && Math.abs(2 * zeta * omegaN) > 1e-9) {
            // 共振条件
            responseValue = (amplitude / (2 * zeta * omegaN)) * phi * Math.sin(omega * t);
        } else {
            // 非共振条件
            const H_denom_sq_part1 = Math.pow(omegaN * omegaN - omega * omega, 2);
            const H_denom_sq_part2 = Math.pow(2 * zeta * omegaN * omega, 2);
            let H_denom = Math.sqrt(H_denom_sq_part1 + H_denom_sq_part2);
            
            if (Math.abs(H_denom) < 1e-9) {
                H_denom = 1e-9;
            }
            
            const H = 1 / H_denom;
            responseValue = amplitude * H * phi * Math.sin(omega * t);
        }

        return responseValue;
    }

    /**
     * 计算模态形状函数
     * @param {number} x - 位置坐标
     * @param {number} L - 杆长
     * @param {number} lambdaN - 特征值
     * @returns {number} 模态形状函数值
     */
    calculateModeShape(x, L, lambdaN) {
        const beta = lambdaN / L;
        const betaX = beta * x;

        const coshBetaX = Math.cosh(betaX);
        const cosBetaX = Math.cos(betaX);
        const sinhBetaX = Math.sinh(betaX);
        const sinBetaX = Math.sin(betaX);

        const coshLambdaN = Math.cosh(lambdaN);
        const cosLambdaN = Math.cos(lambdaN);
        const sinhLambdaN = Math.sinh(lambdaN);
        const sinLambdaN = Math.sin(lambdaN);

        let phiFactorDenominator = sinhLambdaN + sinLambdaN;
        if (Math.abs(phiFactorDenominator) < 1e-9) {
            phiFactorDenominator = 1e-9;
        }

        const phiFactor = (coshLambdaN + cosLambdaN) / phiFactorDenominator;
        const phi = (coshBetaX - cosBetaX) - phiFactor * (sinhBetaX - sinBetaX);

        return phi;
    }

    /**
     * 计算固有频率
     * @param {number} L - 杆长 (m)
     * @param {number} r - 杆半径 (m)
     * @param {number} E - 杨氏模量 (Pa)
     * @param {number} rho - 密度 (kg/m³)
     * @param {number} mode - 模态阶数
     * @returns {number} 固有频率 (Hz)
     */
    calculateNaturalFrequency(L, r, E, rho, mode = 1) {
        if (mode < 1 || mode > this.lambdaValues.length) {
            mode = 1;
        }

        const lambdaN = this.lambdaValues[mode - 1];
        const A = Math.PI * r * r;
        const I = (Math.PI * Math.pow(r, 4)) / 4;
        const beta = lambdaN / L;

        const omegaN = Math.pow(beta, 2) * Math.sqrt((E * I) / (rho * A));
        return omegaN / (2 * Math.PI); // rad/s to Hz
    }

    /**
     * 检查是否发生共振
     * @param {number} excitationFreq - 激励频率 (Hz)
     * @param {number} naturalFreq - 固有频率 (Hz)
     * @param {number} tolerance - 容差 (默认5%)
     * @returns {boolean} 是否共振
     */
    isResonant(excitationFreq, naturalFreq, tolerance = 0.05) {
        const diff = Math.abs(excitationFreq - naturalFreq);
        return diff <= naturalFreq * tolerance;
    }

    /**
     * 扫频分析
     * @param {number} L - 杆长 (m)
     * @param {number} r - 杆半径 (m)
     * @param {number} E - 杨氏模量 (Pa)
     * @param {number} rho - 密度 (kg/m³)
     * @param {number} startFreq - 起始频率 (Hz)
     * @param {number} endFreq - 结束频率 (Hz)
     * @param {number} steps - 频率步数
     * @returns {Array} 频率响应数据
     */
    frequencySweep(L, r, E, rho, startFreq, endFreq, steps = 100) {
        const freqStep = (endFreq - startFreq) / steps;
        const results = [];

        for (let i = 0; i <= steps; i++) {
            const freq = startFreq + i * freqStep;
            const response = this.cantileverResponse(L, 0, L, r, E, rho, freq, 1.0, 1, 0.02);
            results.push({
                frequency: freq,
                amplitude: Math.abs(response)
            });
        }

        return results;
    }
}

// 确保类导出到全局作用域
window.VibrationCalculator = VibrationCalculator; 