import React, { useEffect, useState, useRef } from 'react';
import { FiFilePlus, FiFolderPlus, FiFolder, FiFile, FiChevronRight, FiChevronDown, FiEdit, FiTrash2 } from "react-icons/fi";
import './SideBar.css';

function Sidebar({ show, setEditorContent, setActiveFile }) {
  const [fileTree, setFileTree] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userRole = localStorage.getItem("userRole");
  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    path: '',
    isDirectory: false
  });
  
  // Input state for new item creation
  const [newItemInput, setNewItemInput] = useState({
    visible: false,
    path: '',
    type: '', // 'file' or 'directory'
    name: ''
  });
  
  // Rename state
  const [renameInput, setRenameInput] = useState({
    visible: false,
    path: '',
    name: '',
    type: '' // 'file' or 'directory'
  });
  
  const activeWorkspacePath = localStorage.getItem("activeWorkspacePath");
  const contextMenuRef = useRef(null);
  const newItemInputRef = useRef(null);
  const renameInputRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    try {
      const rawData = localStorage.getItem("activeWorkspaceTree");
      
      if (!rawData) {
        setError("No workspace tree data found in localStorage");
        setLoading(false);
        return;
      }
      
      const structure = JSON.parse(rawData);
      
      if (!structure || !structure.name) {
        setError("Invalid workspace tree structure");
        setLoading(false);
        return;
      }
      
      setFileTree(structure);
      
      // Initialize top-level folders as expanded
      if (structure.type === 'directory' && structure.children) {
        const initialExpanded = {};
        initialExpanded[structure.name] = true;
        setExpandedFolders(initialExpanded);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error parsing tree data:", error);
      setError(`Error parsing tree data: ${error.message}`);
      setLoading(false);
    }
  }, []);

  // Close context menu and inputs on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu({ ...contextMenu, visible: false });
      }
      
      if (newItemInputRef.current && !newItemInputRef.current.contains(event.target) && 
          event.target.className !== 'new-item-menu-option') {
        setNewItemInput({ ...newItemInput, visible: false });
      }
      
      if (renameInputRef.current && !renameInputRef.current.contains(event.target) && 
          event.target.className !== 'rename-menu-option') {
        setRenameInput({ ...renameInput, visible: false });
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu, newItemInput, renameInput]);

  const toggleFolder = (path, e) => {
    // Prevent triggering when right-clicking
    if (e && e.button === 2) return;
    
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleContextMenu = (e, path, isDirectory) => {
    e.preventDefault();
    
    // Extract the file/folder name from the path
    const pathSegments = path.split('/');
    const name = pathSegments[pathSegments.length - 1];
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      path,
      isDirectory,
      name
    });
    
    // Ensure the folder is expanded when right-clicked
    if (isDirectory && !expandedFolders[path]) {
      setExpandedFolders(prev => ({
        ...prev,
        [path]: true
      }));
    }
  };

  // New function to handle file click
  const handleFileClick = async (e, path) => {
    // Prevent default behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Extract file name from path
    const pathSegments = path.split('/');
    const fileName = pathSegments[pathSegments.length - 1];
    
    // Normalize to backslashes for Windows-style path
    const formattedPath = path.replace(/\//g, '\\');

    // Retrieve the base workspace path
    const workspaceRootPath = localStorage.getItem("activeWorkspacePath");

    // Remove the workspace name from formattedPath if it's already included
    const workspaceName = workspaceRootPath.split("\\").pop();
    const pathWithoutWorkspace = formattedPath.startsWith(workspaceName) 
        ? formattedPath.slice(workspaceName.length + 1)
        : formattedPath;

    // Combine full path to file
    const fullPathToFile = `${workspaceRootPath}\\${pathWithoutWorkspace}`;
    console.log("Opening file:", fullPathToFile);

    try {

      const response = await fetch('http://localhost:5000/files/retrieve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentPath: fullPathToFile,
          type: "file"
        }),
        credentials: 'include'
      });
    
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to retrieve file: ${errorText}`);
      }
    
      // Assume it's raw text (not JSON)
      const content = await response.text();
    
      // Update Monaco editor
      if (setEditorContent) {
        setEditorContent(content);
      }
    
      if (setActiveFile) {
        setActiveFile({
          name: fileName,
          path: fullPathToFile,
          language: determineLanguage(fileName),
        });
      }
} catch (error) {
  console.error('Error retrieving file:', error);
  setError(`Failed to open file: ${error.message}`);
}
  }

  
  // Helper function to determine language based on file extension
  const determineLanguage = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'go': 'go',
      'php': 'php',
      'rb': 'ruby',
      'rs': 'rust',
      'sh': 'shell',
      'sql': 'sql',
      'yml': 'yaml',
      'yaml': 'yaml',
      'xml': 'xml',
      'txt': 'plaintext'
    };
    
    return languageMap[extension] || 'plaintext';
  };

  const showNewItemInput = (type) => {
    setNewItemInput({
      visible: true,
      path: contextMenu.path,
      type,
      name: ''
    });
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleInputChange = (e) => {
    setNewItemInput({
      ...newItemInput,
      name: e.target.value
    });
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      createNewItem();
    } else if (e.key === 'Escape') {
      setNewItemInput({ ...newItemInput, visible: false });
    }
  };

  // API call to create a new item (file or directory)
  const createItemOnServer = async (requestBody) => {
    try {
      const response = await fetch('http://localhost:5000/files/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create ${requestBody.type}: ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('API error:', error);
      setError(`Failed to create ${requestBody.type}: ${error.message}`);
      return false;
    }
  };

  // API call to rename an item
  const renameItemOnServer = async (type, currentPath, newName) => {
    if (userRole === "VIEWER") {
      alert("You are not allowed to rename.");
      return;
    }
    try {
      const pathParts = currentPath.split('\\');
      const oldName = pathParts[pathParts.length - 1];

      const requestBody = {
        type,
        newName,
        currentPath,
        oldName  // Add the oldName property
      };
      
      console.log("Sending rename request:", requestBody);
      
      const response = await fetch('http://localhost:5000/files/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to rename ${type}: ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('API error:', error);
      setError(`Failed to rename ${type}: ${error.message}`);
      return false;
    }
  };

  // API call to delete an item
  const deleteItemOnServer = async (type, path) => {
    if (userRole === "VIEWER") {
      alert("You are not allowed to delete.");
      return;
    }
    try {
      const requestBody = {
        type,
        path
      };
      
      const response = await fetch('http://localhost:5000/files/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete ${type}: ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('API error:', error);
      setError(`Failed to delete ${type}: ${error.message}`);
      return false;
    }
  };

  const createNewItem = async () => {
    if (userRole === "VIEWER") {
      alert("You are not allowed to create.");
      return;
    }
    if (!newItemInput.name.trim()) {
      setNewItemInput({ ...newItemInput, visible: false });
      return;
    }

    // Format the parent path for API request
    const rootName = activeWorkspacePath.split("\\").pop(); // "testingworkspace1"

    // Fix: Normalize slashes first
    let relativePath = newItemInput.path.replace(/\//g, '\\');

    // Fix: Strip leading duplicated root directory (handle edge cases)
    if (relativePath === rootName) {
      relativePath = "";
    } else if (relativePath.startsWith(rootName + "\\")) {
      relativePath = relativePath.slice(rootName.length + 1);
    }

    const parentPath = relativePath
      ? `${activeWorkspacePath}\\${relativePath}`
      : activeWorkspacePath;
    
    // Create the request body according to API specifications
    const requestBody = {
      type: newItemInput.type,
      name: newItemInput.name,
      parentPath: parentPath
    };
    
    // Make API request to create the item
    const success = await createItemOnServer(requestBody);
    
    if (success) {
      // Create a copy of the file tree to modify
      const updatedTree = JSON.parse(JSON.stringify(fileTree));
      
      // Helper function to find and update the target directory
      const updateDirectory = (node, pathSegments, currentPath = '') => {
        const currentPathFull = currentPath ? `${currentPath}/${node.name}` : node.name;
        
        // If we've reached the target directory
        if (currentPathFull === newItemInput.path) {
          // Initialize children array if it doesn't exist
          if (!node.children) {
            node.children = [];
          }
          
          // Create the new item
          const newItem = {
            name: newItemInput.name,
            type: newItemInput.type,
            children: newItemInput.type === 'directory' ? [] : undefined
          };
          
          // Add it to the children array
          node.children.push(newItem);
          return true;
        }
        
        // Continue searching in children
        if (node.children && node.type === 'directory') {
          for (let i = 0; i < node.children.length; i++) {
            if (updateDirectory(node.children[i], pathSegments, currentPathFull)) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      // Start from the root and find the target directory
      const pathSegments = newItemInput.path.split('/');
      updateDirectory(updatedTree, pathSegments);
      
      // Update the file tree state
      setFileTree(updatedTree);
      
      // Save the updated tree to localStorage
      localStorage.setItem("activeWorkspaceTree", JSON.stringify(updatedTree));
    }
    
    // Hide the input field
    setNewItemInput({ ...newItemInput, visible: false });
  };

  const handleDelete = async () => {
    const path = contextMenu.path;
    const type = contextMenu.isDirectory ? 'directory' : 'file';
    
    console.log("Starting delete operation for:", path);
    console.log("Item type:", type);
    
    // Normalize to backslashes for Windows-style path
    const formattedPath = path.replace(/\//g, '\\');

    // Retrieve the base workspace path
    const workspaceRootPath = localStorage.getItem("activeWorkspacePath");

    // Remove the workspace name from formattedPath if it's already included
    const workspaceName = workspaceRootPath.split("\\").pop();
    const pathWithoutWorkspace = formattedPath.startsWith(workspaceName) 
        ? formattedPath.slice(workspaceName.length + 1)
        : formattedPath;

    // Combine full path to item
    const fullPathToDelete = `${workspaceRootPath}\\${pathWithoutWorkspace}`;
    console.log("Full path to delete:", fullPathToDelete);

    // Make API request to delete the item
    const success = await deleteItemOnServer(type, fullPathToDelete);
    console.log("Delete API response success:", success);
    
    if (success) {
      try {
        // Create a copy of the file tree to modify
        const updatedTree = JSON.parse(JSON.stringify(fileTree));
        console.log("Original tree before deletion:", updatedTree);
        
        // Get path segments for tree traversal, filtering out empty segments
        const pathSegments = path.split('/').filter(segment => segment.length > 0);
        console.log("Path segments after filtering:", pathSegments);
        
        // Flag to track if deletion was successful
        let deletionSuccessful = false;
        
        // Check if the first segment matches the root name and remove it
        // This is the key fix - we need to handle the root name properly
        if (pathSegments[0] === updatedTree.name) {
          // Remove the first segment since it's the root node itself
          pathSegments.shift();
          console.log("Removed root name from path segments:", pathSegments);
        }
        
        // Handle deletion based on remaining path depth
        if (pathSegments.length === 0) {
          console.log("Cannot delete root node");
        } else if (pathSegments.length === 1) {
          // Direct child of root
          console.log("Deleting direct child of root:", pathSegments[0]);
          
          if (updatedTree.children && Array.isArray(updatedTree.children)) {
            const childIndex = updatedTree.children.findIndex(child => 
              child.name === pathSegments[0]
            );
            
            if (childIndex !== -1) {
              // Remove the item from children array
              console.log("Found item at index:", childIndex);
              updatedTree.children.splice(childIndex, 1);
              deletionSuccessful = true;
            } else {
              console.log("Item not found in root children");
            }
          } else {
            console.log("Root has no children array");
          }
        } else {
          // For deeply nested items, trace through the tree
          console.log("Deleting nested item with remaining path segments:", pathSegments);
          
          // Find the parent node first
          const findAndRemove = () => {
            let currentNode = updatedTree;
            let i = 0;
            
            // Traverse to the parent node (node containing the item to delete)
            while (i < pathSegments.length - 1) {
              if (!currentNode.children || !Array.isArray(currentNode.children)) {
                console.log(`No children found at segment ${i}`);
                return false;
              }
              
              const nextNode = currentNode.children.find(child => 
                child.name === pathSegments[i]
              );
              
              if (!nextNode) {
                console.log(`Node "${pathSegments[i]}" not found at level ${i}`);
                return false;
              }
              
              console.log(`Found node "${pathSegments[i]}" at level ${i}`);
              currentNode = nextNode;
              i++;
            }
            
            // Now we're at the parent, remove the target child
            if (!currentNode.children || !Array.isArray(currentNode.children)) {
              console.log("Parent has no children array");
              return false;
            }
            
            const targetName = pathSegments[pathSegments.length - 1];
            const targetIndex = currentNode.children.findIndex(child => 
              child.name === targetName
            );
            
            if (targetIndex === -1) {
              console.log(`Target "${targetName}" not found in parent's children`);
              return false;
            }
            
            console.log(`Found target "${targetName}" at index ${targetIndex}, removing it`);
            currentNode.children.splice(targetIndex, 1);
            return true;
          };
          
          deletionSuccessful = findAndRemove();
        }
        
        if (deletionSuccessful) {
          console.log("Deletion successful, updating tree state");
          console.log("Updated tree structure:", updatedTree);
          
          // Force a deep copy to ensure React detects the change
          const freshTreeCopy = JSON.parse(JSON.stringify(updatedTree));
          
          // Update localStorage first
          localStorage.setItem("activeWorkspaceTree", JSON.stringify(freshTreeCopy));
          
          // Then update state with the fresh copy
          setFileTree(freshTreeCopy);
          
          // Clean up expandedFolders state if needed
          if (contextMenu.isDirectory) {
            const newExpandedFolders = { ...expandedFolders };
            delete newExpandedFolders[path];
            
            // Also remove any nested paths that might have been expanded
            Object.keys(newExpandedFolders).forEach(expandedPath => {
              if (expandedPath.startsWith(path + '/')) {
                delete newExpandedFolders[expandedPath];
              }
            });
            
            setExpandedFolders(newExpandedFolders);
          }
          
          // Force component to re-render by triggering a state update
          setLoading(true);
          setTimeout(() => setLoading(false), 1);
        } else {
          console.log("Failed to find and remove the item from the tree structure");
        }
      } catch (error) {
        console.error("Error updating tree after deletion:", error);
      }
    } else {
      console.log("Server deletion failed");
    }
    
    // Hide the context menu
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Handle showing the rename input
  const handleShowRename = () => {
    const pathSegments = contextMenu.path.split('/');
    const itemName = pathSegments[pathSegments.length - 1];
    
    setRenameInput({
      visible: true,
      path: contextMenu.path,
      name: itemName,
      type: contextMenu.isDirectory ? 'directory' : 'file'
    });
    
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Handle rename input change
  const handleRenameInputChange = (e) => {
    setRenameInput({
      ...renameInput,
      name: e.target.value
    });
  };

  // Handle rename input key events
  const handleRenameInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      submitRename();
    } else if (e.key === 'Escape') {
      setRenameInput({ ...renameInput, visible: false });
    }
  };

  // Submit the rename operation
  const submitRename = async () => {
    if (!renameInput.name.trim() || renameInput.name === contextMenu.name) {
      setRenameInput({ ...renameInput, visible: false });
      return;
    }

    const path = renameInput.path;
    const type = renameInput.type;

    // Normalize to backslashes for Windows-style path
    const formattedPath = path.replace(/\//g, '\\');

    // Retrieve the base workspace path
    const workspaceRootPath = localStorage.getItem("activeWorkspacePath");

    // Remove the workspace name from formattedPath if it's already included
    const workspaceName = workspaceRootPath.split("\\").pop();
    const pathWithoutWorkspace = formattedPath.startsWith(workspaceName) 
        ? formattedPath.slice(workspaceName.length + 1)
        : formattedPath;

    // Combine full path to item
    const fullPathToRename = `${workspaceRootPath}\\${pathWithoutWorkspace}`;
    console.log("Full path to rename:", fullPathToRename);

    // Make API request to rename the item
    const success = await renameItemOnServer(type, fullPathToRename, renameInput.name);
    
    if (success) {
      try {
        // Create a copy of the file tree to modify
        const updatedTree = JSON.parse(JSON.stringify(fileTree));
        
        // Get path segments for tree traversal, filtering out empty segments
        const pathSegments = path.split('/').filter(segment => segment.length > 0);
        
        // Flag to track if rename was successful
        let renameSuccessful = false;
        
        // Check if the first segment matches the root name and remove it
        if (pathSegments[0] === updatedTree.name) {
          // Remove the first segment since it's the root node itself
          pathSegments.shift();
        }
        
        // Handle rename based on path depth
        if (pathSegments.length === 0) {
          console.log("Cannot rename root node");
        } else if (pathSegments.length === 1) {
          // Direct child of root
          console.log("Renaming direct child of root:", pathSegments[0]);
          
          if (updatedTree.children && Array.isArray(updatedTree.children)) {
            const childIndex = updatedTree.children.findIndex(child => 
              child.name === pathSegments[0]
            );
            
            if (childIndex !== -1) {
              // Rename the item
              updatedTree.children[childIndex].name = renameInput.name;
              renameSuccessful = true;
            }
          }
        } else {
          // For deeply nested items, trace through the tree
          console.log("Renaming nested item with remaining path segments:", pathSegments);
          
          // Find and rename the node
          const findAndRename = () => {
            let currentNode = updatedTree;
            let i = 0;
            
            // Traverse to the parent node (node containing the item to rename)
            while (i < pathSegments.length - 1) {
              if (!currentNode.children || !Array.isArray(currentNode.children)) {
                return false;
              }
              
              const nextNode = currentNode.children.find(child => 
                child.name === pathSegments[i]
              );
              
              if (!nextNode) {
                return false;
              }
              
              currentNode = nextNode;
              i++;
            }
            
            // Now we're at the parent, find and rename the target child
            if (!currentNode.children || !Array.isArray(currentNode.children)) {
              return false;
            }
            
            const targetName = pathSegments[pathSegments.length - 1];
            const targetIndex = currentNode.children.findIndex(child => 
              child.name === targetName
            );
            
            if (targetIndex === -1) {
              return false;
            }
            
            // Rename the item
            currentNode.children[targetIndex].name = renameInput.name;
            return true;
          };
          
          renameSuccessful = findAndRename();
        }
        
        if (renameSuccessful) {
          console.log("Rename successful, updating tree state");
          
          // Create new path for expanded folders state update
          const oldPathSegments = path.split('/');
          const newPathSegments = [...oldPathSegments];
          newPathSegments[newPathSegments.length - 1] = renameInput.name;
          const newPath = newPathSegments.join('/');
          
          // Update expandedFolders state if the renamed item is a directory
          if (type === 'directory') {
            const newExpandedFolders = { ...expandedFolders };
            
            // If the directory was expanded, update its path in expandedFolders
            if (newExpandedFolders[path]) {
              delete newExpandedFolders[path];
              newExpandedFolders[newPath] = true;
              
              // Update paths of nested expanded folders
              Object.keys(newExpandedFolders).forEach(expandedPath => {
                if (expandedPath.startsWith(path + '/')) {
                  const relativePath = expandedPath.slice(path.length);
                  const newExpandedPath = newPath + relativePath;
                  newExpandedFolders[newExpandedPath] = true;
                  delete newExpandedFolders[expandedPath];
                }
              });
              
              setExpandedFolders(newExpandedFolders);
            }
          }
          
          // Update localStorage first
          localStorage.setItem("activeWorkspaceTree", JSON.stringify(updatedTree));
          
          // Then update state with the fresh copy
          setFileTree(updatedTree);
          
          // Force component to re-render
          setLoading(true);
          setTimeout(() => setLoading(false), 1);
        } else {
          console.log("Failed to find and rename the item in the tree structure");
        }
      } catch (error) {
        console.error("Error updating tree after rename:", error);
      }
    } else {
      console.log("Server rename operation failed");
    }
    
    // Hide the rename input
    setRenameInput({ ...renameInput, visible: false });
  };

  // Recursive function to render the file tree
  const renderTree = (node, path = '', depth = 0) => {
    if (!node) return null;
    
    const currentPath = path ? `${path}/${node.name}` : node.name;
    const isDirectory = node.type === 'directory';
    const isExpanded = expandedFolders[currentPath];
    
    // Check if this directory is the one where we're adding a new item
    const isAddingHere = newItemInput.visible && newItemInput.path === currentPath;
    
    // Check if this item is being renamed
    const isRenaming = renameInput.visible && renameInput.path === currentPath;
    
    if (isRenaming) {
      return (
        <div key={currentPath} style={{ marginLeft: depth * 16 + 'px' }}>
          <div className="rename-input-container" ref={renameInputRef}>
            <span className="item-icon">
              {isDirectory ? <FiFolder size={14} /> : <FiFile size={14} />}
            </span>
            <input
              type="text"
              value={renameInput.name}
              onChange={handleRenameInputChange}
              onKeyDown={handleRenameInputKeyDown}
              autoFocus
              className="rename-item-input"
            />
          </div>
        </div>
      );
    }
    
    return (
      <div key={currentPath} style={{ marginLeft: depth * 16 + 'px' }}>
        <div 
          className={`tree-item ${isDirectory ? 'directory' : 'file'}`}
          onClick={(e) => isDirectory ? toggleFolder(currentPath, e) : handleFileClick(e, currentPath)}
          onContextMenu={(e) => handleContextMenu(e, currentPath, isDirectory)}
        >
          {isDirectory ? (
            <>
              <span className="folder-arrow">
                {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
              </span>
              <FiFolder className="item-icon" />
            </>
          ) : (
            <FiFile className="item-icon" />
          )}
          <span className="item-name">{node.name}</span>
        </div>
        
        {isDirectory && (
          <div className="folder-children">
            {isAddingHere && (
              <div className="new-item-input-container" ref={newItemInputRef}>
                <span className="item-icon">
                  {newItemInput.type === 'directory' ? <FiFolder size={14} /> : <FiFile size={14} />}
                </span>
                <input
                  type="text"
                  value={newItemInput.name}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  autoFocus
                  placeholder={`New ${newItemInput.type}...`}
                  className="new-item-input"
                />
              </div>
            )}
            
            {isExpanded && node.children && Array.isArray(node.children) && (
              node.children.map(child => renderTree(child, currentPath, depth + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={show ? 'sidenav active' : 'sidenav'}>
      
      <div className="file-explorer">
        {loading && <div className="loading">Loading tree...</div>}
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
        {fileTree && !loading && !error && (
          <div className="tree-container">
            {renderTree(fileTree)}
          </div>
        )}
      </div>
      
      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          ref={contextMenuRef}
        >
          {contextMenu.isDirectory && (
            <>
              <div className="context-menu-item" onClick={() => showNewItemInput('file')}>
                <FiFilePlus className="context-menu-icon" />
                <span>New File</span>
              </div>
              <div className="context-menu-item" onClick={() => showNewItemInput('directory')}>
                <FiFolderPlus className="context-menu-icon" />
                <span>New Folder</span>
              </div>
              <div className="context-menu-divider"></div>
            </>
          )}
          <div className="context-menu-item" onClick={handleShowRename}>
            <FiEdit className="context-menu-icon" />
            <span>Rename</span>
          </div>
          <div className="context-menu-item" onClick={handleDelete}>
            <FiTrash2 className="context-menu-icon" />
            <span>Delete</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;