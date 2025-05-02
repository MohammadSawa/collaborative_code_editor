import { useRef, useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import styles from "../pages/editorpage.module.css";
import Sidebar from "../components/editornavigationbar/SideBar";
import { RxHamburgerMenu } from "react-icons/rx";
import { VscRunAll } from "react-icons/vsc";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { IoGitCommit } from "react-icons/io5";
import { TiUserAdd } from "react-icons/ti";
import { RiHistoryFill } from "react-icons/ri";
import { FaClone } from "react-icons/fa6";
import { IoIosGitNetwork } from "react-icons/io";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function EditorPage() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("java");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [commitHistory, setCommitHistory] = useState([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [assigning, setAssigning] = useState(false);
  const [currentSelectedPath, setCurrentSelectedPath] = useState("");
  const [fileOpen, setFileOpen] = useState(false);
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const inputLineCounterRef = useRef(null);
  const inputTextareaRef = useRef(null);
  const outputLineCounterRef = useRef(null);
  const outputPreRef = useRef(null);
  const userRole = localStorage.getItem("userRole");
  const workspaceRootPath = localStorage.getItem("activeWorkspacePath");
  const stompClientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [comments, setComments] = useState([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [activeLine, setActiveLine] = useState(null);
  const [commentText, setCommentText] = useState("");
  const monacoRef = useRef(null);
  const lastErrorShownRef = useRef(0);

  const headerCell = {
    borderBottom: "1px solid #444",
    padding: "10px",
    textAlign: "left",
  };

  const rowCell = {
    borderBottom: "1px solid #333",
    padding: "10px",
    wordWrap: "break-word",
    whiteSpace: "normal",
    maxWidth: "200px",
  };

  const emptyEditorStyles = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    color: "#6e7681",
    backgroundColor: "#1e1e1e",
    fontFamily: "Fira Code, monospace",
    textAlign: "center",
  };

  const handleFork = async () => {
    const newWorkspaceName = workspaceRootPath.split("\\").pop() + "_forked";
    const payload = {
      sourcePath: workspaceRootPath,
      newWorkspaceName: newWorkspaceName,
    };
    const res = await fetch("http://localhost:5000/files/fork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (res.status === 201) {
      toast.success("Workspace forked!");
    } else {
      toast.error("Fork failed");
    }
  };

  const handleClone = async () => {
    try {
      const res = await fetch("http://localhost:5000/files/workspace/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: workspaceRootPath }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "workspace.zip";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Clone failed", error);
    }
  };

  const handleRevert = async (commit) => {
    try {
      const response = await fetch("http://localhost:5000/history/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: commit.name,
          fileName: commit.fileName,
          timestamp: commit.commitDate,
        }),
      });
      if (!response.ok) throw new Error("Revert failed");
      const data = await response.json();
      editorRef.current.setValue(data.output);
      setFileOpen(true);

      setCode(data.output);
    } catch (err) {
      console.error("Error while reverting:", err);
    }
  };

  const handleShowHistory = async () => {
    const resourcePath = localStorage.getItem("activeWorkspacePath");
    try {
      const res = await fetch("http://localhost:5000/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: resourcePath }),
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Failed to fetch history");
        return;
      }
      const data = await res.json();
      const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setCommitHistory(sorted);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error("History fetch error: " + error.message);
    }
  };

  const handleRunCode = async () => {
    if (!fileOpen) {
      toast.warning("Please open a file first");
      return;
    }
    setOutput("Running code...");
    try {
      const fileName = currentSelectedPath.split("\\").pop();
      const response = await fetch("http://localhost:5000/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: fileName,
          language: currentLanguage,
          code: code,
          input: input,
        }),
        credentials: "include",
      });
      if (response.ok) {
        const result = await response.json();
        setOutput(result.output || "No output returned");
      } else {
        setOutput("Error executing code.");
      }
    } catch (error) {
      console.error("Error executing code:", error);
      setOutput("Error executing code.");
    }
  };

  const handleCommit = async () => {
    if (!fileOpen) {
      toast.warning("Please open a file first");
      return;
    }
    if (userRole === "VIEWER") {
      toast.error("You are not allowed to commit.");
      return;
    }
    const parts = currentSelectedPath.split("\\");
    const fileName = parts.pop();
    const projectName = parts.pop();
    const resourcePath = localStorage.getItem("activeWorkspacePath");
    await fetch("http://localhost:5000/history/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        fileName: fileName,
        code: code,
        message: commitMessage,
        projectName: projectName,
        path: resourcePath,
      }),
    }).then((res) => {
      if (res.ok) {
        toast.success("Commit saved successfully!");
        setShowCommitModal(false);
        setCommitMessage("");
      } else {
        toast.error("Commit failed. Please try again.");
      }
    });
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco; // Store monaco object
    monaco.editor.defineTheme("custom-dark-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1e1e1e",
        "editorLineNumber.foreground": "#858585",
        "editorGutter.background": "#2a2d2e",
        "editor.lineHighlightBackground": "#282828",
      },
    });
    monaco.editor.setTheme("custom-dark-theme");
    editor.layout();
  
    // Handle right-click on line numbers to add/delete comments
    // editor.onMouseDown((e) => {
    //   if (
    //     e.target?.position &&
    //     e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS &&
    //     e.event.rightButton // Right-click only
    //   ) {
    //     e.event.preventDefault(); // Prevent default context menu
    //     const lineNumber = e.target.position.lineNumber;
    //     const hasComment = comments.find((c) => c.line === lineNumber);
  
    //     if (hasComment) {
    //       // If comment exists, prompt to delete
    //       if (window.confirm(`Delete comment on line ${lineNumber}?`)) {
    //         handleDeleteComment(hasComment.id);
    //       }
    //     } else {
    //       // If no comment, open modal to add one
    //       setActiveLine(lineNumber);
    //       setCommentText("");
    //       setShowCommentModal(true);
    //     }
    //   }
    // });
  
    // Update decorations on content change
    editor.onDidChangeModelContent(() => {
      updateCommentDecorations();
    });
  };
  // const updateCommentDecorations = () => {
  //   if (!editorRef.current || !monacoRef.current) {
  //     console.warn("Editor or Monaco not initialized, skipping decorations");
  //     return;
  //   }
  //   const monaco = editorRef.current.getModel();
  //   const decorations = comments.map((comment) => ({
  //     range: new monacoRef.current.Range(comment.line, 1, comment.line, 1),
  //     options: {
  //       isWholeLine: true,
  //       className: "commented-line",
  //       hoverMessage: { value: `💬 ${comment.text}` },
  //     },
  //   }));
  //   editorRef.current.deltaDecorations(
  //     comments.map((c) => c.decorationId),
  //     decorations
  //   );
  //   // Update comment line numbers if lines were added/deleted
  //   setComments((prev) =>
  //     prev.map((comment) => {
  //       const newLine = monaco.getPositionAt(
  //         monaco.getOffsetAt(new monacoRef.current.Position(comment.line, 1))
  //       ).lineNumber;
  //       return { ...comment, line: newLine };
  //     })
  //   );
  // };

  // const handleSaveComment = async (lineNumber) => {
  //   try {
  //     const response = await fetch("http://localhost:5000/comments/save", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       credentials: "include",
  //       body: JSON.stringify({
  //         filePath: currentSelectedPath,
  //         line: lineNumber,
  //         text: commentText,
  //       }),
  //     });
  //     console.log("Save comment response:", response);
  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       throw new Error(`Failed to save comment: ${response.status} ${errorText}`);
  //     }
  //     const data = await response.json();
  //     console.log("Parsed response data:", data);
  //     if (!data.id) {
  //       throw new Error("Invalid response: Missing comment ID");
  //     }
  
  //     if (!editorRef.current || !monacoRef.current) {
  //       throw new Error("Editor or Monaco not initialized");
  //     }
  //     const decorationId = editorRef.current.deltaDecorations([], [
  //       {
  //         range: new monacoRef.current.Range(lineNumber, 1, lineNumber, 1),
  //         options: {
  //           isWholeLine: true,
  //           className: "commented-line",
  //           hoverMessage: { value: `💬 ${commentText}` },
  //         },
  //       },
  //     ])[0];
  //     console.log("Decoration ID:", decorationId);
  //     setComments((prev) => {
  //       const newComments = [
  //         ...prev,
  //         { id: data.id, line: lineNumber, decorationId, text: commentText },
  //       ];
  //       console.log("New comments:", newComments);
  //       return newComments;
  //     });
  //     setShowCommentModal(false);
  //     toast.success("Comment saved!");
  //   } catch (error) {
  //     console.error("Error saving comment:", error);
  //     toast.error("Failed to save comment: " + error.message);
  //   }
  // };
  // const handleDeleteComment = async (commentId) => {
  //   try {
  //     const response = await fetch("http://localhost:5000/comments/delete", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       credentials: "include",
  //       body: JSON.stringify({ id: commentId }),
  //     });
  //     if (!response.ok) throw new Error("Failed to delete comment");
  //     setComments((prev) =>
  //       prev.filter((comment) => comment.id !== commentId)
  //     );
  //     editorRef.current.deltaDecorations([commentId], []);
  //     toast.success("Comment deleted!");
  //   } catch (error) {
  //     toast.error("Failed to delete comment");
  //   }
  // };

  useEffect(() => {
    const socket = new SockJS("http://localhost:5000/ws");
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => console.log("Connected to WebSocket"),
    });
    client.activate();
    stompClientRef.current = client;
    return () => {
      client.deactivate();
    };
  }, []);

  const subscribeToFile = (filePath) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) return;
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    const topic = `/topic/${filePath}`;
    subscriptionRef.current = stompClientRef.current.subscribe(topic, (message) => {
      const payload = JSON.parse(message.body);
      if (payload && payload.content) {
        setCode(payload.content);
      }
    });
  };

  const sendMessage = (content) => {
    if (!fileOpen) return;
    if (userRole === "VIEWER") {
      const now = Date.now();
      if (now - lastErrorShownRef.current > 5000) {
        toast.error("You do not have permission to edit this file.");
        lastErrorShownRef.current = now;
      }
      return;
    }
    const destination = `/app/communication`;
    stompClientRef.current?.publish({
      destination,
      body: JSON.stringify({
        content,
        filePath: currentSelectedPath,
      }),
      credentials: "include",
    });
  };

  const handleSetRole = async () => {
    if (userRole === "VIEWER" || userRole === "EDITOR") {
      toast.error("You are not allowed to assign roles.");
      return;
    }
    if (!email || !role) return;
    const userId = email;
    const resourcePath = localStorage.getItem("activeWorkspacePath");
    if (!resourcePath) {
      toast.error("No active workspace found.");
      return;
    }
    setAssigning(true);
    try {
      const response = await fetch("/roles/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role,
          resourcePath,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to assign role");
      }
      toast.success(`Assigned ${role} to ${email}`);
      setEmail("");
      setRole("viewer");
      setShowRoleModal(false);
    } catch (error) {
      console.error("Role assignment error:", error);
      toast.error(error.message || "Failed to assign role");
    } finally {
      setAssigning(false);
    }
  };

  const inputLineCount = input.split("\n").length;
  const outputLineCount = (output || "Output will appear here...").split("\n").length;
  const maxLines = 1;
  const inputLinesArr = Array.from(
    { length: Math.max(maxLines, inputLineCount) },
    (_, i) => i + 1
  );
  const outputLinesArr = Array.from(
    { length: Math.max(maxLines, outputLineCount) },
    (_, i) => i + 1
  );

  const handleInputScroll = () => {
    if (inputLineCounterRef.current && inputTextareaRef.current) {
      inputLineCounterRef.current.scrollTop = inputTextareaRef.current.scrollTop;
    }
  };

  const handleOutputScroll = () => {
    if (outputLineCounterRef.current && outputPreRef.current) {
      outputLineCounterRef.current.scrollTop = outputPreRef.current.scrollTop;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) editorRef.current.layout();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={styles.root} ref={containerRef}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <RxHamburgerMenu
            onClick={() => setShowSidebar(!showSidebar)}
            className={styles.headerIcon}
          />
          <FaClone
            className={`${styles.headerIcon} ${styles.clone}`}
            onClick={handleClone}
            title="Clone Workspace"
          />
          <IoGitCommit
            className={`${styles.headerIcon} ${styles.commit}`}
            onClick={() => setShowCommitModal(true)}
            title="Commit Change"
          />
          <IoIosGitNetwork
            className={`${styles.headerIcon} ${styles.fork}`}
            onClick={handleFork}
            title="Fork Workspace"
          />
          <RiHistoryFill
            className={`${styles.headerIcon} ${styles.history}`}
            onClick={handleShowHistory}
            title="View History"
          />
        </div>
        <div className={styles.headerCenter}>
          <span>CodeCollab</span>
        </div>
        <div className={styles.headerRight}>
          <TiUserAdd
            className={`${styles.headerIcon} ${styles.collab}`}
            onClick={() => setShowRoleModal(true)}
            title="Collaborate"
          />
          <VscRunAll
            className={`${styles.headerIcon} ${styles.run}`}
            onClick={handleRunCode}
            title="Run"
          />
        </div>
      </header>

      <div className={styles.mainContainer}>
        {showSidebar && (
          <Sidebar
            show={showSidebar}
            setEditorContent={setCode}
            setActiveFile={({ name, path, language }) => {
              setCurrentLanguage(language);
              setCurrentSelectedPath(path);
              subscribeToFile(path);
              setFileOpen(true);
            }}
          />
        )}
        <div
          className={`${styles.contentArea} ${
            showSidebar ? styles.contentWithSidebar : ""
          }`}
        >
          <div className={styles.editorContainer}>
            {fileOpen ? (
              <Editor
                height="100%"
                language={currentLanguage}
                value={code}
                onChange={(value) => sendMessage(value)}
                onMount={handleEditorDidMount}
                theme="custom-dark-theme"
                options={{
                  readOnly: userRole === "VIEWER",
                  fontSize: 14,
                  fontFamily: "Fira Code, monospace",
                  lineNumbers: "on",
                  lineNumbersMinChars: 3,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  tabSize: 4,
                  automaticLayout: true,
                  glyphMargin: false,
                  renderLineHighlight: "all",
                  lineDecorationsWidth: 5,
                }}
              />
            ) : (
              <div style={emptyEditorStyles}>
                <div style={{ fontSize: "24px", marginBottom: "10px" }}>
                  Welcome to CodeCollab
                </div>
                <div style={{ fontSize: "16px" }}>
                  Open a file from the sidebar to start coding
                </div>
                <div style={{ fontSize: "14px", marginTop: "20px" }}>
                  Click{" "}
                  <RxHamburgerMenu style={{ verticalAlign: "middle" }} /> to
                  browse files
                </div>
              </div>
            )}
          </div>

          <div className={styles.ioSection}>
            <div className={styles.inputSection}>
              <div className={styles.panelHeader}>Input</div>
              <div className={styles.lineNumberWrapper}>
                <textarea
                  className={styles.ioTextarea}
                  placeholder="Enter input here..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onScroll={handleInputScroll}
                  ref={inputTextareaRef}
                  disabled={!fileOpen}
                />
              </div>
            </div>

            <div className={styles.outputSection}>
              <div className={styles.panelHeader}>Output</div>
              <div className={styles.lineNumberWrapper}>
                <pre
                  className={styles.outputArea}
                  onScroll={handleOutputScroll}
                  ref={outputPreRef}
                >
                  {fileOpen
                    ? output || "Output will appear here..."
                    : "Open a file to run code"}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRoleModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 1000,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e1e1e",
              padding: "24px",
              borderRadius: "8px",
              minWidth: "300px",
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
              color: "#fff",
            }}
          >
            <h2 style={{ marginBottom: "16px", fontSize: "18px" }}>
              Assign Role
            </h2>
            <input
              type="email"
              placeholder="User Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                marginBottom: "12px",
                backgroundColor: "#2e2e2e",
                border: "1px solid #444",
                color: "#fff",
              }}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                marginBottom: "12px",
                backgroundColor: "#2e2e2e",
                border: "1px solid #444",
                color: "#fff",
              }}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                onClick={() => setShowRoleModal(false)}
                style={{
                  backgroundColor: "#555",
                  color: "#fff",
                  padding: "8px 12px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSetRole}
                disabled={assigning}
                style={{
                  backgroundColor: "#007acc",
                  color: "#fff",
                  padding: "8px 12px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {assigning ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCommitModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 1000,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e1e1e",
              padding: "24px",
              borderRadius: "8px",
              minWidth: "300px",
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
              color: "#fff",
            }}
          >
            <h3 style={{ marginBottom: "16px" }}>Commit Changes</h3>
            <textarea
              placeholder="Enter commit message..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                marginBottom: "12px",
                backgroundColor: "#2e2e2e",
                border: "1px solid #444",
                color: "#fff",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                onClick={() => setShowCommitModal(false)}
                style={{
                  backgroundColor: "#555",
                  color: "#fff",
                  padding: "8px 12px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                style={{
                  backgroundColor: "#007acc",
                  color: "#fff",
                  padding: "8px 12px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Commit
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 1000,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e1e1e",
              padding: "24px",
              borderRadius: "8px",
              minWidth: "800px",
              maxWidth: "1000px",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
              color: "#fff",
            }}
          >
            <h3 style={{ marginBottom: "16px" }}>Commit History</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#fff" }}>
              <thead>
                <tr>
                  <th style={headerCell}>#</th>
                  <th style={headerCell}>Name</th>
                  <th style={headerCell}>File</th>
                  <th style={headerCell}>Date</th>
                  <th style={headerCell}>Message</th>
                  <th style={headerCell}>Action</th>
                </tr>
              </thead>
              <tbody>
                {commitHistory.map((commit, idx) => (
                  <tr key={idx}>
                    <td style={rowCell}>{idx + 1}</td>
                    <td style={rowCell}>{commit.name}</td>
                    <td style={rowCell}>{commit.fileName}</td>
                    <td style={rowCell}>
                      {new Date(commit.commitDate).toLocaleString()}
                    </td>
                    <td style={rowCell}>{commit.commitMessage}</td>
                    <td style={rowCell}>
                      <button
                        style={{
                          padding: "6px 10px",
                          backgroundColor: "#007acc",
                          border: "none",
                          color: "#fff",
                          cursor: "pointer",
                          borderRadius: "4px",
                        }}
                        onClick={() => handleRevert(commit)}
                      >
                        Revert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  backgroundColor: "#555",
                  color: "#fff",
                  padding: "8px 12px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

{showCommentModal && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 1000,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <div
      style={{
        backgroundColor: "#1e1e1e",
        padding: "24px",
        borderRadius: "8px",
        minWidth: "300px",
        boxShadow: "0 0 10px rgba(0,0,0,0.5)",
        color: "#fff",
      }}
    >
      <h3 style={{ marginBottom: "16px" }}>
        Comment for Line {activeLine}
      </h3>
      <textarea
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Write topics and suggestions..."
        style={{
          width: "100%",
          padding: "8px",
          marginBottom: "12px",
          backgroundColor: "#2e2e2e",
          border: "1px solid #444",
          color: "#fff",
          minHeight: "100px",
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <button
          onClick={() => setShowCommentModal(false)}
          style={{
            backgroundColor: "#555",
            color: "#fff",
            padding: "8px 12px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => handleSaveComment(activeLine)}
          style={{
            backgroundColor: "#007acc",
            color: "#fff",
            padding: "8px 12px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <style jsx global>{`
        .monaco-editor .line-numbers {
          background: #1e1e1e !important;
          color: #858585 !important;
          width: 30px !important;
          padding: 0 5px !important;
          text-align: right !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .monaco-editor .margin {
          background: #1e1e1e !important;
        }
        .monaco-editor {
          overflow: visible !important;
        }
        .commented-line {
          background-color: rgba(0, 128, 0, 0.2) !important;
        }
      `}</style>
    </div>
  );
}

export default EditorPage;