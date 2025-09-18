/* global chrome */

const SELECTORS = {
    POST_TEXTAREA: 'div[role="textbox"][data-testid="tweetTextarea_0"]',
    REPLY_TEXTAREA: 'div[role="textbox"][data-testid*="tweetTextarea_"]:not([data-testid="tweetTextarea_0"])',
    TWEET_BUTTON_TEST_IDS: ['tweetButtonInline', 'tweetButton', 'postButton', 'tweetButtonThread'],
    REPLY_BUTTON_TEST_ID: 'replyButton',
    POST_TEXTS: ['投稿', 'Post', 'ポスト', 'すべてポスト']
};

// 活性時のスタイル
const activeStyles = {
    background: 'linear-gradient(135deg, #FF4500, #FF8C00)',
    color: 'white',
    fontWeight: 'bold',
    border: 'none',
    boxShadow: '0 4px 10px rgba(255, 69, 0, 0.4)',
    opacity: '1',
    pointerEvents: 'auto',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'opacity 0.3s ease, background-color 0.3s ease'
};

// 非活性時のスタイル
const disabledStyles = {
    background: 'linear-gradient(135deg, #999, #777)',
    color: 'white',
    fontWeight: 'bold',
    opacity: '0.6',
    cursor: 'not-allowed',
    boxShadow: 'none',
    border: 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
};

// ヘルパー関数：スタイルを要素に適用する
function applyStyles(element, styles) {
    for (const property in styles) {
        element.style[property] = styles[property];
    }
}

let isHijackingEnabled = true;

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function getPostText() {
    const postTextarea = document.querySelector(SELECTORS.POST_TEXTAREA);
    if (postTextarea) { return postTextarea.textContent; }
    const replyTextarea = document.querySelector(SELECTORS.REPLY_TEXTAREA);
    if (replyTextarea) { return replyTextarea.textContent; }
    return '';
}

function updateAllButtonStates() {
    const postContent = getPostText();
    const hasText = postContent.trim().length > 0;
    const allHijackedButtons = document.querySelectorAll('[data-enjo-hijacked="true"]');
    
    allHijackedButtons.forEach(button => {
        button.disabled = !hasText;
        if (hasText) {
            // 活性時のスタイルをJSで直接上書き
            applyStyles(button, activeStyles);
        } else {
            // 非活性時のスタイルをJSで直接上書き
            applyStyles(button, disabledStyles);
        }
    });
}

function findAndHijackButtons() {
    if (!isHijackingEnabled) { return; }

    const allButtons = document.querySelectorAll('button, div[role="button"]');
    allButtons.forEach(button => {
        if (button.dataset.enjoHijacked) { return; }

        const text = button.textContent || button.innerText;
        const testId = button.getAttribute('data-testid');

        const isPostButton = (
            (SELECTORS.POST_TEXTS.some(t => text.includes(t))) ||
            (button.getAttribute('aria-label') && SELECTORS.POST_TEXTS.some(t => button.getAttribute('aria-label').includes(t)))
        ) && (
            SELECTORS.TWEET_BUTTON_TEST_IDS.includes(testId)
        );

        const isReplyButton = (
            testId === SELECTORS.REPLY_BUTTON_TEST_ID &&
            button.offsetWidth > 0 && button.offsetHeight > 0
        );

        if (isPostButton || isReplyButton) {
            try {
                button.dataset.originalHTML = button.innerHTML;
                button.textContent = '🔥 炎上チェック';
                button.dataset.enjoHijacked = 'true';
                
                // classList.addはマーカーとして残し、実際のスタイルはJSで設定
                button.classList.add('enjo-hijacked-button');
                // 初期状態（非活性）のスタイルを適用
                applyStyles(button, disabledStyles);

                const newClickListener = (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    isHijackingEnabled = true;
                    
                    const postContent = getPostText();
                    if (postContent) {
                        chrome.runtime.sendMessage({
                            action: 'sendAPIRequest',
                            text: postContent
                        });
                    }
                    console.log('投稿ボタンがクリックされました。APIリクエストを送信します。:', postContent);
                };
                
                if (button.enjoClickListener) {
                    button.removeEventListener('click', button.enjoClickListener, { capture: true });
                }
                button.addEventListener('click', newClickListener, { capture: true });
                button.enjoClickListener = newClickListener;

            } catch (error) {
                console.error('ボタンの書き換え中にエラーが発生:', error);
            }
        }
    });
    updateAllButtonStates();
}

function initialize() {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        .enjo-result {
            position: absolute;
            bottom: calc(100% + 5px);
            left: 0;
            z-index: 1000;
            width: max-content;
            white-space: nowrap;
            padding: 10px;
            border-radius: 8px;
            background-color: #D5D5D5;
            color: white;
            font-size: 14px;
            line-height: 1.5;
        }
    `;
    document.head.appendChild(styleSheet);

    findAndHijackButtons();
    
    const debouncedFindAndHijack = debounce(findAndHijackButtons, 300);
    const observer = new MutationObserver(debouncedFindAndHijack);
    observer.observe(document.body, { childList: true, subtree: true });

    const debouncedUpdateButtons = debounce(updateAllButtonStates, 200);
    document.body.addEventListener('input', (event) => {
        if (event.target.matches(SELECTORS.POST_TEXTAREA) || event.target.matches(SELECTORS.REPLY_TEXTAREA)) {
            debouncedUpdateButtons();
        }
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'doPostButton') {
        const hijackedButtons = document.querySelectorAll('[data-enjo-hijacked="true"]');
        hijackedButtons.forEach(button => {
            // スタイルをリセット
            button.style.cssText = '';
            button.innerHTML = button.dataset.originalHTML || '投稿';
            button.removeAttribute('data-enjo-hijacked');
            button.removeAttribute('data-original-h-t-m-l');
            button.classList.remove('enjo-hijacked-button'); 
            
            if (button.enjoClickListener) {
                button.removeEventListener('click', button.enjoClickListener, { capture: true });
                delete button.enjoClickListener;
            }
        });
        isHijackingEnabled = false;
        sendResponse({ status: 'completed' });
    }
    return true;
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}