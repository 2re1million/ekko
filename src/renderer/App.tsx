import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { RecordingPage } from './pages/RecordingPage';
import { MeetingDetail } from './pages/MeetingDetail';
import { Settings } from './pages/Settings';

const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/record" element={<RecordingPage />} />
        <Route path="/meeting/:id" element={<MeetingDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
};

export default App;