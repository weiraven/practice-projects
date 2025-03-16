import './App.css'
import { useState, useEffect, useRef } from 'react'

// Exercise categories:
// String Manipulation, Bit Manipulation, Arrays & Lists, Hashing & Dictionaries, Sorting & Searching, Stacks, Queues, Linked Lists, Binary Trees, Two Pointer

function App() {
  const [exercises, setExercises] = useState([]);
  const [drawnExercises, setDrawnExercises] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const pageBottomRef = useRef(null);

  useEffect(() => {
    fetch('/exercises.json')
      .then(res => res.json())
      .then(data => setExercises(data));
  }, []);

  const getRandomExercise = () => {
    if (exercises.length === 0) return;

    setDrawnExercises((prevExercises) => {
      const filteredExercises = selectedCategory === "All Categories" ?
        exercises : exercises.filter(exercise => exercise.category === selectedCategory);
      
      if (filteredExercises.length === 0) {
        alert("No exercises available for: " + selectedCategory);
        return prevExercises;
      }

      const randomIndex = Math.floor(Math.random() * filteredExercises.length);
      const newExercise = filteredExercises[randomIndex];

      return [...prevExercises, newExercise];
    });
  };

  const categories = ["All Categories", ...new Set(exercises.map(exercise => exercise.category))];

  const removeExercise = (indexToRemove) => {
    setDrawnExercises(prevExercises => 
      prevExercises.filter((_, index) => index !== indexToRemove)
    );
  };

  useEffect(() => {
    pageBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [drawnExercises]);

  return (
    <div className="App">

      <div className="header">
        <h1>Code Exercise Machine</h1>
        <h2>Crank the gachapon machine below for a random coding workout!</h2>
      </div>
    
      <div className="gachapon-container">
        <select className="category-dropdown" 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((category, index) => (
            <option key={index} value={category}>
              {category}
            </option>
          ))}
        </select>
        <img src="images/gachapon_machine.gif" alt="Gachapon Machine"
          onClick={getRandomExercise}
        />
      </div> 

      <div className="exercises-container">
        {drawnExercises.map((exercise, index) => (
          <div className="exercise-card" key={index}>
            <div className="exercise-content">
              <h3>{exercise.category}</h3>
              <p>{exercise.prompt}</p>
            </div>
            <button className="delete-button" onClick={() => removeExercise(index)}>
              🗑
            </button>
          </div>
        ))}

      </div>

      {drawnExercises.length > 0 && (
        <div className="button-container">
          <button className="navbutton" onClick={() => setDrawnExercises([])}>Restart</button>
        </div>
      )} 

      <div ref={pageBottomRef} />
    </div>
  );
}

export default App
