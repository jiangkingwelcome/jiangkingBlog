class GridAnimation {
	constructor(canvas, options = {}) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.options = {
			direction: options.direction || "right",
			speed: options.speed || 1,
			borderColor: options.borderColor || "rgba(255, 255, 255, 0.05)",
			squareSize: options.squareSize || 40,
			hoverFillColor: options.hoverFillColor || "rgba(255, 255, 255, 0.6)",
			hoverShadowColor: options.hoverShadowColor || "rgba(255, 255, 255, 0.3)",
			transitionDuration: options.transitionDuration || 200, // 过渡时间（毫秒）
			trailDuration: options.trailDuration || 1000, // 痕迹持续时间（毫秒）
			specialBlockColor:
				options.specialBlockColor || "rgba(255, 100, 100, 0.8)",
			specialHoverColor:
				options.specialHoverColor || "rgba(100, 255, 100, 0.8)",
			// 新增颜色渐变相关选项
			snakeHeadColor: options.snakeHeadColor || "rgba(255, 255, 255, 0.9)",
			snakeTailColor: options.snakeTailColor || "rgba(100, 100, 255, 0.3)",
			snakeGradientStops: options.snakeGradientStops || 5, // 渐变过渡的色块数
			snakeColorDecay: options.snakeColorDecay || 0.7, // 渐变衰减系数，越小衰减越快
			...options,
		};

		this.gridOffset = { x: 0, y: 0 };
		this.hoveredSquare = null;
		this.animationFrame = null;
		this.currentOpacity = 0;
		this.targetOpacity = 0;
		this.lastTimestamp = 0;
		this.hoverRadius = 3;
		this.trailSquares = new Map(); // 存储痕迹格子的信息
		this.specialBlock = null;
		this.specialBlockTimer = null;
		this.isSpecialBlockHovered = false;
		this.snakeBody = []; // 存储蛇身的数组
		this.shouldGrow = false; // 控制蛇身是否增长
	}

	init() {
		this.resizeCanvas();
		this.setupEventListeners();
		this.animate();

		// 在移动设备上延迟创建食物，确保画布大小计算正确
		if (isPhone) {
			setTimeout(() => {
				this.createSpecialBlock();
			}, 500);
		} else {
			this.createSpecialBlock();
		}

		// 添加页面可见性变化监听，在页面不可见时暂停动画
		document.addEventListener(visibilityChangeEvent, this.handleVisibilityChange.bind(this));
	}

	resizeCanvas() {
		// 处理设备像素比，确保在高DPR设备上（如iPhone）清晰渲染
		const dpr = window.devicePixelRatio || 1;
		const displayWidth = this.canvas.offsetWidth;
		const displayHeight = this.canvas.offsetHeight;

		// 设置画布大小为实际像素大小
		this.canvas.width = Math.floor(displayWidth * dpr);
		this.canvas.height = Math.floor(displayHeight * dpr);

		// 设置CSS尺寸为显示尺寸
		this.canvas.style.width = `${displayWidth}px`;
		this.canvas.style.height = `${displayHeight}px`;

		// 缩放上下文以匹配设备像素比
		this.ctx.scale(dpr, dpr);
	}

	setupEventListeners() {
		window.addEventListener("resize", () => this.resizeCanvas());
		this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
		this.canvas.addEventListener("mouseleave", () => this.handleMouseLeave());

		// 监听设备方向变化，重新创建食物
		if (isPhone && window.orientation !== undefined) {
			window.addEventListener("orientationchange", () => {
				setTimeout(() => {
					this.resizeCanvas();
					this.createSpecialBlock();
				}, 300);
			});
		}
	}

	handleMouseMove(event) {
		const rect = this.canvas.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		const startX =
			Math.floor(this.gridOffset.x / this.options.squareSize) *
			this.options.squareSize;
		const startY =
			Math.floor(this.gridOffset.y / this.options.squareSize) *
			this.options.squareSize;

		const hoveredSquareX = Math.floor(
			(mouseX + this.gridOffset.x - startX) / this.options.squareSize
		);
		const hoveredSquareY = Math.floor(
			(mouseY + this.gridOffset.y - startY) / this.options.squareSize
		);

		if (
			this.hoveredSquare?.x !== hoveredSquareX ||
			this.hoveredSquare?.y !== hoveredSquareY
		) {
			// 将当前悬停的格子添加到蛇身
			if (this.hoveredSquare) {
				this.snakeBody.unshift({
					x: this.hoveredSquare.x,
					y: this.hoveredSquare.y,
				});

				// 如果没有吃到食物，移除蛇尾
				if (!this.shouldGrow && this.snakeBody.length > 0) {
					this.snakeBody.pop();
				}
				this.shouldGrow = false;
			}

			this.hoveredSquare = { x: hoveredSquareX, y: hoveredSquareY };
			this.targetOpacity = 0.6;

			// 检查是否吃到食物
			if (
				this.specialBlock &&
				hoveredSquareX === this.specialBlock.x &&
				hoveredSquareY === this.specialBlock.y
			) {
				this.shouldGrow = true; // 标记蛇身需要增长
				this.createSpecialBlock(); // 吃到食物时立即生成新的食物
			}
		}
	}

	handleMouseLeave() {
		if (this.hoveredSquare) {
			const startX =
				Math.floor(this.gridOffset.x / this.options.squareSize) *
				this.options.squareSize;
			const startY =
				Math.floor(this.gridOffset.y / this.options.squareSize) *
				this.options.squareSize;
			const key = `${this.hoveredSquare.x},${this.hoveredSquare.y}`;
			this.trailSquares.set(key, {
				x: this.hoveredSquare.x * this.options.squareSize + startX,
				y: this.hoveredSquare.y * this.options.squareSize + startY,
				opacity: 0.6,
			});
		}
		this.hoveredSquare = null;
		this.targetOpacity = 0;
	}

	createSpecialBlock() {
		// 清除之前的定时器
		if (this.specialBlockTimer) {
			clearTimeout(this.specialBlockTimer);
		}

		// 获取设备像素比
		const dpr = window.devicePixelRatio || 1;

		// 随机生成特殊方块的位置
		const numSquaresX = Math.ceil((this.canvas.width / dpr) / this.options.squareSize);
		const numSquaresY = Math.ceil((this.canvas.height / dpr) / this.options.squareSize);

		// 确保食物不会生成在蛇身上和边缘
		let newX, newY;
		do {
			// 避开边缘，留出1格的空间
			newX = 1 + Math.floor(Math.random() * (numSquaresX - 2));
			newY = 1 + Math.floor(Math.random() * (numSquaresY - 2));
		} while (
			this.snakeBody.some((segment) => segment.x === newX && segment.y === newY)
		);

		this.specialBlock = {
			x: newX,
			y: newY,
			color: this.options.specialBlockColor,
			initialOffset: { ...this.gridOffset },
		};
	}

	drawGrid() {
		const dpr = window.devicePixelRatio || 1;

		// 清除前重置变换
		this.ctx.setTransform(1, 0, 0, 1, 0, 0);
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// 应用DPR比例
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const startX =
			Math.floor(this.gridOffset.x / this.options.squareSize) *
			this.options.squareSize;
		const startY =
			Math.floor(this.gridOffset.y / this.options.squareSize) *
			this.options.squareSize;

		// 增加边框线宽度，特别是在iOS设备上
		this.ctx.lineWidth = isPhone ? 1.0 : 0.5;

		// 为iOS设备优化渲染，避免边框闪烁
		if (isPhone) {
			this.ctx.translate(0.5, 0.5); // 在iOS上对齐像素
		}

		// 绘制蛇身
		this.snakeBody.forEach((segment, index) => {
			const squareX =
				Math.round(segment.x * this.options.squareSize +
				startX -
				(this.gridOffset.x % this.options.squareSize));
			const squareY =
				Math.round(segment.y * this.options.squareSize +
				startY -
				(this.gridOffset.y % this.options.squareSize));

			this.ctx.shadowColor = this.options.hoverShadowColor;
			this.ctx.shadowBlur = 15;
			this.ctx.shadowOffsetX = 0;
			this.ctx.shadowOffsetY = 0;

			// 计算蛇身颜色渐变
			if (index === 0) {
				// 蛇头使用特殊颜色
				this.ctx.fillStyle = this.options.snakeHeadColor;
			} else {
				// 计算渐变系数
				const gradientFactor = Math.pow(this.options.snakeColorDecay, index);

				// 解析头部和尾部颜色
				const headColorMatch = this.options.snakeHeadColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/);
				const tailColorMatch = this.options.snakeTailColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/);

				if (headColorMatch && tailColorMatch) {
					const headR = parseInt(headColorMatch[1]);
					const headG = parseInt(headColorMatch[2]);
					const headB = parseInt(headColorMatch[3]);
					const headA = headColorMatch[4] ? parseFloat(headColorMatch[4]) : 1;

					const tailR = parseInt(tailColorMatch[1]);
					const tailG = parseInt(tailColorMatch[2]);
					const tailB = parseInt(tailColorMatch[3]);
					const tailA = tailColorMatch[4] ? parseFloat(tailColorMatch[4]) : 1;

					// 计算中间渐变色
					const r = Math.round(headR + (tailR - headR) * (1 - gradientFactor));
					const g = Math.round(headG + (tailG - headG) * (1 - gradientFactor));
					const b = Math.round(headB + (tailB - headB) * (1 - gradientFactor));
					const a = headA + (tailA - headA) * (1 - gradientFactor);

					this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
				} else {
					// 回退到简单透明度渐变
					const opacity = Math.max(0.2, gradientFactor);
					this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
				}
			}

			this.ctx.fillRect(
				squareX,
				squareY,
				this.options.squareSize,
				this.options.squareSize
			);

			this.ctx.shadowColor = "transparent";
			this.ctx.shadowBlur = 0;
		});

		// 绘制当前悬停的格子和食物
		for (
			let x = startX;
			x < this.canvas.width + this.options.squareSize;
			x += this.options.squareSize
		) {
			for (
				let y = startY;
				y < this.canvas.height + this.options.squareSize;
				y += this.options.squareSize
			) {
				const squareX = Math.round(x - (this.gridOffset.x % this.options.squareSize));
				const squareY = Math.round(y - (this.gridOffset.y % this.options.squareSize));
				const gridX = Math.floor((x - startX) / this.options.squareSize);
				const gridY = Math.floor((y - startY) / this.options.squareSize);

				// 绘制食物
				if (
					this.specialBlock &&
					gridX === this.specialBlock.x &&
					gridY === this.specialBlock.y
				) {
					this.ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
					this.ctx.shadowBlur = 20;
					this.ctx.fillStyle = this.specialBlock.color;
					this.ctx.fillRect(
						squareX,
						squareY,
						this.options.squareSize,
						this.options.squareSize
					);
					this.ctx.shadowColor = "transparent";
					this.ctx.shadowBlur = 0;
				}

				// 绘制当前悬停的格子（蛇头）
				if (
					this.hoveredSquare &&
					gridX === this.hoveredSquare.x &&
					gridY === this.hoveredSquare.y
				) {
					this.ctx.shadowColor = this.options.hoverShadowColor;
					this.ctx.shadowBlur = 15;
					this.ctx.shadowOffsetX = 0;
					this.ctx.shadowOffsetY = 0;

					const color = this.options.hoverFillColor.replace(
						"0.6",
						this.currentOpacity.toString()
					);
					this.ctx.fillStyle = color;
					this.ctx.fillRect(
						squareX,
						squareY,
						this.options.squareSize,
						this.options.squareSize
					);

					this.ctx.shadowColor = "transparent";
					this.ctx.shadowBlur = 0;
				}

				this.ctx.strokeStyle = this.options.borderColor;
				this.ctx.strokeRect(
					squareX,
					squareY,
					this.options.squareSize,
					this.options.squareSize
				);
			}
		}

		// 移动设备上重置坐标变换
		if (isPhone) {
			this.ctx.translate(-0.5, -0.5);
		}

		// 创建径向渐变来实现暗角效果
		const gradient = this.ctx.createRadialGradient(
			this.canvas.width / dpr / 2,
			this.canvas.height / dpr / 2,
			0,
			this.canvas.width / dpr / 2,
			this.canvas.height / dpr / 2,
			Math.sqrt(
				Math.pow(this.canvas.width / dpr, 2) + Math.pow(this.canvas.height / dpr, 2)
			) / 2
		);
		gradient.addColorStop(0, "rgba(6, 6, 6, 0)");
		gradient.addColorStop(1, "#060606");

		this.ctx.fillStyle = gradient;
		this.ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
	}

	updateAnimation(timestamp) {
		if (!this.lastTimestamp) {
			this.lastTimestamp = timestamp;
		}

		const deltaTime = timestamp - this.lastTimestamp;
		this.lastTimestamp = timestamp;

		// 更新透明度
		if (this.currentOpacity !== this.targetOpacity) {
			const progress = Math.min(deltaTime / this.options.transitionDuration, 1);
			this.currentOpacity =
				this.currentOpacity +
				(this.targetOpacity - this.currentOpacity) * progress;
		}

		// 更新痕迹格子的透明度
		for (const [key, square] of this.trailSquares) {
			square.opacity -= deltaTime / this.options.trailDuration;
			if (square.opacity <= 0) {
				this.trailSquares.delete(key);
			}
		}

		// 获取设备像素比
		const dpr = window.devicePixelRatio || 1;

		// 更新网格位置，为移动设备降低速度以减少闪烁
		const effectiveSpeed = Math.max(
			isPhone ? this.options.speed * 0.8 : this.options.speed,
			0
		);

		// 确保移动位置为整数值来避免子像素渲染导致的闪烁
		const moveAmount = isPhone ?
			Math.round(effectiveSpeed * 100) / 100 :
			effectiveSpeed;

		switch (this.options.direction) {
			case "right":
				this.gridOffset.x =
					(this.gridOffset.x - moveAmount + this.options.squareSize) %
					this.options.squareSize;
				break;
			case "left":
				this.gridOffset.x =
					(this.gridOffset.x + moveAmount + this.options.squareSize) %
					this.options.squareSize;
				break;
			case "up":
				this.gridOffset.y =
					(this.gridOffset.y + moveAmount + this.options.squareSize) %
					this.options.squareSize;
				break;
			case "down":
				this.gridOffset.y =
					(this.gridOffset.y - moveAmount + this.options.squareSize) %
					this.options.squareSize;
				break;
			case "diagonal":
				this.gridOffset.x =
					(this.gridOffset.x - moveAmount + this.options.squareSize) %
					this.options.squareSize;
				this.gridOffset.y =
					(this.gridOffset.y - moveAmount + this.options.squareSize) %
					this.options.squareSize;
				break;
		}

		// 检查食物是否移出屏幕
		if (this.specialBlock) {
			const startX =
				Math.floor(this.gridOffset.x / this.options.squareSize) *
				this.options.squareSize;
			const startY =
				Math.floor(this.gridOffset.y / this.options.squareSize) *
				this.options.squareSize;
			const foodX =
				Math.round(this.specialBlock.x * this.options.squareSize +
				startX -
				(this.gridOffset.x % this.options.squareSize));
			const foodY =
				Math.round(this.specialBlock.y * this.options.squareSize +
				startY -
				(this.gridOffset.y % this.options.squareSize));

			// 调整适用于设备像素比的边界检查
			if (
				foodX < -this.options.squareSize ||
				foodX > this.canvas.width / dpr ||
				foodY < -this.options.squareSize ||
				foodY > this.canvas.height / dpr
			) {
				// 食物移出屏幕时生成新的食物
				this.createSpecialBlock();
			}
		}

		this.drawGrid();
		this.animationFrame = requestAnimationFrame((timestamp) =>
			this.updateAnimation(timestamp)
		);
	}

	animate() {
		this.animationFrame = requestAnimationFrame((timestamp) =>
			this.updateAnimation(timestamp)
		);
	}

	handleVisibilityChange() {
		if (document[hiddenProperty]) {
			// 页面不可见时暂停动画
			if (this.animationFrame) {
				cancelAnimationFrame(this.animationFrame);
				this.animationFrame = null;
			}
		} else {
			// 页面重新可见时恢复动画
			if (!this.animationFrame) {
				this.lastTimestamp = 0; // 重置时间戳以防止大幅度更新
				this.animate();
			}
		}
	}

	destroy() {
		if (this.animationFrame) {
			cancelAnimationFrame(this.animationFrame);
		}
		window.removeEventListener("resize", () => this.resizeCanvas());
		this.canvas.removeEventListener("mousemove", (e) =>
			this.handleMouseMove(e)
		);
		this.canvas.removeEventListener("mouseleave", () =>
			this.handleMouseLeave()
		);
		document.removeEventListener(visibilityChangeEvent, this.handleVisibilityChange.bind(this));

		// 移除方向变化监听
		if (isPhone && window.orientation !== undefined) {
			window.removeEventListener("orientationchange", () => {});
		}
	}
}

