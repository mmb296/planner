import './App.css';

import Calendar from './components/calendar/Calendar';
import TaskList from './components/tasks/TaskList';

function App() {
  return (
    <div className="App">
      <TaskList />

      <div className="calendar">
        <header>
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </header>
        <Calendar />
      </div>
    </div>
  );
}

export default App;
