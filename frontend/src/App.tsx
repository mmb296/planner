import './App.css';

import Calendar from './components/calendar/Calendar';
import CountdownBanner from './components/CountdownBanner';
import AppointmentSuggestions from './components/gmail/AppointmentSuggestions';
import { CalendarProvider } from './context/CalendarContext';

function App() {
  return (
    <div className="App">
      <CountdownBanner />
      <div className="App-content">
        <div className="sidebar">
          <AppointmentSuggestions />
        </div>
        <CalendarProvider>
          <Calendar />
        </CalendarProvider>
      </div>
    </div>
  );
}

export default App;
