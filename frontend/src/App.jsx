import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
import EditorPage from "./pages/EditorPage";
import UserWorkspaces from "./pages/UserWorkspaces";
function App() {
  return (
    <Router>
        <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/workspaces" element={<UserWorkspaces/>}/>
            <Route path="/editor" element={<EditorPage />}/>
        </Routes>
    </Router>
  );
}

export default App;
