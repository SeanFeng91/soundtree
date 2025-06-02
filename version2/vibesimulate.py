import numpy as np

# 定义物理和几何常数 (这些值可以根据实际情况调整)
E = 200e9    # 杨氏模量 (Pa) - 示例值 (钢)
I = 1e-9     # 截面惯性矩 (m^4) - 示例值
rho = 7850   # 密度 (kg/m^3) - 示例值 (钢)
A = 1e-5     # 横截面积 (m^2) - 示例值
L = 1.0      # 杆长 (m)

def cantilever_response(x, t, frequency, amplitude, mode=1, zeta=0.02):
    """
    悬臂梁响应函数

    参数:
    x: float, 位置坐标 (0到L)
    t: float, 时间
    frequency: float, 激励角频率 (rad/s)
    amplitude: float, 激励幅度
    mode: int, 振动模态阶数 (1到4)
    zeta: float, 阻尼比

    返回:
    float, 在位置x和时间t的位移
    """

    # 第n阶模态的特征值 (lambda_n)
    # 这些值对应于悬臂梁边界条件的解
    lambda_n_values = [1.875, 4.694, 7.855, 10.996]
    if not (1 <= mode <= len(lambda_n_values)):
        raise ValueError(f"模态阶数必须在1到{len(lambda_n_values)}之间")
    lambda_n = lambda_n_values[mode - 1]

    # 模态形状参数 beta
    beta = lambda_n / L

    # 模态形状函数 phi(x)
    # 这个函数描述了梁在第n阶模态下的振型
    cosh_beta_x = np.cosh(beta * x)
    cos_beta_x = np.cos(beta * x)
    sinh_beta_x = np.sinh(beta * x)
    sin_beta_x = np.sin(beta * x)

    cosh_lambda_n = np.cosh(lambda_n)
    cos_lambda_n = np.cos(lambda_n)
    sinh_lambda_n = np.sinh(lambda_n)
    sin_lambda_n = np.sin(lambda_n)

    # 避免分母为零的情况 (虽然对于这些lambda_n值，sinh_lambda_n + sin_lambda_n 通常不会为零)
    phi_factor_denominator = sinh_lambda_n + sin_lambda_n
    if np.isclose(phi_factor_denominator, 0):
        # 理论上对于悬臂梁的lambda_n，此情况不应发生
        # 但为防止意外的输入或扩展，可以添加处理
        phi_factor = 0 
    else:
        phi_factor = (cosh_lambda_n + cos_lambda_n) / phi_factor_denominator
    
    phi = (cosh_beta_x - cos_beta_x) - phi_factor * (sinh_beta_x - sin_beta_x)

    # 固有角频率 omega_n (第n阶模态的无阻尼固有频率)
    # omega_n = beta^2 * sqrt(E*I / (rho*A))
    omega_n = (beta**2) * np.sqrt((E * I) / (rho * A))

    # 频率响应
    response_value = 0.0
    # 激励频率 (frequency) 与固有角频率 (omega_n) 的关系决定响应类型

    # 检查是否接近共振 (例如，激励频率在固有频率的10%范围内)
    if np.abs(frequency - omega_n) < 0.1 * omega_n:
        # 共振或接近共振时的响应 (简化模型)
        # 实际共振响应会非常大，受阻尼限制
        if np.isclose(zeta, 0) or np.isclose(omega_n, 0): # 避免除以零
             # 如果阻尼或固有频率为零，则无法应用此简化共振公式，可考虑返回NaN或特定错误
             # 或者使用更通用的频率响应函数（如下面的else块）
             # 为简单起见，这里也使用通用公式处理
             H_numerator = 1
             H_denominator_part1 = (omega_n**2 - frequency**2)**2
             H_denominator_part2 = (2 * zeta * omega_n * frequency)**2
             if np.isclose(H_denominator_part1 + H_denominator_part2, 0):
                 response_value = amplitude * phi * np.sin(frequency * t) # 简化处理或抛出错误
             else:
                H = H_numerator / np.sqrt(H_denominator_part1 + H_denominator_part2)
                response_value = amplitude * H * phi * np.sin(frequency * t)
        else:
            response_value = (amplitude / (2 * zeta * omega_n)) * phi * np.sin(frequency * t)
    else:
        # 一般频率响应 (远离共振)
        # H(omega) = 1 / sqrt( (omega_n^2 - omega^2)^2 + (2*zeta*omega_n*omega)^2 )
        H_numerator = 1
        H_denominator_part1 = (omega_n**2 - frequency**2)**2
        H_denominator_part2 = (2 * zeta * omega_n * frequency)**2
        
        denominator_sqrt_arg = H_denominator_part1 + H_denominator_part2
        if np.isclose(denominator_sqrt_arg, 0) or denominator_sqrt_arg < 0:
            # 处理分母为零或开方负数的情况（理论上后者不应发生）
            # 可能是数值不稳定或极端参数。可以返回一个大值、NaN或错误。
            # 这里简化处理，如果分母接近零，可能意味着非常大的响应（接近无阻尼共振）
            # 但由于已在if条件中处理了共振情况，这里更可能是参数问题
            # 为稳健性，可以给一个非常大的H值或根据情况处理
            response_value = amplitude * phi * np.sin(frequency * t) # 简化
        else:
            H = H_numerator / np.sqrt(denominator_sqrt_arg)
            response_value = amplitude * H * phi * np.sin(frequency * t)
            
    return response_value

if __name__ == '__main__':
    # 示例用法:
    x_point = L / 2  # 梁的中点
    time_instance = 1.0 # 特定时间点
    excitation_freq = 10.0 # 激励角频率 (rad/s)
    excitation_amp = 0.05  # 激励幅度
    mode_number = 1        # 第一阶模态
    damping_ratio = 0.02   # 阻尼比

    displacement = cantilever_response(x_point, time_instance, excitation_freq, excitation_amp, mode_number, damping_ratio)
    print(f"在 x={x_point:.2f}m, t={time_instance:.1f}s, 激励频率={excitation_freq:.1f}rad/s, 幅度={excitation_amp:.2f}, {mode_number}阶模态, 阻尼比={damping_ratio:.2f} 时:")
    print(f"梁的位移是: {displacement:.6e} m")

    # 另一个例子：接近第一阶固有频率的激励
    # 先计算第一阶固有频率
    lambda_1 = 1.875
    beta_1 = lambda_1 / L
    omega_1 = (beta_1**2) * np.sqrt((E * I) / (rho * A))
    print(f"\n第一阶固有角频率 omega_1: {omega_1:.2f} rad/s")

    # 使用接近 omega_1 的激励频率
    resonant_excitation_freq = omega_1 * 0.99 
    displacement_near_resonance = cantilever_response(L, time_instance, resonant_excitation_freq, excitation_amp, 1, damping_ratio)
    print(f"\n在梁的末端 (x={L:.2f}m), 激励频率接近共振 ({resonant_excitation_freq:.2f}rad/s):")
    print(f"梁的位移是: {displacement_near_resonance:.6e} m")

    # 尝试第二阶模态
    displacement_mode2 = cantilever_response(L, time_instance, excitation_freq, excitation_amp, 2, damping_ratio)
    print(f"\n在梁的末端 (x={L:.2f}m), 使用第二阶模态 ({excitation_freq:.1f}rad/s):")
    print(f"梁的位移是: {displacement_mode2:.6e} m")
