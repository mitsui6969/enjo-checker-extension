import React from 'react';

/**
 * React functional component rendering the "炎上チェッカー" UI and a test button.
 *
 * The component includes an internal async helper that sends a message to the extension
 * background script via chrome.runtime.sendMessage with action 'sendAPIRequest' and a
 * provided text payload, then logs the background response or error to the console.
 *
 * Clicking the "apiテスト" button triggers the helper with the fixed string "送信テストバカヤロー".
 *
 * @returns {JSX.Element} The component UI.
 */
function App() {
    
    const sendAPIRequest = async (text) => {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'sendAPIRequest',
                text: text
            });

            console.log('Response from background:', response);

            if (response && response.success) {
                console.log('API Response:', response.data);
            } else {
                console.error('Error from background:', response.error);
            }

        } catch (error) {
            console.error('Error sending message to background:', error);
        }
}

    return (
        <div>
            <h1>炎上チェッカー🔥🔎</h1>
            <p>
                Twitter/Xの投稿ボタンが「炎上チェック」ボタンに変わります。
            </p>

            <button onClick={() => sendAPIRequest("送信テストバカヤロー")}>
                apiテスト
            </button>
        </div>
    );
}

export default App;
