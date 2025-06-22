# 国际化使用指南

本项目已集成中英文切换功能，支持动态语言切换。

## 功能特性

- ✅ 支持中文（zh-CN）和英文（en）切换
- ✅ 自动检测浏览器语言偏好
- ✅ 本地存储用户语言选择
- ✅ 响应式语言切换器
- ✅ 实时页面内容更新
- ✅ SEO友好的多语言支持

## 使用方法

### 1. 在HTML中添加国际化属性

```html
<!-- 基本文本翻译 -->
<h1 data-i18n="site.title">默认文本</h1>

<!-- 占位符翻译 -->
<input data-i18n-placeholder="common.search" placeholder="搜索">

<!-- 标题属性翻译 -->
<button data-i18n-title="common.submit" title="提交">按钮</button>
```

### 2. 在Pug模板中使用

```pug
// 基本用法
h1(data-i18n="site.title") #{defaultText}

// 带占位符
input(data-i18n-placeholder="common.search" placeholder="搜索")

// 带标题
button(data-i18n-title="common.submit" title="提交") 按钮
```

### 3. 在JavaScript中使用

```javascript
// 获取翻译文本
const text = window.i18n.t('site.title');

// 切换语言
window.i18n.switchLanguage('en');

// 获取当前语言
const currentLang = window.i18n.getCurrentLanguage();

// 监听语言切换事件
window.addEventListener('languageChanged', (e) => {
    console.log('语言已切换到:', e.detail.language);
});
```

## 翻译键值对照表

### 网站基本信息
- `site.title` - 网站标题
- `site.description` - 网站描述
- `site.subtitle` - 副标题
- `site.enter` - 进入按钮
- `site.name` - 站点名称
- `site.signature` - 个人签名

### 导航菜单
- `nav.blog` - 技术博客
- `nav.about` - 关于我
- `nav.contact` - 邮件联系
- `nav.github` - GitHub热点

### 博客相关
- `blog.title` - 博客标题
- `blog.loading` - 加载中
- `blog.noArticles` - 暂无文章
- `blog.readMore` - 阅读更多
- `blog.publishTime` - 发布时间
- `blog.tags` - 标签
- `blog.category` - 分类
- `blog.author` - 作者
- `blog.views` - 浏览量
- `blog.comments` - 评论
- `blog.likes` - 点赞
- `blog.share` - 分享
- `blog.backToList` - 返回列表

### 通用文本
- `common.search` - 搜索
- `common.submit` - 提交
- `common.cancel` - 取消
- `common.confirm` - 确认
- `common.save` - 保存
- `common.edit` - 编辑
- `common.delete` - 删除
- `common.loading` - 加载中
- `common.error` - 出错了
- `common.success` - 成功
- `common.warning` - 警告
- `common.info` - 信息

### 语言切换
- `lang.switch` - 切换语言
- `lang.chinese` - 中文
- `lang.english` - English

## 添加新的翻译

1. 打开 `src/js/i18n.js` 文件
2. 在 `translations` 对象中添加新的键值对
3. 确保中英文都有对应的翻译

```javascript
translations: {
    'zh-CN': {
        'new.key': '中文翻译',
        // ... 其他翻译
    },
    'en': {
        'new.key': 'English Translation',
        // ... 其他翻译
    }
}
```

## 语言切换器

语言切换器会自动添加到页面右上角，包含以下特性：

- 🇨🇳 中文按钮
- 🇺🇸 英文按钮
- 毛玻璃效果背景
- 响应式设计（移动端优化）
- 当前语言高亮显示

## 浏览器兼容性

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ 移动端浏览器

## 注意事项

1. 确保所有需要翻译的文本都添加了相应的 `data-i18n` 属性
2. 新增翻译键时，请同时添加中英文版本
3. 语言切换会触发 `languageChanged` 事件，可用于自定义处理
4. 用户的语言选择会保存在 localStorage 中
5. 如果没有找到对应的翻译，会显示原始文本或键名

## 自定义样式

语言切换器的样式可以通过CSS进行自定义：

```css
.language-switcher {
    /* 自定义位置 */
    top: 10px;
    right: 10px;
}

.lang-btn {
    /* 自定义按钮样式 */
    background: your-custom-color;
}

.lang-btn.active {
    /* 自定义激活状态 */
    background: your-active-color;
}
```

## 故障排除

### 翻译不生效
1. 检查是否正确引入了 `i18n.js` 脚本
2. 确认 `data-i18n` 属性值是否正确
3. 检查浏览器控制台是否有错误信息

### 语言切换器不显示
1. 确认脚本加载顺序正确
2. 检查CSS样式是否被覆盖
3. 确认没有JavaScript错误阻止执行

### 语言选择不保存
1. 检查浏览器是否支持localStorage
2. 确认没有隐私模式限制
3. 检查域名是否一致