/* eslint-disable no-unused-vars */
console.log('🔥 炎上チェッカー Content Script 読み込み開始');
console.log('現在のURL:', window.location.href);

function findAndReplaceButtons() {
    const allButtons = document.querySelectorAll('button, div[role="button"]');
    let buttonsFound = 0;

    allButtons.forEach(button => {
        if (button.dataset.enjoModified) {
            return;
        }

        const text = button.textContent || button.innerText;
        const testId = button.getAttribute('data-testid');

        const isPostButton = (
            (text.includes('投稿') || text.includes('Post') || text.includes('ポスト')) &&
            (testId === 'tweetButtonInline' || testId === 'tweetButton')
        );

        const isReplyButton = (
            (testId === 'replyButton') &&
            (text.includes('返信') || text.includes('Reply')) &&
            button.offsetWidth > 0 && button.offsetHeight > 0
        );

        if (isPostButton || isReplyButton) {
            buttonsFound++;
            
            try {
                button.dataset.originalText = text;
                button.dataset.originalStyle = button.style.cssText;
                
                button.textContent = '🔥 炎上チェック';
                button.dataset.enjoModified = 'true';
                
                button.classList.add('enjo-button');
                
                button.style.animation = 'pulse 0.5s ease-in-out';
                setTimeout(() => {
                    button.style.animation = '';
                }, 500);
            } catch (error) {
                console.error('ボタン変更中にエラーが発生:', error);
            }
        }
    });
}

function initialize() {
    setTimeout(() => {
        findAndReplaceButtons();
    }, 2000);
    
    setInterval(() => {
        findAndReplaceButtons();
    }, 5000);
    
    const observer = new MutationObserver(() => {
        setTimeout(findAndReplaceButtons, 1000);
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

let currentURL = location.href;
setInterval(() => {
    if (location.href !== currentURL) {
        currentURL = location.href;
        
        setTimeout(() => {
            findAndReplaceButtons();
        }, 3000);
    }
}, 1000);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

const style = document.createElement('style');
style.textContent = `
    .enjo-button {
        background: linear-gradient(135deg, #FF4500, #FF8C00) !important;
        color: white !important;
        font-weight: bold !important;
        border: none !important;
        box-shadow: 0 4px 10px rgba(255, 69, 0, 0.4) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
    }
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

console.log('✅ 炎上チェッカー初期化完了');