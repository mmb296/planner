import React, { useEffect, useState } from 'react';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import './App.css';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

function App() {
  const clientId = process.env.REACT_APP_CLIENT_ID as string;

  const [tokenClient, setTokenClient] = useState<any>(null);
  const [events, setEvents] = useState<string>('No events loaded.');

  useEffect(() => {
    const tokenClientInstance = (
      window as any
    ).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error !== undefined) {
          setEvents('Error during authentication.');
          return;
        }
      }
    });
    setTokenClient(tokenClientInstance);
  }, [clientId]);

  const handleAuthClick = () => {
    tokenClient.requestAccessToken();
  };

  return (
    <div className="App">
      <header className="App-header">
        <CalendarMonth className="App-logo" style={{ fontSize: 200 }} />
        {tokenClient && <button onClick={handleAuthClick}>Authorize</button>}
      </header>
    </div>
  );
}

export default App;
