import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import SessionDetails from './pages/SessionDetails';
import Heatmap from './pages/Heatmap';
import Replay from './pages/Replay';

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/sessions/:sessionId" element={<SessionDetails />} />
          <Route path="/replay/:sessionId" element={<Replay />} />
          <Route path="/heatmap" element={<Heatmap />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
