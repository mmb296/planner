import React, { useEffect } from 'react';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import './App.css';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

function App() {
  const clientId = process.env.REACT_APP_CLIENT_ID as string;

  useEffect(() => {
    (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES
    });
  }, [clientId]);

  return (
    <div className="App">
      <header className="App-header">
        <CalendarMonth className="App-logo" style={{ fontSize: 200 }} />
      </header>
    </div>
  );
}

export default App;
