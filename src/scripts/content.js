/* global chrome */
console.log('🔥 炎上チェッカー Content Script 読み込み開始');
console.log('現在のURL:', window.location.href);

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
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

function showEnjoResult(resultDiv, data) {
    resultDiv.innerHTML = `
        <p><strong>リスクレベル:</strong> ${data.risk_level}</p>
        <p><strong>AIコメント:</strong> ${data.ai_comment}</p>
    `;
    resultDiv.style.display = 'block';

    setTimeout(() => {
        resultDiv.style.display = 'none';
        resultDiv.innerHTML = '';
    }, 5000);
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

                const resultDiv = document.createElement('div');
                resultDiv.classList.add('enjo-result');
                resultDiv.style.cssText = `
                    display: none;
                    margin-top: 10px;
                    padding: 10px;
                    border-radius: 8px;
                    background-color: #25282b;
                    border: 1px solid #3e4246;
                    color: white;
                    font-size: 14px;
                    line-height: 1.5;
                `;
                button.parentNode.insertBefore(resultDiv, clonedButton.nextSibling);

                clonedButton.addEventListener('click', (event) => {
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
                });
            } catch (error) {
                console.error('ボタン変更中にエラーが発生:', error);
            }
        }
    });
}

function initialize() {
    const initialScan = () => {
        if (document.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]')) {
            findAndReplaceButtons();
        } else {
            setTimeout(initialScan, 500);
        }
    };
    initialScan();
    
    const debouncedFindAndReplace = debounce(findAndReplaceButtons, 1000);
    const observer = new MutationObserver(debouncedFindAndReplace);
    observer.observe(document.body, { childList: true, subtree: true });
}

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