import React, { useState, useEffect } from 'react';
import './index.css';

function App() {
    // 初期状態としてのリスクレベルとコメント
    const [riskLevel, setRiskLevel] = useState('');
    const [aiComment, setAiComment] = useState('');

    // モックデータ（通常はAPIから取得）
    const mockData = React.useMemo(() => ({
        risk_level: 'middle',  // high, middle, low
        ai_comment: '多分炎上しないよ！',
    }), []);
    // モックデータを受け取って状態を更新
    useEffect(() => {
        setRiskLevel(mockData.risk_level);
        setAiComment(mockData.ai_comment);
    }, [mockData]);

const riskInfoMap = {
    high: { emoji: '🥵', text: '炎上確率：高' },
    middle: { emoji: '🤔', text: '炎上確率：中' },
    low: { emoji: '😊', text: '炎上確率：低' },
};

const { emoji, text: riskText } = riskInfoMap[riskLevel] || {};

    return (
        <div className={`container ${riskLevel}`}>
            <div className="emoji">
                <h1>{emoji}</h1> {/* 絵文字の表示 */}
            </div>
            <div className="text">
                <h2>{riskText}</h2> {/* リスクレベルに応じたテキスト */}
                <p className="message">{aiComment}</p> {/* メッセージ表示 */}
            </div>
            <button>このままポストする</button> {/* ボタン */}
        </div>
    );
}

export default App;
