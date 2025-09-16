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

// テキストの有無に基づいて、すべての「炎上チェック」ボタンの活性/非活性状態を更新
function updateAllButtonStates() {
    const postContent = getPostText();
    const hasText = postContent.trim().length > 0;

    const allHijackedButtons = document.querySelectorAll('[data-enjo-hijacked="true"]');
    allHijackedButtons.forEach(button => {
        // テキストがなければ disabled を true (非活性) に、あれば false (活性) に設定
        button.disabled = !hasText;
    });
}

function showTemporaryMessage(element, htmlContent, duration = 3000) {
    // 既存のタイマーがあればクリアする
    if (element.enjoTimeoutId) {
        clearTimeout(element.enjoTimeoutId);
    }
    element.innerHTML = htmlContent;
    element.style.display = 'block';

    // 指定時間後にメッセージを非表示にする
    element.enjoTimeoutId = setTimeout(() => {
        element.style.display = 'none';
        element.innerHTML = '';
        delete element.enjoTimeoutId;
    }, duration);
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
                button.style.pointerEvents = 'auto';

                // 既存の結果表示領域を探し、なければ作成
                let resultDiv = button.parentNode.querySelector('.enjo-result');
                if (!resultDiv) {
                    resultDiv = document.createElement('div');
                    resultDiv.classList.add('enjo-result');
                    resultDiv.style.display = 'none'; 
                    button.parentNode.insertBefore(resultDiv, button.nextSibling);
                }

                // メッセージをボタンの上に表示するために親要素を基準にする
                button.parentNode.style.position = 'relative';

                // クリック時の動作を定義
                const newClickListener = (event) => {
                    event.stopPropagation();
                    event.preventDefault();

                    const postContent = getPostText();
                    
                    // ボタンが活性状態の場合のみAPIを叩く ( safeguard )
                    if (postContent) {
                        resultDiv.style.display = 'none';

                        chrome.runtime.sendMessage({
                            action: 'sendAPIRequest',
                            text: postContent
                        }, (response) => {
                            if (response.success) {
                                console.log('レスポンス', response.data);
                            } else {
                                console.error('API呼び出し中にエラーが発生しました:', response.error);
                                const errorMessage = '<p class="enjo-error">炎上チェックに失敗しました</p>';
                                showTemporaryMessage(resultDiv, errorMessage, 3000);
                            }
                        });
                    }

                    console.log('炎上チェックボタンがクリックされました:', postContent)
                };
                
                // 多重登録を防ぐために古いリスナーを削除
                if (button.enjoClickListener) {
                    button.removeEventListener('click', button.enjoClickListener, { capture: true });
                }
                button.addEventListener('click', newClickListener, { capture: true });
                button.enjoClickListener = newClickListener;


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
    // この関数が実行された時点で、一度全ボタンの状態を更新する
    updateAllButtonStates();
}

function initialize() {
    findAndHijackButtons();
    
    const debouncedFindAndHijack = debounce(findAndHijackButtons, 300);
    const observer = new MutationObserver(debouncedFindAndHijack);
    observer.observe(document.body, { childList: true, subtree: true });

    // テキスト入力を監視し、ボタンの状態を更新するリスナーを追加
    const debouncedUpdateButtons = debounce(updateAllButtonStates, 200);
    document.body.addEventListener('input', (event) => {
        // イベント発生元が投稿エリアか確認
        if (event.target.matches(SELECTORS.POST_TEXTAREA) || event.target.matches(SELECTORS.REPLY_TEXTAREA)) {
            debouncedUpdateButtons();
        }
    });
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
        transition: opacity 0.3s ease, background-color 0.3s ease; /* スムーズな変化のためのトランジション */
    }

    /* 非活性時のスタイル */
    [data-enjo-hijacked="true"][disabled] {
        background: linear-gradient(135deg, #999, #777) !important; /* グレー系の背景 */
        opacity: 0.6 !important;
        cursor: not-allowed !important; /* カーソルを禁止マークに */
        box-shadow: none !important;
    }

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
document.head.appendChild(style);