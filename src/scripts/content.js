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
    if (!isHijackingEnabled) return;

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

    // テキスト入力時の処理を一つの関数にまとめる
    const handleTextInput = () => {
        // もしハイジャックが無効化されていたら、有効に戻して再乗っ取りを実行
        if (!isHijackingEnabled) {
            console.log('テキストが再編集されました。ボタンの乗っ取りを再開します。');
            isHijackingEnabled = true;
            findAndHijackButtons(); // ボタンを即座に再乗っ取り
        }
        // 既存の機能：ボタンの活性/非活性状態を更新
        updateAllButtonStates();
    };
    
    // パフォーマンスのためにdebounce（遅延実行）を設定
    const debouncedHandleTextInput = debounce(handleTextInput, 200);

    // テキストエリアへの入力イベントを監視
    document.body.addEventListener('input', (event) => {
        if (event.target.matches(SELECTORS.POST_TEXTAREA) || event.target.matches(SELECTORS.REPLY_TEXTAREA)) {
            debouncedHandleTextInput();
        }
    });
}


/**
 * ハイジャックされたボタンを元の状態に戻す関数
 * @param {HTMLElement} button - 元に戻すボタン要素
 */
function restoreOriginalButton(button) {
    button.style.cssText = '';
    button.innerHTML = button.dataset.originalHTML || '投稿';
    button.removeAttribute('data-enjo-hijacked');
    button.removeAttribute('data-original-html');
    button.classList.remove('enjo-hijacked-button'); 
    
    if (button.enjoClickListener) {
        button.removeEventListener('click', button.enjoClickListener, { capture: true });
        delete button.enjoClickListener;
    }
}

/**
 * 投稿完了をDOMの変化から検知して、コールバックを実行する関数
 * @param {function} callback - 投稿完了後に実行する関数
 */
function observeForPostCompletion(callback) {
    const TOAST_SELECTOR = '[data-testid="toast"]';
    const TOAST_TEXTS = ['投稿しました', 'Your Post was sent'];
    const postTextarea = document.querySelector(SELECTORS.POST_TEXTAREA);

    let timeoutId = null;

    const observer = new MutationObserver((mutations, obs) => {
        let postCompleted = false;

        // 条件1: 投稿テキストエリアがDOMから消えたか
        if (postTextarea && !document.body.contains(postTextarea)) {
            console.log('投稿完了を検知: テキストエリアが削除されました。');
            postCompleted = true;
        }

        // 条件2: 「投稿しました」のトーストが表示されたか
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const toast = node.querySelector(TOAST_SELECTOR) || (node.matches && node.matches(TOAST_SELECTOR));
                        if (toast && TOAST_TEXTS.some(text => toast.textContent.includes(text))) {
                            console.log('投稿完了を検知: トースト通知が表示されました。');
                            postCompleted = true;
                            break;
                        }
                    }
                }
            }
            if (postCompleted) break;
        }

        if (postCompleted) {
            clearTimeout(timeoutId); // タイムアウトをキャンセル
            obs.disconnect();
            callback();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    timeoutId = setTimeout(() => {
        observer.disconnect();
        console.log('タイムアウト: 投稿完了を検知できませんでしたが、念のため再乗っ取りを試みます。');
        callback();
    }, 10000); // 10秒でタイムアウト
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 【乗っ取り解除のみ】のリクエスト
    if (message.action === 'doPostButton') {
        console.log('doPostButtonを受信: リスクがlowのため、投稿せずに乗っ取りを解除します。');
        
        // ハイジャック機能をOFFにする
        isHijackingEnabled = false;
        
        const hijackedButtons = document.querySelectorAll('[data-enjo-hijacked="true"]');
        hijackedButtons.forEach(button => {
            restoreOriginalButton(button);
        });
        
        sendResponse({ status: 'unhijacked_without_posting' });
        return true;
    }
    
    // 【ボタン再乗っ取り】のリクエスト
    if (message.action === 'returnEnjoButton') {
        console.log('returnEnjoButtonを受信: ボタンを再乗っ取りします。');
        isHijackingEnabled = true;
        findAndHijackButtons();
        
        sendResponse({ status: 're-hijacked' });
        return true;
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}