window.hiddenProperty =
	"hidden" in document
		? "hidden"
		: "webkitHidden" in document
		? "webkitHidden"
		: "mozHidden" in document
		? "mozHidden"
		: null;

window.DIRECTIONS = {
	UP: "UP",
	DOWN: "DOWN",
	LEFT: "LEFT",
	RIGHT: "RIGHT",
	UNDIRECTED: "UNDIRECTED",
};
window.isPhone =
	/Mobile|Android|iOS|iPhone|iPad|iPod|Windows Phone|KFAPWI/i.test(
		navigator.userAgent
	);

window.isQQBrowser = /QQBrowser/i.test(navigator.userAgent);

function getMoveDirection(startx, starty, endx, endy) {
	if (!isPhone) {
		return;
	}

	const angx = endx - startx;
	const angy = endy - starty;

	if (Math.abs(angx) < 2 && Math.abs(angy) < 2) {
		return DIRECTIONS.UNDIRECTED;
	}

	const getAngle = (angx, angy) => (Math.atan2(angy, angx) * 180) / Math.PI;

	const angle = getAngle(angx, angy);
	if (angle >= -135 && angle <= -45) {
		return DIRECTIONS.UP;
	} else if (angle > 45 && angle < 135) {
		return DIRECTIONS.DOWN;
	} else if (
		(angle >= 135 && angle <= 180) ||
		(angle >= -180 && angle < -135)
	) {
		return DIRECTIONS.LEFT;
	} else if (angle >= -45 && angle <= 45) {
		return DIRECTIONS.RIGHT;
	}

	return DIRECTIONS.UNDIRECTED;
}

