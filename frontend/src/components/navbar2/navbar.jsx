import React from "react";
import './navbar.css';  
import icon from "../../assets/test.png";

function Navbar() {
  return (
    <header className="header">
      <div className="logo-container">
        <img src={icon} alt="CodeCollab Icon" className="logo-icon" />
        <a href="/" className="logo">CodeCollab</a>
      </div>
      <nav className="navbar">
        <a href="https://www.linkedin.com/in/mohammad-sawalha-409b22263/" className="nav-link">Contact</a>
      </nav>  
    </header>
  );
}

export default Navbar;