import React from 'react';

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