function loadIntro() {
	// 确保hiddenProperty已定义
	if (!window.hiddenProperty) {
		window.hiddenProperty = 'hidden';
	}
	
	if (document[hiddenProperty]) {
		return;
	}

	// 移除loadIntro.loaded检查，使函数能被重复调用
	
	const playIntroAnimation = () => {
		setTimeout(() => {
			const wrapEl = document.querySelector(".wrap");
			if (wrapEl) {
				// 先移除in类，然后添加，以触发重新动画
				wrapEl.classList.remove("in");
				// 使用setTimeout确保DOM更新
				setTimeout(() => {
					wrapEl.classList.add("in");
				}, 50);
			}
			
			setTimeout(() => {
				const subtitleEl = document.querySelector(".content-subtitle");
				if (subtitleEl && window.subtitle) {
					try {
						// 重新创建字母动画
						subtitleEl.innerHTML = `<span>${[...window.subtitle].join(
					"</span><span>"
				)}</span>`;
						
						// 重新应用动画效果到每个字母
						const spans = subtitleEl.querySelectorAll('span');
						spans.forEach((span, index) => {
							span.style.animation = 'none';
							setTimeout(() => {
								span.style.animation = '';
							}, 10);
						});
					} catch (e) {
						console.log('subtitle处理错误:', e);
						if (subtitleEl) subtitleEl.textContent = window.subtitle || '';
					}
				}
			}, 270);
		}, 0);
	};

	// 立即播放一次动画
	playIntroAnimation();
	
	// 设置定时器，每30秒重复播放动画
	if (!window.introAnimationInterval) {
		window.introAnimationInterval = setInterval(() => {
			// 只有在页面可见时才执行动画
			if (!document[hiddenProperty]) {
				playIntroAnimation();
			}
		}, 30000); // 30秒
		
		// 页面可见性变化时处理定时器
		document.addEventListener(visibilityChangeEvent, () => {
			if (document[hiddenProperty]) {
				// 页面不可见时不需要执行动画，但保留定时器
			} else {
				// 页面重新可见时立即播放一次
				playIntroAnimation();
			}
		});
	}
	
	loadIntro.loaded = true;
}

