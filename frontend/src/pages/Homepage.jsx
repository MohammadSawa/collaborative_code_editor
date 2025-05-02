import React, { useState, useEffect } from "react";
import Navbar from "../components/navbar2/navbar";
import './Homepage.css';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism"; // You can choose a different theme
import { FcGoogle } from "react-icons/fc"; // Google icon
import { FaGithub } from "react-icons/fa"; // GitHub icon

function Homepage() {
  const [displayedCode, setDisplayedCode] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const fullCode = `int main() {
    // Welcome to CodeCollab - The Ultimate Coding Platform!

      if (you.readyToCode()) {
          cout << "Discover CodeCollab's Amazing Features:\\n";
          cout << "1. Add comments to collaborate easily.\\n";
          cout << "2. Git support with version history.\\n";
          cout << "3. Manage files and directories seamlessly.\\n";
          cout << "4. And More!!\\n";
          cout << "Join CodeCollab today and code smarter!\\n";
      } else {
          cout << "Not ready? CodeCollab will change your mind!\\n";
      }
  }`;
  const typingSpeed = 30;
  const deletingSpeed = 100;
  const pauseDuration = 500;

  useEffect(() => {
    let timeout;
    if (isTyping) {
      if (displayedCode.length < fullCode.length) {
        timeout = setTimeout(() => {
          setDisplayedCode(fullCode.slice(0, displayedCode.length + 1));
        }, typingSpeed);
      } else {
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, pauseDuration);
      }
    } else {
      if (displayedCode.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedCode(displayedCode.slice(0, -1));
        }, deletingSpeed);
      } else {
        timeout = setTimeout(() => {
          setIsTyping(true);
        }, pauseDuration);
      }
    }
    return () => clearTimeout(timeout);
  }, [displayedCode, isTyping]);
  useEffect(() => {
    fetch("/files/retrieve?type=workspaces", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("✅ Workspaces loaded:", data);
        setWorkspaces(data);
      })
      .catch((err) => {
        console.error("❌ Failed to load workspaces:", err);
      });
  }, []);
  const lineCount = displayedCode.split('\n').length;

  return (
    <>
      <Navbar />
      <div className="centered">
        <h1>The Best Collaborative Online IDE</h1>
        <p>Collaborate, code, and create with friends in real-time.</p>
        <p>Join the future of coding—sign in now!</p> 
        <div className="editor">
          <div className="editor-header">
            <div className="dots">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <span>main.cpp</span>
          </div>
          <div className="code-wrapper">
            <div className="line-numbers">
              {Array.from({ length: lineCount }, (_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <SyntaxHighlighter
              language="cpp"
              style={tomorrow}
              customStyle={{
                margin: 0,
                padding: "10px",
                background: "transparent",
                fontSize: "16px",
              }}
              showLineNumbers={false} // We're handling line numbers manually
              wrapLines={true}
            >
              {displayedCode || " "} {/* Use a space if empty to avoid rendering issues */}
            </SyntaxHighlighter>
            {/* <span className="cursor">|</span> */}
          </div>
        </div>
        <div className="login-buttons">
          <a href="http://localhost:5000/oauth2/authorization/google" className="login-button google">
            <FcGoogle className="login-icon" />
            Login with Google
          </a>
          <a href="http://localhost:5000/oauth2/authorization/github" className="login-button github">
            <FaGithub className="login-icon" />
            Login with GitHub
          </a>
        </div>
      </div>
    </>
  );
}

export default Homepage;