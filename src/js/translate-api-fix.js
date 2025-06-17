/**
 * 翻译API错误修复脚本
 * 用于处理与Chrome扩展翻译API相关的错误
 */

(function() {
    console.log('翻译API错误修复脚本已加载');

    // 创建一个模拟的翻译API对象
    window.translateApi = {
        translate: function(text, targetLang) {
            console.log('模拟翻译:', text, '到', targetLang);
            return Promise.resolve(text); // 直接返回原文
        },
        detectLanguage: function(text) {
            return Promise.resolve('zh-CN');
        },
        getSupportedLanguages: function() {
            return Promise.resolve(['zh-CN', 'en']);
        }
    };

    // 拦截与翻译相关的消息
    const originalPostMessage = window.postMessage;
    window.postMessage = function(message, targetOrigin, transfer) {
        if (typeof message === 'object' && message !== null) {
            // 检查是否是翻译相关的消息
            if (message.cmd && (
                message.cmd.includes('background-select-words') || 
                message.cmd.includes('background-trans-compair') ||
                message.cmd.includes('setContextMenu')
            )) {
                console.log('已拦截翻译相关消息:', message.cmd);
                // 模拟成功响应
                setTimeout(function() {
                    window.dispatchEvent(new CustomEvent('translate-response', {
                        detail: { success: true, data: message.data || {} }
                    }));
                }, 10);
                return;
            }
        }
        
        try {
            return originalPostMessage.apply(this, arguments);
        } catch (e) {
            console.log('消息发送错误被捕获:', e);
            return false;
        }
    };

    // 处理data-translate属性的元素
    function processTranslateElements() {
        document.querySelectorAll('[data-translate]').forEach(function(element) {
            // 保留原始文本，不进行翻译
            const originalText = element.textContent;
            element.setAttribute('data-original-text', originalText);
        });
    }

    // 在DOM加载完成后处理翻译元素
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processTranslateElements);
    } else {
        processTranslateElements();
    }
})(); 