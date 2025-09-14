// バックグラウンド処理(API通信など)をここに書く

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 受け取ったメッセージの action が 'sendAPIRequest' であることを確認
    // ここ変える
    if (message.action === 'sendAPIRequest') {
        
        // ポップアップの代わりにAPIリクエストを送信
        fetch('https://hack-u-backend.onrender.com/check/post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ "post": message.text }), 
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { 
                    throw new Error(text || `HTTP error! status: ${response.status}`) 
                });
            }
            return response.json();
        })
        .then(data => {
            sendResponse({ success: true, data: data });
        })
        .catch(error => {
            sendResponse({ success: false, error: error.message });
        });

        return true; 
    }
});
