import './App.css';

import Calendar from './components/calendar/Calendar';
import CountdownBanner from './components/CountdownBanner';
import TaskList from './components/tasks/TaskList';
import { CalendarProvider } from './context/CalendarContext';

function App() {
  return (
    <div className="App">
      <CountdownBanner />
      <div className="App-content">
        <TaskList />
        <CalendarProvider>
          <Calendar />
        </CalendarProvider>
      </div>
    </div>
  );
}

export default App;
