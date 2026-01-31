import { Sidebar } from './components/Sidebar';
import { FileGrid } from './components/FileGrid';

function App() {
    return (
        <div className="flex h-screen w-screen bg-surface-950 text-white overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <FileGrid />
            </main>
        </div>
    );
}

export default App;
