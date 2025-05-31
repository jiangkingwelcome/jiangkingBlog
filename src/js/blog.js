// 页面加载动画
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) { // Good practice to check if element exists
            loader.style.display = 'none';
        }
    }, 1000);
});

// 鼠标跟随光效
const cursorGlow = document.getElementById('cursorGlow');
if (cursorGlow) { // Check if element exists
    let mouseX = 0, mouseY = 0;
    let currentX = 0, currentY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateCursor() {
        currentX += (mouseX - currentX) * 0.1;
        currentY += (mouseY - currentY) * 0.1;
        
        cursorGlow.style.left = currentX + 'px';
        cursorGlow.style.top = currentY + 'px';
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
}


// 生成星星背景
function createStars() {
    const starsContainer = document.getElementById('stars');
    if (!starsContainer) return; // Exit if container not found

    const starCount = 100;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star'; // Class for styling
        star.style.width = Math.random() * 3 + 'px';
        star.style.height = star.style.width;
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        starsContainer.appendChild(star);
    }
}
createStars(); // Call the function

// 侧边栏切换
function toggleSidebar() { // This function is called by onclick attribute in Pug
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar && overlay) { // Check if elements exist
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

// 滚动效果
let lastScrollTop = 0;
window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const topNav = document.getElementById('topNav');
    
    if (topNav) { // Check if element exists
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            topNav.style.transform = 'translateY(-100%)';
        } else {
            topNav.style.transform = 'translateY(0)';
        }
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
});

// 导航激活状态
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', (event) => { // Added event parameter
        // Prevent default if it's an anchor link that shouldn't navigate immediately
        // if (item.querySelector('a[href="#"]')) {
        //     event.preventDefault(); 
        // }
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
    });
});

// 工具按钮效果
const toolBtns = document.querySelectorAll('.tool-btn');
toolBtns.forEach(btn => {
    btn.addEventListener('click', function() { // Use function for 'this' context
        // 添加点击反馈
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = '';
        }, 100);
    });
});

// 卡片悬停3D效果
const postCards = document.querySelectorAll('.post-card');
postCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Adjust rotation intensity if needed
        const rotateX = (y - centerY) / 20; // Reduced intensity
        const rotateY = (centerX - x) / 20; // Reduced intensity
        
        // Include the hover scale effect from CSS also, or manage it solely via JS
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02) translateZ(10px)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = ''; // Resets to CSS defined hover/base state
    });
});

// 标签点击波纹效果
const tags = document.querySelectorAll('.tag');
tags.forEach(tag => {
    tag.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent navigation if href="#"
        const ripple = document.createElement('span');
        // Apply styles directly for ripple, or define a class
        ripple.style.position = 'absolute';
        ripple.style.width = '0px'; // Start small
        ripple.style.height = '0px';// Start small
        ripple.style.background = 'rgba(255, 255, 255, 0.3)'; // Softer ripple
        ripple.style.borderRadius = '50%';
        ripple.style.transform = 'translate(-50%, -50%) scale(0)';
        ripple.style.animation = 'rippleEffect 0.6s ease-out'; // Animation defined in Less/CSS
        
        const rect = this.getBoundingClientRect();
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        
        // Ensure ripple is appended and removed correctly
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// 平滑滚动 (Anchor link scrolling)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const hrefAttribute = this.getAttribute('href');
        if (hrefAttribute === '#') { // Simple hash, often used for placeholder links
            e.preventDefault(); // Prevent jumping to top of page
            // Optionally, do nothing or handle as a non-scrolling click
            return; 
        }

        // Attempt to find target, if it's an ID on the page
        try {
            const targetElement = document.querySelector(hrefAttribute);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
            // If targetElement is not found, browser will handle default anchor behavior (if any)
        } catch (error) {
            // Invalid selector, browser will handle default anchor behavior
            console.warn('Smooth scroll target not found or invalid selector:', hrefAttribute);
        }
    });
});

// Removed the dynamic style injection for rippleEffect as it's better in Less/CSS.
// const style = document.createElement('style');
// style.textContent = `
//     @keyframes rippleEffect {
//         to {
//             transform: translate(-50%, -50%) scale(2);
//             opacity: 0;
//         }
//     }
// `;
// document.head.appendChild(style);