/* global chrome */

const SELECTORS = {
    POST_TEXTAREA: 'div[role="textbox"][data-testid="tweetTextarea_0"]',
    REPLY_TEXTAREA: 'div[role="textbox"][data-testid*="tweetTextarea_"]:not([data-testid="tweetTextarea_0"])',
    TWEET_BUTTON_TEST_IDS: ['tweetButtonInline', 'tweetButton', 'postButton'],
    REPLY_BUTTON_TEST_ID: 'replyButton',
    POST_TEXTS: ['投稿', 'Post', 'ポスト']
};

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
    if (postTextarea) {
        return postTextarea.textContent;
    }

    const replyTextarea = document.querySelector(SELECTORS.REPLY_TEXTAREA);
    if (replyTextarea) {
        return replyTextarea.textContent;
    }

    return '';
}

function showEnjoResult(resultDiv, data) {
    if (resultDiv.enjoTimeoutId) {
        clearTimeout(resultDiv.enjoTimeoutId);
    }
    
    const riskLevelText = `リスクレベル: ${data.risk_level}`;
    const aiCommentText = `AIコメント: ${data.ai_comment}`;

    resultDiv.innerHTML = `<p><strong></strong></p><p><strong></strong></p>`;
    const [riskStrong, aiCommentStrong] = resultDiv.querySelectorAll('strong');
    riskStrong.textContent = riskLevelText;
    aiCommentStrong.textContent = aiCommentText;
    
    resultDiv.style.display = 'block';

    resultDiv.enjoTimeoutId = setTimeout(() => {
        resultDiv.style.display = 'none';
        resultDiv.innerHTML = '';
        delete resultDiv.enjoTimeoutId;
    }, 5000);
}

function findAndHijackButtons() {
    const allButtons = document.querySelectorAll('button, div[role="button"]');
    allButtons.forEach(button => {
        if (button.dataset.enjoHijacked) {
            return;
        }

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
                button.textContent = '🔥 炎上チェック';
                button.dataset.enjoHijacked = 'true';
                // button.classList.add('enjo-checker-button');
                button.removeAttribute('disabled');
                button.style.pointerEvents = 'auto';

                const resultDiv = document.createElement('div');
                resultDiv.classList.add('enjo-result');
                resultDiv.style.display = 'none'; 
                button.parentNode.insertBefore(resultDiv, button.nextSibling);

                const newClickListener = (event) => {
                    event.stopPropagation();
                    event.preventDefault();

                    const postContent = getPostText();
                    
                    if (postContent) {
                        resultDiv.style.display = 'none';

                        chrome.runtime.sendMessage({
                            action: 'sendAPIRequest',
                            text: postContent
                        }, (response) => {
                            if (response.success) {
                                showEnjoResult(resultDiv, response.data);
                            } else {
                                console.error('API呼び出し中にエラーが発生しました:', response.error);
                                resultDiv.innerHTML = '<p style="color:red;">🚨 炎上チェックに失敗しました。</p>';
                                resultDiv.style.display = 'block';
                            }
                        });
                    } else {
                        resultDiv.innerHTML = '<p style="color:red;">投稿内容がありません。</p>';
                        resultDiv.style.display = 'block';
                    }
                };

                button.addEventListener('click', newClickListener, { capture: true });

                const textarea = document.querySelector(SELECTORS.POST_TEXTAREA) || document.querySelector(SELECTORS.REPLY_TEXTAREA);
                if (textarea && !textarea.dataset.enjoEnterHijacked) {
                    textarea.dataset.enjoEnterHijacked = 'true';
                    textarea.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter') {
                            event.stopPropagation();
                        }
                    }, { capture: true });
                }

            } catch (error) {
                console.error('ボタン乗っ取り中にエラーが発生:', error);
            }
        }
    });
}

function initialize() {
    findAndHijackButtons();
    const debouncedFindAndHijack = debounce(findAndHijackButtons, 300);
    const observer = new MutationObserver(debouncedFindAndHijack);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'disabled'] });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

const style = document.createElement('style');
style.textContent = `
    [data-enjo-hijacked="true"] {
        background: linear-gradient(135deg, #FF4500, #FF8C00) !important;
        color: white !important;
        font-weight: bold;
        border: none !important;
        box-shadow: 0 4px 10px rgba(255, 69, 0, 0.4);
        opacity: 1 !important;
        pointer-events: auto !important;
        cursor: pointer !important;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: pulse 0.5s ease-in-out;
    }
    .enjo-result {
        margin-top: 10px;
        padding: 10px;
        border-radius: 8px;
        background-color: #25282b;
        border: 1px solid #3e4246;
        color: white;
        font-size: 14px;
        line-height: 1.5;
    }
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);