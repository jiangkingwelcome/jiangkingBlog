# jiangking-Blog

[English Version](<README.md>)


## 项目简介

> 一个现代化的个人博客网站，具有流畅的页面过渡效果和响应式设计。

![博客预览](https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMncyb3oyc21zc3czejU3cGk4M2tiNTdkaTM0N3FodGVpZmU5azNxaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/fhXFCZEogq39rOpKUi/giphy.gif)

[在线浏览](https://jiangking.com)

想要拥有一个这样的博客站点吗？让我们开始吧！


## 安装步骤

```sh
git clone https://github.com/jiangking/jiangkingBlog.git
cd jiangkingBlog
npm install
npm run dev
```

## 获取Notion数据
```sh
npm run fetchnotion
```

## 功能特性

1. 高度封装的页面信息
2. 流畅的用户体验与优雅的设计风格
3. 使用`less`作为CSS预处理器
4. 使用`pug`作为HTML预处理器
5. 使用`gulp`作为构建工具
6. 舒适的动画效果与精美的UI设计
7. 响应式设计，完美支持移动端
8. 轻量级，引用的CSS与JS文件总体积小
9. 延迟响应的页面切换事件
10. 支持从Notion导入数据

## 项目结构

项目主要分为两大部分：
1. `intro` 首屏
2. `main` 副屏

相应的函数、样式和配置也基于此结构设计。

## 基本配置

配置文件`config.json`中的每一项键名对应相应的组件名。

例如：

```json
{
	"head": {
		"title": "jiangking",
		"description": "个人博客",
		"favicon": "favicon.ico"
	}
}
```

上述配置信息对应以下`layout/head.pug`组件中的信息：
```html
head
	title #{head.title}
	meta(charset="utf-8")
	meta(name="Description" content=`${head.description}`)
	link(rel="icon" href=`${head.favicon}` type="image/x-icon")
```

## 高级配置

### 图标替换
项目中的图标来自[阿里巴巴矢量图标库](https://www.iconfont.cn)

替换步骤如下：

1. 选择图标，添加到项目后，将颜色调整为白色
2. 点击Font Class方式
3. 复制生成的链接内容
4. 替换`/src/css/common/icon.less`文件中的内容，确保保留`icon`选择器中的内容
5. 在`config.json`文件中配置相应项`main.ul.*.icon`

```css
.icon {
	display: block;
	width: 1.5em;
	height: 1.5em;
	margin: 0 auto;
	fill: currentColor;
	font-family: 'iconfont' !important;
	font-size: inherit;
	font-style: normal;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}
```

## 项目部署

在根目录下执行`npm run build`后，项目文件将生成到`dist`目录。

然后，您可以将`dist`目录部署到任何服务器托管提供商。

GitHub Pages部署示例：

1. 创建`username.github.io`仓库

2. ```sh
   cd dist
   git init
   git add -A
   git commit -am "初始提交"
   git remote add origin https://github.com/username/username.github.io.git
   git push -f origin master
   ```

3. 在GitHub中设置仓库的GitHub Pages选项

4. 访问`username.github.io`即可浏览！

如果您的`username.github.io`仓库已有内容，可以创建另一个仓库，如`blog`，将项目部署到该仓库，并设置其GitHub Pages选项。这样，该仓库将成为子目录`username.github.io/blog`。

## 赞助
开发一个优秀的项目，离不开大量时间和精力的投入。

如果此项目给你带来了帮助，欢迎赞助,`star`。

谢谢！
