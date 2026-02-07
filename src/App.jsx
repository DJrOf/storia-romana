import React from 'react';
import Timeline from './components/Timeline';
import { historicalEvents } from './data/events';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="app-header">
        <h1>Storia di Roma</h1>
        <p className="subtitle">Dalla fondazione alla caduta dell'Impero d'Occidente</p>
      </header>
      <Timeline events={historicalEvents} />
    </div>
  );
}

export default App;

