const gulp = require('gulp')
const minifycss = require('gulp-clean-css')
const uglify = require('gulp-uglify')
const htmlmin = require('gulp-htmlmin')
const cssnano = require('gulp-cssnano')
const htmlclean = require('gulp-htmlclean')
const del = require('del')
const babel = require('gulp-babel')
const autoprefixer = require('gulp-autoprefixer')
const connect = require('gulp-connect')
const pug = require('gulp-pug')
const less = require('gulp-less')
const rename = require('gulp-rename')
const fs = require('fs')
const path = require('path')

const config = require('./config.json')
let blogData = []
try {
	blogData = require('./src/blog/data/list.json')
} catch (e) {
	console.warn('警告：未找到 src/blog/data/list.json，请先运行 npm run fetch:notion')
}

gulp.task('clean', function () {
	return del(['./dist/css/', './dist/js/'])
})

gulp.task('css', function () {
	return gulp
		.src('./src/css/*.less')
		.pipe(less().on('error', function(err) {
			console.log(err);
			this.emit('end');
		}))
		.pipe(minifycss({ compatibility: 'ie8' }))
		.pipe(autoprefixer({ overrideBrowserslist: ['last 2 version'] }))
		.pipe(cssnano({ reduceIdents: false }))
		.pipe(gulp.dest('./dist/css'))
})

gulp.task('html', function () {
	return gulp
		.src('./dist/index.html')
		.pipe(htmlclean())
		.pipe(htmlmin())
		.pipe(gulp.dest('./dist'))
})

gulp.task('js', function () {
	return gulp
		.src('./src/js/*.js')
		.pipe(babel({ presets: ['@babel/preset-env'] }))
		.pipe(uglify())
		.pipe(gulp.dest('./dist/js'))
})

gulp.task('pug', function () {
	return gulp
		.src('./src/index.pug')
		.pipe(pug({ data: config }))
		.pipe(gulp.dest('./dist'))
})

gulp.task('blog-pug', function () {
	return gulp
		.src('./src/blog/index.pug')
		.pipe(
			pug({
				data: {
					config,
					articles: blogData.filter(article => article.status === 'Published' && (article.type === 'Post' || article.type === 'post'))
				}
			})
		)
		.pipe(gulp.dest('./dist/blog'))
})

gulp.task('blog-css', function () {
	return gulp
		.src('./src/css/blog/blog.less')
		.pipe(less().on('error', function(err) {
			console.log(err);
			this.emit('end');
		}))
		.pipe(minifycss({ compatibility: 'ie8' }))
		.pipe(autoprefixer({ overrideBrowserslist: ['last 2 version'] }))
		.pipe(cssnano({ reduceIdents: false }))
		.pipe(gulp.dest('./dist/css'))
})

gulp.task('blog-detail', function (done) {
	if (!blogData || blogData.length === 0) return done();
	const detailPug = './src/blog/detail.pug';
	if (!fs.existsSync(detailPug)) return done();
	
	blogData.forEach(article => {
		if (article.status === 'Published') {
			const detailJson = `./src/blog/data/${article.id}.json`;
			let detail = {};
			if (fs.existsSync(detailJson)) {
				detail = require(detailJson);
			}
			
			// 解析详情数据
			const articleData = {
				config,
				id: article.id,
				title: article.title || detail.title || '',
				author: 'JiangKing', // 或从配置中获取
				date: article.date || detail.date || '',
				summary: article.summary || detail.summary || '',
				tags: article.tags || (detail.tags ? detail.tags.split(',') : []),
				category: article.category || detail.category || '',
				content: detail.contentHtml || '',
				readingTime: calculateReadingTime(detail.contentHtml || ''),
				views: '1.2k', // 可以从其他地方获取
				authorAvatar: 'https://cdn.jsdelivr.net/gh/JiangKing/images/blog/avatar.jpg',
				authorBio: 'STDIN | Think >> /dev/Mind✨ - 专注于技术分享与思考',
				related: [], // 相关文章
				toc: [] // 目录
			};
			
			gulp.src(detailPug)
				.pipe(pug({ 
					data: articleData,
					pretty: true // 开发时方便查看
				}))
				.pipe(rename(`${article.id}.html`))
				.pipe(gulp.dest('./dist/blog'));
		}
	});
	done();
});

// 辅助函数：计算阅读时间
function calculateReadingTime(html) {
	const text = html.replace(/<[^>]*>/g, '');
	const wordCount = text.trim().split(/\s+/).length;
	const readingTime = Math.ceil(wordCount / 200);
	return `${readingTime} min read`;
}

gulp.task('assets', function () {
	return gulp
		.src(['./src/assets/**/*'])
		.pipe(gulp.dest('./dist/assets'));
})

gulp.task('copy-css', function () {
	return gulp.src('src/css/blog/blog.css')
		.pipe(gulp.dest('dist/css'));
});

gulp.task('build', gulp.series('clean', 'assets', 'pug', 'blog-pug', 'css', 'blog-css', 'js', 'html', 'blog-detail'))
gulp.task('default', gulp.series('build'))

gulp.task('watch', function () {
	gulp.watch('./src/components/*.pug', gulp.parallel('pug'))
	gulp.watch('./src/index.pug', gulp.parallel('pug'))
	gulp.watch('./src/blog/*.pug', gulp.parallel('blog-pug'))
	gulp.watch('./src/css/**/*.less', gulp.parallel(['css', 'blog-css']))
	gulp.watch('./src/js/*.js', gulp.parallel(['js']))
	connect.server({
		root: 'dist',
		livereload: true,
		port: 8080
	})
})
