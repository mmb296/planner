import './App.css';

import Calendar from './components/calendar/Calendar';
import TaskList from './components/tasks/TaskList';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </header>

      <div className="main-content">
        <TaskList />
        <Calendar />
      </div>
    </div>
  );
}

export default App;
