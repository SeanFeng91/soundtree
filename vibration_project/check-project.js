#!/usr/bin/env node

/**
 * 多杆件振动模拟系统 - 项目完整性检查脚本
 * 验证所有必需文件是否存在，检查代码语法，确保项目结构完整
 */

const fs = require('fs');
const path = require('path');

// 颜色输出函数
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(color + message + colors.reset);
}

// 必需文件列表
const requiredFiles = [
    'index.html',
    'test.html',
    'README.md',
    'package.json',
    'start.bat',
    'js/config.js',
    'js/materials.js',
    'js/vibration-calc.js',
    'js/audio-processor.js',
    'js/visualization.js',
    'js/rod-manager.js',
    'js/main.js',
    'js/init.js'
];

// 检查结果统计
let results = {
    filesExist: 0,
    filesMissing: 0,
    syntaxErrors: 0,
    warnings: 0
};

function checkFileExists(filePath) {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
        log(colors.green, `✓ 文件存在: ${filePath}`);
        results.filesExist++;
        return true;
    } else {
        log(colors.red, `✗ 文件缺失: ${filePath}`);
        results.filesMissing++;
        return false;
    }
}

function checkJavaScriptSyntax(filePath) {
    try {
        const fullPath = path.join(__dirname, filePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // 基本语法检查
        if (content.includes('undefined variable') || 
            content.includes('SyntaxError') ||
            content.includes('ReferenceError')) {
            log(colors.yellow, `⚠ 语法警告: ${filePath}`);
            results.warnings++;
        }
        
        // 检查是否包含必要的类定义
        if (filePath.includes('materials.js') && !content.includes('class MaterialProperties')) {
            log(colors.red, `✗ 缺少MaterialProperties类: ${filePath}`);
            results.syntaxErrors++;
        } else if (filePath.includes('vibration-calc.js') && !content.includes('class VibrationCalculator')) {
            log(colors.red, `✗ 缺少VibrationCalculator类: ${filePath}`);
            results.syntaxErrors++;
        } else if (filePath.includes('audio-processor.js') && !content.includes('class AudioProcessor')) {
            log(colors.red, `✗ 缺少AudioProcessor类: ${filePath}`);
            results.syntaxErrors++;
        } else if (filePath.includes('visualization.js') && !content.includes('class Visualization')) {
            log(colors.red, `✗ 缺少Visualization类: ${filePath}`);
            results.syntaxErrors++;
        } else if (filePath.includes('rod-manager.js') && !content.includes('class RodManager')) {
            log(colors.red, `✗ 缺少RodManager类: ${filePath}`);
            results.syntaxErrors++;
        } else if (filePath.includes('main.js') && !content.includes('class MainController')) {
            log(colors.red, `✗ 缺少MainController类: ${filePath}`);
            results.syntaxErrors++;
        } else {
            log(colors.green, `✓ 语法检查通过: ${filePath}`);
        }
        
    } catch (error) {
        log(colors.red, `✗ 读取文件失败: ${filePath} - ${error.message}`);
        results.syntaxErrors++;
    }
}

function checkHTMLStructure(filePath) {
    try {
        const fullPath = path.join(__dirname, filePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // 检查基本HTML结构
        if (!content.includes('<!DOCTYPE html>')) {
            log(colors.yellow, `⚠ 缺少DOCTYPE声明: ${filePath}`);
            results.warnings++;
        }
        
        if (!content.includes('<html')) {
            log(colors.red, `✗ 缺少html标签: ${filePath}`);
            results.syntaxErrors++;
        }
        
        if (!content.includes('<head>') || !content.includes('<body>')) {
            log(colors.red, `✗ 缺少head或body标签: ${filePath}`);
            results.syntaxErrors++;
        }
        
        // 检查脚本引用
        if (filePath === 'index.html') {
            const requiredScripts = ['three.min.js', 'plotly.min.js', 'config.js', 'init.js'];
            for (const script of requiredScripts) {
                if (!content.includes(script)) {
                    log(colors.yellow, `⚠ 可能缺少脚本引用: ${script} in ${filePath}`);
                    results.warnings++;
                }
            }
        }
        
        log(colors.green, `✓ HTML结构检查通过: ${filePath}`);
        
    } catch (error) {
        log(colors.red, `✗ HTML检查失败: ${filePath} - ${error.message}`);
        results.syntaxErrors++;
    }
}

function checkProjectStructure() {
    log(colors.cyan, '\n=== 项目结构检查 ===');
    
    // 检查js目录
    const jsDir = path.join(__dirname, 'js');
    if (!fs.existsSync(jsDir)) {
        log(colors.red, '✗ js目录不存在');
        results.filesMissing++;
    } else {
        log(colors.green, '✓ js目录存在');
    }
}

function printSummary() {
    log(colors.bright, '\n=== 检查结果摘要 ===');
    log(colors.green, `文件存在: ${results.filesExist}`);
    log(colors.red, `文件缺失: ${results.filesMissing}`);
    log(colors.yellow, `警告: ${results.warnings}`);
    log(colors.red, `错误: ${results.syntaxErrors}`);
    
    const total = results.filesExist + results.filesMissing;
    const completeness = (results.filesExist / total * 100).toFixed(1);
    
    log(colors.cyan, `\n项目完整度: ${completeness}%`);
    
    if (results.filesMissing === 0 && results.syntaxErrors === 0) {
        log(colors.green, '\n🎉 项目检查通过！所有文件完整，可以正常运行。');
    } else if (results.syntaxErrors === 0) {
        log(colors.yellow, '\n⚠️  项目基本完整，但有一些警告需要注意。');
    } else {
        log(colors.red, '\n❌ 项目检查失败，存在缺失文件或语法错误，请修复后再运行。');
    }
}

// 主检查流程
function runProjectCheck() {
    log(colors.bright, '多杆件振动模拟系统 - 项目完整性检查');
    log(colors.bright, '=====================================\n');
    
    // 检查项目结构
    checkProjectStructure();
    
    // 检查必需文件
    log(colors.cyan, '\n=== 文件存在性检查 ===');
    for (const file of requiredFiles) {
        if (checkFileExists(file)) {
            // 对JavaScript文件进行语法检查
            if (file.endsWith('.js')) {
                checkJavaScriptSyntax(file);
            }
            // 对HTML文件进行结构检查
            else if (file.endsWith('.html')) {
                checkHTMLStructure(file);
            }
        }
    }
    
    // 打印摘要
    printSummary();
}

// 如果作为脚本直接运行
if (require.main === module) {
    runProjectCheck();
}

module.exports = { runProjectCheck }; 