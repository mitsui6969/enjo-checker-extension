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
// ▼▼▼ storageの変更リスナーを全面的に書き換え ▼▼▼
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    // 'local' ストレージの 'apiResult' キーに変更があった場合のみ処理
    if (namespace === 'local' && 'apiResult' in changes) {
        console.log('apiResultが変更されたのを検知しました。');

        // 1. 保存されているウィンドウIDを取得
        const { popupWindowId } = await chrome.storage.local.get('popupWindowId');

        if (popupWindowId) {
            try {
                // 2. ウィンドウがまだ存在するか確認
                const existingWindow = await chrome.windows.get(popupWindowId, { populate: true });

                // 3. 存在すれば、最前面に表示し、内容の更新を依頼
                console.log(`既存のポップアップ (ID: ${popupWindowId}) を再利用します。`);
                await chrome.windows.update(popupWindowId, { focused: true });

                // ポップアップ内のReactアプリに内容更新のメッセージを送信
                const popupTab = existingWindow.tabs[0];
                if (popupTab) {
                    chrome.tabs.sendMessage(popupTab.id, { action: 'updateContent' });
                }
                return; // 処理完了

            } catch (error) {
                // ウィンドウが存在しなかった (ユーザーが閉じた) 場合
                console.log(`ポップアップ (ID: ${popupWindowId}) は既に閉じられていました。新しいウィンドウを作成します。:`, error);
                // 古いIDを削除
                await chrome.storage.local.remove('popupWindowId');
            }
        }

        // 4. 既存のウィンドウがなければ、新しいウィンドウを作成
        const newWindow = await chrome.windows.create({
            url: chrome.runtime.getURL('popup.html'),
            type: 'popup',
            width: 400,
            height: 300,
        });

        // 5. 新しいウィンドウのIDを保存
        await chrome.storage.local.set({ popupWindowId: newWindow.id });
    }
});