function switchPage() {
	// 移除单次切换限制，允许多次调用
	
	// 安全地获取DOM元素
	const DOM = {
		intro: document.querySelector(".content-intro") || { style: {} },
		path: document.querySelector(".shape-wrap path") || { getAttribute: () => null },
		shape: document.querySelector("svg.shape") || { style: {} },
	};
	
	// 确保anime.js库已加载
	if (typeof anime !== 'function') {
		console.log('anime.js未加载，跳过动画');
		return;
	}
	
	// 安全地设置样式
	if (DOM.shape && DOM.shape.style) {
	DOM.shape.style.transformOrigin = "50% 0%";
	}

	// 安全地执行动画
	try {
	anime({
		targets: DOM.intro,
		duration: 1100,
		easing: "easeInOutSine",
		translateY: "-200vh",
	});

	anime({
		targets: DOM.shape,
		scaleY: [
			{
				value: [0.8, 1.8],
				duration: 550,
				easing: "easeInQuad",
			},
			{
				value: 1,
				duration: 550,
				easing: "easeOutQuad",
			},
		],
	});
		
		const pathDataId = DOM.path && DOM.path.getAttribute ? DOM.path.getAttribute("pathdata:id") : null;
		
	anime({
		targets: DOM.path,
		duration: 1100,
		easing: "easeOutQuad",
			d: pathDataId,
		complete: function (anim) {
				// 安全地清理canvas
				if (typeof canvas !== 'undefined' && canvas) {
					try {
						if (typeof animationID !== 'undefined') {
				cancelAnimationFrame(animationID);
						}
						if (canvas.parentElement) {
				canvas.parentElement.removeChild(canvas);
						}
				canvas = null;
					} catch (e) {
						console.log('清理canvas时出错:', e);
					}
			}
		},
	});
	} catch (e) {
		console.log('执行动画时出错:', e);
	}

	switchPage.switched = true;
}

