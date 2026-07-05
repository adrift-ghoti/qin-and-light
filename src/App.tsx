import './styles.css';
import { TransportBar } from './components/TransportBar';
import { StatusBar } from './components/StatusBar';
import { PositionStrip } from './components/PositionStrip';
import { GuqinDisplay } from './components/GuqinDisplay';
import { Timeline } from './components/Timeline';
import { ExportPanel } from './components/ExportPanel';
import { AdsrPanel } from './components/AdsrPanel';
import { SlidePathPanel } from './components/SlidePathPanel';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

export default function App() {
  useGlobalShortcuts();

  return (
    <div className="app">
      <div className="top-bar">
        <h1 className="top-bar-title">古琴聲光秀 編輯器</h1>
        <TransportBar />
        <StatusBar />
        <ExportPanel />
      </div>
      <div className="main-panels">
        <GuqinDisplay />
        <Timeline />
      </div>
      <PositionStrip />
      <div className="workspace-drawer">
        <AdsrPanel />
        <SlidePathPanel />
      </div>
    </div>
  );
}
