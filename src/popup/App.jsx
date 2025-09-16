import React, { useState, useEffect } from 'react';
import './index.css';
import mockData from '../mocks/apiMock.json';

function App() {

    // 初期状態としてのリスクレベルとコメント
    const [riskLevel, setRiskLevel] = useState('');
    const [aiComment, setAiComment] = useState('');
    const [isPostOk, setIsPostOk] = useState(false);

    // モックデータを受け取って状態を更新
    useEffect(() => {
        setRiskLevel(mockData.risk_level);
        setAiComment(mockData.ai_comment);
        setIsPostOk(riskInfoMap[mockData.risk_level]?.isPostOk ?? false);
    }, []);

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
                        <button className="secondary" onClick={ ()=>handleReturnButtonClick() }>炎上チェックに戻る🔥</button>
                    ):(
                        <button className='do-post' onClick={ ()=>handleDoPostButtonClick() }>このままポストする</button>
                    )
                }
            </div>

        </div>
    );
}

export default App;
