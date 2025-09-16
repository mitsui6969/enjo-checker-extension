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

    // APIリクエストをバックグラウンドスクリプトに送信する関数。参考までに。
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
};

    return (
        <div className={`container ${riskLevel}`}>
            <div className="emoji">
                <h1>{emoji}</h1> {/* 絵文字の表示 */}
            </div>
            <div className="text">
                <h2>{riskText}</h2> {/* リスクレベルに応じたテキスト */}
                <p className="message">{aiComment}</p> {/* メッセージ表示 */}
            </div>
            <div className="actions">
                <button>このままポストする</button>
                <button className="secondary">炎上チェックに戻る</button>
            </div>

        </div>
    );
}

export default App;
