  import React, { useEffect, useState } from 'react';
  import './userworkspaces.css';

  function UserWorkspaces() {
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [error, setError] = useState('');

    const fetchWorkspaces = () => {
      const payload = {
        type: "workspaces"
      };

      fetch("http://localhost:5000/files/retrieve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
        .then((res) => {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return res.json();
          } else {
            throw new Error("Unexpected response format: " + contentType);
          }
        })
        .then((data) => {
          setWorkspaces(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load workspaces:", err);
          setLoading(false);
        });
    };

    useEffect(() => {
      fetchWorkspaces();
    }, []);

    const handleCreateWorkspace = () => {
      const payload = {
        name: newWorkspaceName,
        type: "workspace",
        parentPath: null,
      };
    
      fetch("http://localhost:5000/files/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (res.status !== 201) throw new Error("Workspace creation failed");
          // Now fetch all workspaces
          return fetch("http://localhost:5000/files/retrieve", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: 'include',
            body: JSON.stringify({ type: "workspaces" }),
          });
        })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch user workspaces");
          return res.json();
        })
        .then((workspaces) => {
          // Find the full path of the newly created workspace
          const newWorkspaceFullPath = workspaces.find(path =>
            path.split(/[/\\]/).pop() === newWorkspaceName
          );
          if (!newWorkspaceFullPath) throw new Error("New workspace not found");
          localStorage.setItem("activeWorkspacePath", newWorkspaceFullPath);  // <--- THIS IS CRITICAL

          // Retrieve directory structure
          return fetch("http://localhost:5000/files/retrieve", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: 'include',
            body: JSON.stringify({ type: "directory", parentPath: newWorkspaceFullPath }),
          });
        })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to retrieve new workspace directory");
          return res.json();
        })
        .then((data) => {
          
          localStorage.setItem("activeWorkspaceTree", JSON.stringify(data));
          setNewWorkspaceName('');
          setError('');
          window.location.href = "/editor";
        })
        .catch((err) => {
          console.error("Workspace setup error:", err);
          setError("Creation failed");
        });
    };
    
    
  const handleWorkspaceClick = async (fullPath) => {
    try {
      const payload = {
        type: "directory",
        parentPath: fullPath,
      };
    
      // First fetch - get files
      const filesRes = await fetch("http://localhost:5000/files/retrieve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      if (!filesRes.ok) {
        throw new Error(`Files retrieve failed with status: ${filesRes.status}`);
      }
      
      const data = await filesRes.json();
      localStorage.setItem("activeWorkspacePath", fullPath);
      localStorage.setItem("activeWorkspaceTree", JSON.stringify(data));

      // Extract email from fullPath
      const parts = fullPath.split(/[\\/]/).filter(Boolean);
      const userEmail = parts[2];
      
      if (!userEmail) {
        throw new Error("Failed to extract user email from path");
      }

      // Second fetch - get role
      const roleRes = await fetch("http://localhost:5000/roles/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: userEmail, resourcePath: fullPath }),
      });

      // Check if we got redirected or error
      if (roleRes.redirected) {
        console.log("Session expired or not authenticated, redirecting to login");
        window.location.href = roleRes.url; // Go to wherever we were redirected
        return;
      }
      
      if (!roleRes.ok) {
        throw new Error(`Role retrieve failed with status: ${roleRes.status}`);
      }

      // Safely parse the response
      let roleData = {};
      const text = await roleRes.text();
      if (text.trim()) {
        try {
          roleData = JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse role response:", e);
        }
      }

      if (!roleData.role) {
        throw new Error("No role information returned");
      }

      localStorage.setItem("userRole", roleData.role);
      window.location.href = "/editor";
    } catch (err) {
      console.error("Error handling workspace click:", err);
      // Optionally show user-friendly error message here
    }
  };
    

    return (
      <div className="page-wrapper">
        <h2>User Workspaces</h2>

        <div className="card">
          {loading ? (
            <div>Loading...</div>
          ) : (
            workspaces.map((workspace, index) => {
              const workspaceName = workspace.split('\\').pop();
              return (
                <button
                  key={index}
                  className="workspace-button"
                  onClick={() => handleWorkspaceClick(workspace)}
                  >
                  {workspace.split('\\').pop()}
              </button> 
              );
            })
          )}
        </div>

        <input
          className="workspace-input"
          type="text"
          placeholder="Enter workspace name"
          value={newWorkspaceName}
          onChange={(e) => setNewWorkspaceName(e.target.value)}
        />
        {error && <div className="error-text">{error}</div>}

        <button className="create-button" onClick={handleCreateWorkspace}>
          Create Workspace
        </button>
      </div>
    );
  }

  export default UserWorkspaces;
