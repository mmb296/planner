import './App.css';

import Calendar from './components/calendar/Calendar';
import TaskList from './components/tasks/TaskList';
import CountdownBanner from './components/CountdownBanner';

function App() {
  return (
    <div className="App">
      <CountdownBanner />
      <div className="App-content">
        <TaskList />
        <Calendar />
      </div>
    </div>
  );
}

export default App;
