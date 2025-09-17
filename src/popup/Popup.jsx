/* global chrome */
import React, { useState, useEffect } from 'react';
import './index.css';
// import mockData from '../mocks/apiMock.json';

function Popup() {

    // 初期状態としてのリスクレベルとコメント
    const [riskLevel, setRiskLevel] = useState('');
    const [aiComment, setAiComment] = useState('no data');
    const [isPostOk, setIsPostOk] = useState(false);

    useEffect(() => {
        // chrome.storageから保存されたAPI結果を取得
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
                setIsPostOk(data.risk_level === 'low');
            } else {
                setRiskLevel('high'); // エラー時は高リスクとして表示
                setAiComment(`エラー: 解析に失敗しました。\n${storedResult.error}`);
            }
        });
    }, []); // 最初の一回だけ実行

    const riskInfoMap = {
        high: { emoji: '🥵', text: '高', isPostOk: false },
        middle: { emoji: '🤔', text: '中', isPostOk: false },
        low: { emoji: '😊', text: '低', isPostOk: true },
    };

    const { emoji, text: riskText } = riskInfoMap[riskLevel] || {};

    const handleReturnButtonClick = () => {
        setIsPostOk(false);
    }

    const handleDoPostButtonClick = () => {
        setIsPostOk(true);
    }

    return (
        <div className={`container ${riskLevel}`}>
            <div className="emoji">
                <h1>{emoji}</h1>
            </div>

            <div className="text">
                <h2>炎上確率：{riskText}</h2> 
                <p className="message">{aiComment}</p>
            </div>

            <div className="actions">
                { isPostOk ? (
                        <button className="secondary" onClick={handleReturnButtonClick}>炎上チェックに戻る🔥</button>
                    ):(
                        <button className='do-post' onClick={handleDoPostButtonClick}>このままポストする</button>
                    )
                }
            </div>

        </div>
    );
}

export default Popup;
