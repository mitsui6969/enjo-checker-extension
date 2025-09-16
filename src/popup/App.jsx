import React, { useState, useEffect } from 'react';
import './index.css';
// import mockData from '../mocks/apiMock.json';

function App() {

    // 初期状態としてのリスクレベルとコメント
    const [riskLevel, setRiskLevel] = useState('');
    const [aiComment, setAiComment] = useState('');
    const [isPostOk, setIsPostOk] = useState(false);

    // ▼▼▼ content.jsからのメッセージを受け取るuseEffectを追加 ▼▼▼
    useEffect(() => {
        const handleMessage = (event) => {
            // event.data に content.js から送られたデータが入る
            if (event.data.type === 'ENJO_CHECK_DATA') {
                const { data } = event.data;
                setRiskLevel(data.risk_level);
                setAiComment(data.ai_comment);
                setIsPostOk(data.risk_level === 'low'); // 低リスクなら最初からOK状態
            }
        };

        window.addEventListener('message', handleMessage);

        // コンポーネントが不要になったらリスナーを削除
        return () => {
            window.removeEventListener('message', handleMessage);
        };
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

export default App;