// 返回intro页面的函数
function switchBackToIntro() {
	// 如果还没有进入主页面，则不需要返回
	if (!loadAll.loaded) {
		return;
	}

	// 安全地获取DOM元素
	const DOM = {
		intro: document.querySelector(".content-intro") || { style: {} },
		main: document.querySelector(".content-main") || { style: {} },
		cardInner: document.querySelector(".card-inner") || { style: {} },
		shape: document.querySelector("svg.shape") || { style: {} },
	};

	// 确保anime.js库已加载
	if (typeof anime !== 'function') {
		console.log('anime.js未加载，跳过动画');
		return;
	}

	console.log('开始返回intro页面动画');

	try {
		// 隐藏主页面内容
		if (DOM.cardInner && DOM.cardInner.classList) {
			DOM.cardInner.classList.remove("in");
		}

		// 将intro页面从上方滑回来
		anime({
			targets: DOM.intro,
			duration: 1100,
			easing: "easeInOutSine",
			translateY: "0vh",
		});

		// 重置shape的缩放
		anime({
			targets: DOM.shape,
			duration: 1100,
			easing: "easeInOutSine",
			scaleY: 1,
		});

		// 重置状态标志
		setTimeout(() => {
			loadAll.loaded = false;
			switchPage.switched = false;
			loadMain.loaded = false;

			// 重新启动intro动画
			if (typeof loadIntro === 'function') {
				loadIntro();
			}
		}, 1100);

	} catch (e) {
		console.log('执行返回动画时出错:', e);
	}
}

