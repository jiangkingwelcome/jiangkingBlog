/**
 * JiangKing博客错误处理脚本
 * 用于捕获和修复常见的JavaScript错误
 */

(function() {
    console.log('错误处理脚本已加载');
    
    // 全局错误处理
    window.addEventListener('error', function(event) {
        console.log('捕获到错误:', event.message);
        // 不阻止默认错误处理
        return false;
    });

    // 处理未捕获的Promise错误
    window.addEventListener('unhandledrejection', function(event) {
        // 忽略特定的Chrome扩展相关错误
        if (event.reason && 
            (event.reason.message === 'The message port closed before a response was received' ||
             event.reason.message === 'Extension context invalidated' ||
             event.reason.message === 'Extension handler lastError')) {
            console.log('忽略的Chrome扩展错误:', event.reason.message);
            event.preventDefault();
            return;
        }
        
        // 检查错误详情是否包含Chrome扩展相关的命令
        if (event.reason && event.reason.cmd && 
            (event.reason.cmd.includes('background-select-words') || 
             event.reason.cmd.includes('background-trans-compair') ||
             event.reason.cmd.includes('setContextMenu'))) {
            console.log('忽略的Chrome扩展命令错误:', event.reason.cmd);
            event.preventDefault();
            return;
        }
        
        console.log('未处理的Promise错误:', event.reason);
        // 阻止显示在控制台
        event.preventDefault();
    });

    // 安全地获取DOM元素
    window.safeQuery = function(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.log('警告: 未找到元素', selector);
            return {
                addEventListener: function() {},
                removeEventListener: function() {},
                classList: { add: function() {}, remove: function() {} },
                style: {},
                getAttribute: function() { return ''; },
                innerHTML: ''
            };
        }
        return element;
    };

    // 替换原始的$函数
    if (window.$) {
        const originalQuery = window.$;
        window.$ = function(selector) {
            const element = originalQuery(selector);
            if (!element) {
                console.log('警告: 未找到元素', selector);
                return {
                    addEventListener: function() {},
                    removeEventListener: function() {},
                    classList: { add: function() {}, remove: function() {} },
                    style: {},
                    getAttribute: function() { return ''; },
                    innerHTML: ''
                };
            }
            return element;
        };
    }

    // 安全地添加事件监听器
    window.safeAddEventListener = function(element, event, handler, options) {
        if (!element) return;
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element && element.addEventListener) {
            element.addEventListener(event, handler, options);
        }
    };

    // 修复常见的CDN资源错误
    function fixMissingResources() {
        // 检查并修复缺失的图像
        document.querySelectorAll('img').forEach(img => {
            img.onerror = function() {
                if (this.src.includes('cdn.jsdelivr.net')) {
                    const fileName = this.src.split('/').pop();
                    this.src = `/assets/images/blog/${fileName}`;
                    console.log('修复图像链接:', this.src);
                }
            };
        });

        // 检查并修复缺失的光标样式
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            body {
                cursor: auto !important;
            }
            a, button, [role="button"] {
                cursor: pointer !important;
            }
        `;
        document.head.appendChild(styleElement);
    }

    // 修复常见的全局变量
    function fixGlobalVariables() {
        // 确保hiddenProperty存在
        if (typeof window.hiddenProperty === 'undefined') {
            window.hiddenProperty = 'hidden';
            if ('hidden' in document) {
                window.hiddenProperty = 'hidden';
            } else if ('webkitHidden' in document) {
                window.hiddenProperty = 'webkitHidden';
            } else if ('mozHidden' in document) {
                window.hiddenProperty = 'mozHidden';
            }
        }

        // 确保visibilityChangeEvent存在
        if (typeof window.visibilityChangeEvent === 'undefined') {
            window.visibilityChangeEvent = 'visibilitychange';
            if ('hidden' in document) {
                window.visibilityChangeEvent = 'visibilitychange';
            } else if ('webkitHidden' in document) {
                window.visibilityChangeEvent = 'webkitvisibilitychange';
            } else if ('mozHidden' in document) {
                window.visibilityChangeEvent = 'mozvisibilitychange';
            }
        }

        // 确保isPhone存在
        if (typeof window.isPhone === 'undefined') {
            window.isPhone = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }

        // 确保isQQBrowser存在
        if (typeof window.isQQBrowser === 'undefined') {
            window.isQQBrowser = false;
        }
    }

    // 修复背景相关错误
    function fixBackgroundErrors() {
        // 防止背景相关的错误
        const originalPostMessage = window.postMessage;
        window.postMessage = function(message, targetOrigin, transfer) {
            try {
                return originalPostMessage.apply(this, arguments);
            } catch (e) {
                console.log('消息发送错误被捕获:', e);
                return false;
            }
        };
        
        // 修复Chrome扩展通信错误
        if (window.chrome && window.chrome.runtime) {
            try {
                const originalSendMessage = window.chrome.runtime.sendMessage;
                window.chrome.runtime.sendMessage = function() {
                    try {
                        return originalSendMessage.apply(this, arguments);
                    } catch (e) {
                        console.log('Chrome扩展消息发送错误被捕获:', e);
                        return Promise.resolve();
                    }
                };
            } catch (e) {
                console.log('无法修复Chrome扩展API:', e);
            }
        }
    }
    
    // 屏蔽翻译API相关错误
    function blockTranslateApiErrors() {
        // 创建一个空的translate-api对象，防止相关错误
        window.translateApi = {
            translate: function() { return Promise.resolve(''); },
            detectLanguage: function() { return Promise.resolve('zh-CN'); },
            getSupportedLanguages: function() { return Promise.resolve([]); }
        };
        
        // 拦截所有与translate-api相关的脚本加载
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(document, tagName);
            if (tagName.toLowerCase() === 'script') {
                const originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                    if (name === 'src' && value && value.includes('translate-api')) {
                        console.log('已阻止加载翻译API脚本:', value);
                        return;
                    }
                    return originalSetAttribute.call(this, name, value);
                };
            }
            return element;
        };
    }

    // 在DOM加载完成后执行修复
    document.addEventListener('DOMContentLoaded', function() {
        console.log('正在应用错误修复...');
        fixMissingResources();
        fixGlobalVariables();
        fixBackgroundErrors();
        blockTranslateApiErrors();
        
        // 移除加载动画
        setTimeout(() => {
            const loader = document.getElementById('loader');
            if (loader) {
                loader.style.display = 'none';
            }
        }, 1500);
    });
})(); 