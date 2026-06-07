import './App.css';

import Calendar from './components/calendar/Calendar';
import AppointmentSuggestions from './components/gmail/AppointmentSuggestions';
import TaskList from './components/tasks/TaskList';
import { CalendarProvider } from './context/CalendarContext';

function App() {
  return (
    <div className="App">
      <div className="App-content">
        <div className="sidebar">
          <TaskList />
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