function loadMain() {
	if (loadMain.loaded) {
		return;
	}
	
	// 确保isPhone变量存在
	if (typeof isPhone === 'undefined') {
		window.isPhone = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
	}
	
	// 确保isQQBrowser变量存在
	if (typeof isQQBrowser === 'undefined') {
		window.isQQBrowser = false;
	}
	
	setTimeout(() => {
		// 安全地获取元素
		const cardInner = document.querySelector(".card-inner");
		if (cardInner) {
			cardInner.classList.add("in");
		}
		
		setTimeout(() => {
			try {
			const canvas = document.getElementById("gridCanvas");
			if (canvas) {
					// 统一使用默认主题
				const defaultTheme = {
					direction: "diagonal",
					speed: isPhone ? 0.03 : 0.05,
					borderColor: isPhone ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)",
					squareSize: isPhone ? 50 : 40,
					hoverFillColor: "rgba(255, 255, 255, 0.8)",
					hoverShadowColor: "rgba(255, 255, 255, 0.8)",
					transitionDuration: 200,
					trailDuration: 1500,
					specialBlockColor: "rgba(100, 255, 152, 0.8)",
					specialHoverColor: "rgba(29, 202, 29, 0.8)",
					snakeHeadColor: "rgba(255, 255, 255, 0.95)",
					snakeTailColor: "rgba(218, 231, 255, 0.25)",
					snakeColorDecay: 0.85, // 颜色衰减系数
				};
				
					// 确保GridAnimation类存在
					if (typeof GridAnimation === 'function') {
						try {
							const gridAnimation = new GridAnimation(canvas, defaultTheme);
				gridAnimation.init();
						} catch (e) {
							console.log('初始化GridAnimation时出错:', e);
						}
					} else {
						console.log('GridAnimation类未定义');
					}
				}
			} catch (e) {
				console.log('加载canvas时出错:', e);
			}
		}, 1100);
	}, 400);
	
	loadMain.loaded = true;
}

