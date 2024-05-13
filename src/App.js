import './App.css';
//import {useState} from 'react';
import Draw from './Draw';

function App() {

//  const [score, setScore] = useState(0);

  return <div>
            <center>
          <h1>Push-Up Counter</h1>
          <Draw />
            <p>Modified from <a href="https://www.youtube.com/watch?v=EL0eHokSSJk">here</a>.</p>
          </center>
        </div>
}

export default App;
