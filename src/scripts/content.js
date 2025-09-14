// src/scripts/content.js
console.log('🔥 炎上チェッカー Content Script 読み込み開始');
console.log('現在のURL:', window.location.href);

const API_BASE_URL = 'https://(デプロイ後に決定)';

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

async function checkPostWithAPI(postContent) {
    if (!postContent) {
        console.error("投稿内容が空です。");
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/check/post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ post: postContent })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`APIエラー: ${response.status}`, data.detail);
            return null;
        }

        console.log("APIレスポンス:", data);
        return data;

    } catch (error) {
        console.error('API呼び出し中にエラーが発生しました:', error);
        return null;
    }
}

function getPostText() {
    const postTextarea = document.querySelector('div[role="textbox"][data-testid="tweetTextarea_0"]');
    if (postTextarea) {
        return postTextarea.textContent;
    }

    const replyTextarea = document.querySelector('div[role="textbox"][data-testid*="tweetTextarea_"]');
    if (replyTextarea) {
        return replyTextarea.textContent;
    }

    return '';
}

function findAndReplaceButtons() {
    const allButtons = document.querySelectorAll('button, div[role="button"]');
    allButtons.forEach(button => {
        if (button.dataset.enjoModified) {
            return;
        }

        const text = button.textContent || button.innerText;
        const testId = button.getAttribute('data-testid');

        const isPostButton = (
            (text.includes('投稿') || text.includes('Post') || text.includes('ポスト')) ||
            (button.getAttribute('aria-label')?.includes('投稿') || button.getAttribute('aria-label')?.includes('Post') || button.getAttribute('aria-label')?.includes('ポスト'))
        ) && (
            testId === 'tweetButtonInline' || testId === 'tweetButton' || testId === 'postButton'
        );

        const isReplyButton = (
            testId === 'replyButton' &&
            button.offsetWidth > 0 && button.offsetHeight > 0
        );

        if (isPostButton || isReplyButton) {
            try {
                const clonedButton = button.cloneNode(true);
                button.parentNode.replaceChild(clonedButton, button);
                
                clonedButton.textContent = '🔥 炎上チェック';
                clonedButton.dataset.enjoModified = 'true';
                clonedButton.classList.add('enjo-checker-button');

                clonedButton.addEventListener('click', async (event) => {
                    event.preventDefault();
                    const postContent = getPostText();
                    const result = await checkPostWithAPI(postContent);
                    if (result) {
                        alert(`🔥 炎上チェック結果:\nリスクレベル: ${result.risk_level}\n\nAIコメント: ${result.ai_comment}`);
                    } else {
                        alert('🚨 炎上チェックに失敗しました。時間をおいて再度お試しください。');
                    }
                });
            } catch (error) {
                console.error('ボタン変更中にエラーが発生:', error);
            }
        }
    });
}

function initialize() {
    setTimeout(() => findAndReplaceButtons(), 2000);
    
    const debouncedFindAndReplace = debounce(findAndReplaceButtons, 1000);
    const observer = new MutationObserver(debouncedFindAndReplace);
    observer.observe(document.body, { childList: true, subtree: true });
}

let currentURL = location.href;
setInterval(() => {
    if (location.href !== currentURL) {
        currentURL = location.href;
        findAndReplaceButtons();
    }
}, 1000);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

const style = document.createElement('style');
style.textContent = `
    .enjo-checker-button {
        background: linear-gradient(135deg, #FF4500, #FF8C00);
        color: white !important;
        font-weight: bold;
        border: none;
        box-shadow: 0 4px 10px rgba(255, 69, 0, 0.4);
        display: flex;
        justify-content: center;
        align-items: center;
        animation: pulse 0.5s ease-in-out;
    }
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

console.log('✅ 炎上チェッカー初期化完了');