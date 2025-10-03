import { Routes, Route } from "react-router-dom";
import Nav from "./components/NavBar";
import Home from "./pages/Home";
import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app-root">
      <Nav />
      <main>
        <Routes>
          <Route
            path="/"
            element={<Home count={count} setCount={setCount} />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