function loadAll() {
	if (loadAll.loaded) {
		return;
	}
	switchPage();
	loadMain();
	loadAll.loaded = true;
	
	// 添加页面卸载时的清理逻辑
	window.addEventListener("beforeunload", function() {
		// 清除动画定时器
		if (window.introAnimationInterval) {
			clearInterval(window.introAnimationInterval);
			window.introAnimationInterval = null;
		}
		// 清除泼墨效果定时器
		if (window.splatsInterval) {
			clearInterval(window.splatsInterval);
			window.splatsInterval = null;
		}
	});
}

// 确保hiddenProperty已定义
if (!window.hiddenProperty) {
	window.hiddenProperty = 'hidden';
}

window.visibilityChangeEvent = window.hiddenProperty.replace(
	/hidden/i,
	"visibilitychange"
);

// 安全地添加事件监听
try {
	window.addEventListener(window.visibilityChangeEvent, loadIntro);
} catch (e) {
	console.log('添加visibilitychange监听器失败:', e);
	// 回退到默认的visibilitychange
	window.addEventListener('visibilitychange', loadIntro);
}

window.addEventListener("DOMContentLoaded", loadIntro);

// 安全地获取元素并添加事件
const enterEl = document.querySelector(".enter");
if (enterEl) {
enterEl.addEventListener("click", loadAll);
	// touchenter不是标准事件，修改为touchstart
	enterEl.addEventListener("touchstart", loadAll);
}

