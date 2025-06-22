/**
 * 国际化配置文件
 * 支持中英文切换
 */

class I18n {
    constructor() {
        this.currentLang = this.getStoredLanguage() || this.detectBrowserLanguage();
        this.translations = {
            'zh-CN': {
                // 网站基本信息
                'site.title': 'JiangKing Tech Hub',
                'site.description': 'AI算法、游戏开发、GitHub热点分析与技术探索',
                'site.subtitle': 'AI · 游戏开发 · GitHub热点',
                'site.enter': '进入',
                'site.name': 'JiangKing',
                'site.signature': '探索技术的无限可能 | 从代码到应用的开发之旅',
                
                // 导航菜单
                'nav.blog': '技术博客',
                'nav.about': '关于我',
                'nav.contact': '邮件联系',
                'nav.github': 'GitHub热点',
                
                // 博客页面
                'blog.title': '技术博客',
                'blog.loading': '加载中...',
                'blog.noArticles': '暂无文章',
                'blog.readMore': '阅读更多',
                'blog.publishTime': '发布时间',
                'blog.tags': '标签',
                'blog.category': '分类',
                'blog.author': '作者',
                'blog.views': '浏览量',
                'blog.comments': '评论',
                'blog.likes': '点赞',
                'blog.share': '分享',
                'blog.backToList': '返回列表',
                
                // 通用文本
                'common.search': '搜索',
                'common.submit': '提交',
                'common.cancel': '取消',
                'common.confirm': '确认',
                'common.save': '保存',
                'common.edit': '编辑',
                'common.delete': '删除',
                'common.loading': '加载中...',
                'common.error': '出错了',
                'common.success': '成功',
                'common.warning': '警告',
                'common.info': '信息',
                
                // 语言切换
                'lang.switch': '切换语言',
                'lang.chinese': '中文',
                'lang.english': 'English'
            },
            'en': {
                // 网站基本信息
                'site.title': 'JiangKing Tech Hub',
                'site.description': 'AI Algorithms, Game Development, GitHub Trending Analysis & Tech Exploration',
                'site.subtitle': 'AI · Game Dev · GitHub Trending',
                'site.enter': 'Enter',
                'site.name': 'JiangKing',
                'site.signature': 'Exploring Infinite Possibilities of Technology | From Code to Application Development Journey',
                
                // 导航菜单
                'nav.blog': 'Tech Blog',
                'nav.about': 'About Me',
                'nav.contact': 'Email Contact',
                'nav.github': 'GitHub Trending',
                
                // 博客页面
                'blog.title': 'Tech Blog',
                'blog.loading': 'Loading...',
                'blog.noArticles': 'No articles yet',
                'blog.readMore': 'Read More',
                'blog.publishTime': 'Published',
                'blog.tags': 'Tags',
                'blog.category': 'Category',
                'blog.author': 'Author',
                'blog.views': 'Views',
                'blog.comments': 'Comments',
                'blog.likes': 'Likes',
                'blog.share': 'Share',
                'blog.backToList': 'Back to List',
                
                // 通用文本
                'common.search': 'Search',
                'common.submit': 'Submit',
                'common.cancel': 'Cancel',
                'common.confirm': 'Confirm',
                'common.save': 'Save',
                'common.edit': 'Edit',
                'common.delete': 'Delete',
                'common.loading': 'Loading...',
                'common.error': 'Error',
                'common.success': 'Success',
                'common.warning': 'Warning',
                'common.info': 'Info',
                
                // 语言切换
                'lang.switch': 'Switch Language',
                'lang.chinese': '中文',
                'lang.english': 'English'
            }
        };
        
        this.init();
    }
    
    init() {
        this.updatePageLanguage();
        this.createLanguageSwitcher();
    }
    
    // 检测浏览器语言
    detectBrowserLanguage() {
        const lang = navigator.language || navigator.userLanguage;
        return lang.startsWith('zh') ? 'zh-CN' : 'en';
    }
    
    // 获取存储的语言设置
    getStoredLanguage() {
        return localStorage.getItem('preferred-language');
    }
    
    // 存储语言设置
    setStoredLanguage(lang) {
        localStorage.setItem('preferred-language', lang);
    }
    
    // 获取翻译文本
    t(key, defaultText = '') {
        const translation = this.translations[this.currentLang];
        return translation && translation[key] ? translation[key] : (defaultText || key);
    }
    
    // 切换语言
    switchLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            this.setStoredLanguage(lang);
            this.updatePageLanguage();
            
            // 触发语言切换事件
            window.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language: lang }
            }));
        }
    }
    
    // 更新页面语言
    updatePageLanguage() {
        // 更新HTML lang属性
        document.documentElement.lang = this.currentLang;
        
        // 更新所有带有data-i18n属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation !== key) {
                element.textContent = translation;
            }
        });
        
        // 更新所有带有data-i18n-placeholder属性的元素
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation !== key) {
                element.placeholder = translation;
            }
        });
        
        // 更新所有带有data-i18n-title属性的元素
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation !== key) {
                element.title = translation;
            }
        });
        
        // 更新页面标题
        const titleElement = document.querySelector('title');
        if (titleElement) {
            titleElement.textContent = this.t('site.title');
        }
        
        // 更新meta描述
        const descElement = document.querySelector('meta[name="description"]');
        if (descElement) {
            descElement.content = this.t('site.description');
        }
    }
    
    // 创建语言切换器
    createLanguageSwitcher() {
        // 不再创建语言切换器
        // 保留此方法以避免其他代码调用时出错
        return;
    }
    
    // 更新语言切换器状态
    updateLanguageSwitcher() {
        // 不再更新语言切换器
        return;
    }
    
    // 获取当前语言
    getCurrentLanguage() {
        return this.currentLang;
    }
}

// 创建全局实例
window.i18n = new I18n();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
}