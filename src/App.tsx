import { Sidebar } from './components/Sidebar';
import { FileGrid } from './components/FileGrid';
import { LightBox } from './components/LightBox';
import { SettingsModal } from './components/SettingsModal';

function App() {
    return (
        <div className="flex h-screen w-screen bg-surface-950 text-white overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <FileGrid />
            </main>
            <LightBox />
            <SettingsModal />
        </div>
    );
}

export default App;
