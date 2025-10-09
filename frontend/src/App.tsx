import './App.css';

import Calendar from './components/calendar/Calendar';
import TaskList from './components/tasks/TaskList';
import { TaskProvider } from './contexts/TaskContext';

function App() {
  return (
    <TaskProvider>
      <div className="App">
        <TaskList />
        <Calendar />
      </div>
    </TaskProvider>
  );
}

export default App;