// 滚轮事件处理 - 向下滚动进入主页面，向上滚动返回intro页面
function handleWheelEvent(e) {
	// 检查滚动方向
	// deltaY > 0 表示向下滚动
	// wheelDelta < 0 表示向下滚动（与deltaY相反）
	// detail > 0 表示向下滚动
	let isScrollingDown = false;
	let isScrollingUp = false;

	if (e.deltaY !== undefined) {
		isScrollingDown = e.deltaY > 0;
		isScrollingUp = e.deltaY < 0;
	} else if (e.wheelDelta !== undefined) {
		isScrollingDown = e.wheelDelta < 0;
		isScrollingUp = e.wheelDelta > 0;
	} else if (e.detail !== undefined) {
		isScrollingDown = e.detail > 0;
		isScrollingUp = e.detail < 0;
	}

	// 如果在intro页面且向下滚动，则进入主页面
	if (!loadAll.loaded && isScrollingDown) {
		console.log('检测到向下滚动，触发进入效果');
		loadAll();
	}
	// 如果在主页面且向上滚动，则返回intro页面
	else if (loadAll.loaded && isScrollingUp) {
		console.log('检测到向上滚动，返回intro页面');
		switchBackToIntro();
	}
}

// 添加滚轮事件监听器
try {
	// 现代浏览器使用wheel事件
	document.addEventListener("wheel", handleWheelEvent, { passive: true });
	// 兼容旧版浏览器
	document.addEventListener("mousewheel", handleWheelEvent, { passive: true });
	// Firefox的DOMMouseScroll事件
	document.addEventListener("DOMMouseScroll", handleWheelEvent, { passive: true });
} catch (e) {
	console.log('添加滚轮监听器失败:', e);
}

// 为所有箭头元素添加事件监听
const arrowEls = document.querySelectorAll(".arrow");
arrowEls.forEach(arrowEl => {
	if (arrowEl) {
		// 点击箭头进入主页面
		arrowEl.addEventListener("click", loadAll);
		// 鼠标悬停也可以进入（保持原有功能）
		arrowEl.addEventListener("mouseenter", loadAll);
		// 添加指针样式
		arrowEl.style.cursor = "pointer";
	}
});

if (isPhone) {
	document.addEventListener(
		"touchstart",
		function (e) {
			window.startx = e.touches[0].pageX;
			window.starty = e.touches[0].pageY;
		},
		{ passive: true }
	);
	document.addEventListener(
		"touchend",
		function (e) {
			let endx, endy;
			endx = e.changedTouches[0].pageX;
			endy = e.changedTouches[0].pageY;

			const direction = getMoveDirection(startx, starty, endx, endy);

			// 如果在intro页面且向上滑动，则进入主页面
			if (!loadAll.loaded && direction === DIRECTIONS.UP) {
				loadAll();
			}
			// 如果在主页面且向下滑动，则返回intro页面
			else if (loadAll.loaded && direction === DIRECTIONS.DOWN) {
				console.log('检测到向下滑动，返回intro页面');
				switchBackToIntro();
			}
		},
		{ passive: true }
	);
}



// 移除开发工具集成，避免require错误
// 如果需要开发工具，请在构建系统中正确配置
