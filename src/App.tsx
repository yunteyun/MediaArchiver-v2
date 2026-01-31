import { useState } from 'react';

function App() {
    const [count, setCount] = useState(0);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-surface-950 text-white">
            <div className="text-center space-y-6">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    MediaArchiver v2
                </h1>
                <p className="text-surface-400">
                    プロジェクト基盤の構築が完了しました
                </p>

                <div className="mt-8 p-6 bg-surface-900/50 rounded-xl border border-surface-800">
                    <button
                        onClick={() => setCount((c) => c + 1)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
                    >
                        カウント: {count}
                    </button>
                </div>

                <div className="mt-8 text-sm text-surface-500 space-y-1">
                    <p>✅ Vite + React + TypeScript</p>
                    <p>✅ Tailwind CSS</p>
                    <p>✅ Electron 統合準備</p>
                    <p>⏳ 次: Zustand ストア設計</p>
                </div>
            </div>
        </div>
    );
}

export default App;
