import './App.css';

import Calendar from './components/calendar/Calendar';
import TaskList from './components/tasks/TaskList';

function App() {
  return (
    <div className="App">
      <TaskList />
      <Calendar />
    </div>
  );
}

export default App;
