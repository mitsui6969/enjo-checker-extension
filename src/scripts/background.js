// バックグラウンド処理(API通信など)をここに書く

// const API_URL = 'https://hack-u-backend.onrender.com/check/post';
const API_URL = 'http://127.0.0.1:8000/check/post';

/* global chrome */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 受け取ったメッセージの action が 'sendAPIRequest' であることを確認
    // ここ変える
    if (message.action === 'sendAPIRequest') {
        
        // ポップアップの代わりにAPIリクエストを送信
        fetch(API_URL, {
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
            // ★ 成功データをstorageに保存
            chrome.storage.local.set({ apiResult: { success: true, data: data } }, () => {
                console.log('API結果を保存しました:', data);
                // content.jsに応答を返す
                sendResponse({ success: true, data: data });
            });
        })
        .catch(error => {
            console.error('APIリクエスト中にエラーが発生しました(background.js):', error);
            sendResponse({ success: false, error: error.message });
        });

        return true; 
    }
});

// storageの内容が変更されたときに発火するリスナー
chrome.storage.onChanged.addListener((changes) => {
    // 'apiResult' というキーに変更があった場合のみ処理
    if ('apiResult' in changes) {
        console.log('apiResultが変更されたのを検知しました。ポップアップを表示します。');
        
        // 既存のポップアップがあれば、それを閉じてから新しいものを開く（任意）
        // findAndClosePopup(); // 必要であれば実装

        // 新しいウィンドウをポップアップとして作成
        chrome.windows.create({
            url: chrome.runtime.getURL('popup.html'), // 表示するReactアプリのURL
            type: 'popup',
            width: 500, // ポップアップの幅
            height: 380, // ポップアップの高さ
        });
    }
});
