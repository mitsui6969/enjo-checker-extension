/* global chrome */

const SELECTORS = {
    POST_TEXTAREA: 'div[role="textbox"][data-testid="tweetTextarea_0"]',
    REPLY_TEXTAREA: 'div[role="textbox"][data-testid*="tweetTextarea_"]:not([data-testid="tweetTextarea_0"])',
    TWEET_BUTTON_TEST_IDS: ['tweetButtonInline', 'tweetButton', 'postButton'],
    REPLY_BUTTON_TEST_ID: 'replyButton',
    POST_TEXTS: ['投稿', 'Post', 'ポスト']
};

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
                button.classList.add('enjo-hijacked-button');

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
    // ▼▼▼ ここを修正 ▼▼▼
    if (message.action === 'doPostButton') {
        const hijackedButton = document.querySelector('[data-enjo-hijacked="true"]');
        if (hijackedButton) {
            hijackedButton.innerHTML = hijackedButton.dataset.originalHTML || '投稿';
            hijackedButton.removeAttribute('data-enjo-hijacked');
            hijackedButton.removeAttribute('data-originalHTML');
            hijackedButton.classList.remove('enjo-hijacked-button'); 
            
            if (hijackedButton.enjoClickListener) {
                hijackedButton.removeEventListener('click', hijackedButton.enjoClickListener, { capture: true });
                delete hijackedButton.enjoClickListener;
            }
            isHijackingEnabled = false;
        }
        sendResponse({ status: 'completed' });
    }
    return true;
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}