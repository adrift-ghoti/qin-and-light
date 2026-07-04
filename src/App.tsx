import { TransportBar } from './components/TransportBar';
import { StatusBar } from './components/StatusBar';
import { PositionStrip } from './components/PositionStrip';
import { GuqinDisplay } from './components/GuqinDisplay';
import { Timeline } from './components/Timeline';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

export default function App() {
  useGlobalShortcuts();

  return (
    <div>
      <h1>古琴聲光秀 編輯器</h1>
      <TransportBar />
      <StatusBar />
      <PositionStrip />
      <GuqinDisplay />
      <Timeline />
    </div>
  );
}
