// バックグラウンド処理(API通信など)をここに書く

// const API_URL = 'https://hack-u-backend.onrender.com/check/post';
const API_URL = 'http://127.0.0.1:8000/check/post';

/* global chrome */

// Helper function to open the popup window
function openPopupWindow() {
    chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 330,
        height: 430,
    });
}

chrome.runtime.onMessage.addListener((message) => {
    // content.jsからのAPIリクエストの場合
    if (message.action === 'sendAPIRequest') {
        console.log('content.jsから sendAPIRequest メッセージを受信しました。');
        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "post": message.text }), 
        })
        .then(response => response.ok ? response.json() : response.text().then(text => Promise.reject(new Error(text))))
        .then(data => {
            // APIの結果をストレージに保存
            chrome.storage.local.set({ apiResult: { success: true, data: data } }, () => {
                // 保存が完了したらポップアップを開く
                openPopupWindow();
            });

            // APIレスポンスのrisk_levelが'low'の場合、content.jsにメッセージを送信
            if (data.risk_level === 'low') {
                console.log('リスクレベルがlowです。content.jsにdoPostButtonメッセージを送信します。');
                
                // 現在アクティブなタブにメッセージを送信
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs && tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, { action: 'doPostButton' }, () => {
                            if (chrome.runtime.lastError) {
                                console.error('content.jsへのdoPostButtonメッセージ送信に失敗:', chrome.runtime.lastError.message);
                            }
                        });
                    }
                });
            }
        })
        .catch(error => {
            // エラーをストレージに保存
            chrome.storage.local.set({ apiResult: { success: false, error: error.message } }, () => {
                // 保存が完了したらポップアップを開く
                openPopupWindow();
            });
        });
        
        // メッセージが非同期で処理されることを示す（レスポンスは返さない）
        return true; 
    
    // ポップアップからのボタン復元リクエストの場合
    } else if (message.action === 'doPostButton' || message.action === 'returnEnjoButton') {
        console.log('ポップアップから doPostButton メッセージを受信。content.jsに転送します。');
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message, () => {
                    if (chrome.runtime.lastError) {
                        console.error('content.jsへのメッセージ送信に失敗:', chrome.runtime.lastError.message);
                    }
                });
            }
        });
        return true;
    }
});

// // storageの内容が変更されたときに発火するリスナー
// chrome.storage.onChanged.addListener(async (changes, namespace) => {
//     // 'local' ストレージの 'apiResult' キーに変更があった場合のみ処理
//     if (namespace === 'local' && 'apiResult' in changes) {
//         console.log('apiResultが変更されたのを検知しました。');

//         // 1. 保存されているウィンドウIDを取得
//         const { popupWindowId } = await chrome.storage.local.get('popupWindowId');

//         if (popupWindowId) {
//             try {
//                 // 2. ウィンドウがまだ存在するか確認
//                 const existingWindow = await chrome.windows.get(popupWindowId, { populate: true });

//                 // 3. 存在すれば、最前面に表示し、内容の更新を依頼
//                 console.log(`既存のポップアップ (ID: ${popupWindowId}) を再利用します。`);
//                 await chrome.windows.update(popupWindowId, { focused: true });

//                 // ポップアップ内のReactアプリに内容更新のメッセージを送信
//                 const popupTab = existingWindow.tabs[0];
//                 if (popupTab) {
//                     chrome.tabs.sendMessage(popupTab.id, { action: 'updateContent' });
//                 }
//                 return; // 処理完了

//             } catch (error) {
//                 // ウィンドウが存在しなかった (ユーザーが閉じた) 場合
//                 console.log(`ポップアップ (ID: ${popupWindowId}) は既に閉じられていました。新しいウィンドウを作成します。:`, error);
//                 // 古いIDを削除
//                 await chrome.storage.local.remove('popupWindowId');
//             }
//         }

//         // 4. 既存のウィンドウがなければ、新しいウィンドウを作成
//         const newWindow = await chrome.windows.create({
//             url: chrome.runtime.getURL('popup.html'),
//             type: 'popup',
//             width: 400,
//             height: 300,
//         });

//         // 5. 新しいウィンドウのIDを保存
//         await chrome.storage.local.set({ popupWindowId: newWindow.id });
//     }
// });
