/* global chrome */
import React, { useState, useEffect } from 'react';
import './index.css';
// import mockData from '../mocks/apiMock.json';

function Popup() {

    // 初期状態としてのリスクレベルとコメント
    const [riskLevel, setRiskLevel] = useState('');
    const [aiComment, setAiComment] = useState('no data');
    const [isPostOk, setIsPostOk] = useState(false);

    // storageからデータを取得してstateを更新する関数
    const fetchDataFromStorage = () => {
        chrome.storage.local.get(['apiResult'], (result) => {
            const storedResult = result.apiResult;
            if (!storedResult) {
                setAiComment('まだ解析結果がありません。');
                return;
            }
            if (storedResult.success) {
                const data = storedResult.data;
                setRiskLevel(data.risk_level);
                setAiComment(data.ai_comment);
                setIsPostOk(riskInfoMap[data.risk_level]?.isPostOk ?? false);
            } else {
                setAiComment('エラー: 解析に失敗しました。');
                console.error('API Error:', storedResult.error);
            }
        });
    };

    useEffect(() => {
        // 1. ポップアップが開かれた時に一度だけデータを取得
        fetchDataFromStorage();

        // 2. background.jsからのメッセージを監視するリスナー
        const messageListener = (message) => {
            // 'updateContent' メッセージを受け取ったら、再度storageからデータを取得
            if (message.action === 'updateContent') {
                console.log('内容更新のメッセージを受信しました。');
                fetchDataFromStorage();
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);

        // コンポーネントが閉じられるときにリスナーを解除
        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []); 

    const riskInfoMap = {
        high: { emoji: '🥵', text: '高', isPostOk: false },
        middle: { emoji: '🤔', text: '中', isPostOk: false },
        low: { emoji: '😊', text: '低', isPostOk: true },
    };

    const { emoji, text: riskText } = riskInfoMap[riskLevel] || {};

    const handleReturnEnjoButtonClick = () => {
        console.log('元の投稿ボタンに戻すメッセージを送信します。');
        chrome.runtime.sendMessage({
            action: 'returnEnjoButton' // background.js への指示
        });
        setIsPostOk(false);
    }

    const handleDoPostButtonClick = () => {
        console.log('元の投稿ボタンに戻すメッセージを送信します。');
        chrome.runtime.sendMessage({
            action: 'doPostButton' // background.js への指示
        });
        setIsPostOk(true);
    }

    return (
        <div className="container">
            <div className="emoji">
                <div>{emoji}</div>
            </div>

            <div className="text">
                <h2>炎上確率：{riskText}</h2> 
                <p className="message">{aiComment}</p>
            </div>

            <div className="actions">
                { isPostOk ? (
                        <button className="secondary" onClick={handleReturnEnjoButtonClick}>炎上チェックに戻る🔥</button>
                    ):(
                        <button className='do-post' onClick={handleDoPostButtonClick}>このままポストする</button>
                    )
                }
            </div>

        </div>
    );
}

export default Popup;
