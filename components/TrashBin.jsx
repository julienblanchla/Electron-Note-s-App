import React, { useEffect, useState } from "react";
import { useAppContext } from "../AppContext"; // Updated import path

const TrashBin = () => {
  const { notebooks, loadNotes } = useAppContext();
  const [deletedNotes, setDeletedNotes] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [restoreError, setRestoreError] = useState(null);
  
  // Load deleted notes when the trash bin is opened
  useEffect(() => {
    if (isOpen) {
      loadDeletedNotes();
    }
  }, [isOpen]);

  const loadDeletedNotes = async () => {
    try {
      // Updated to use Electron API
      const notes = await window.electronAPI.getDeletedNotes();
      setDeletedNotes(notes);
      setRestoreError(null);
    } catch (error) {
      console.error("Failed to load deleted notes:", error);
    }
  };

  const getNotebookName = (notebookId) => {
    const notebook = notebooks.find(nb => nb.id === notebookId);
    return notebook ? notebook.title : "Unknown Notebook";
  };

  const handleRestore = async (noteId, notebookId) => {
    setRestoreError(null);
    
    try {
      console.log(`Attempting to restore note with ID: ${noteId} to notebook ${notebookId}`);
      
      if (!window.confirm(`Restore note to "${getNotebookName(notebookId)}" notebook?`)) {
        console.log("Restore canceled by user");
        return;
      }
      
      // Updated to use Electron API
      await window.electronAPI.restoreNote(noteId);
      
      console.log("Backend restore_note call succeeded");
      
      await loadDeletedNotes();
      
      if (loadNotes && typeof loadNotes === 'function') {
        console.log(`Refreshing notes for notebook ${notebookId}`);
        await loadNotes(notebookId);
      } else {
        console.warn("loadNotes function is not available or not a function", loadNotes);
      }
      
      console.log("Note restored successfully");
    } catch (error) {
      console.error("Failed to restore note:", error);
      setRestoreError(`Error: ${error.toString()}`);
    }
  };

  const handlePermanentDelete = async (noteId) => {
    if (window.confirm("Permanently delete this note? This action cannot be undone.")) {
      try {
        // Updated to use Electron API
        await window.electronAPI.permanentlyDeleteNote(noteId);
        await loadDeletedNotes();
      } catch (error) {
        console.error("Failed to permanently delete note:", error);
      }
    }
  };

  const handleEmptyTrash = async () => {
    if (window.confirm("Empty trash? This will permanently delete all notes in the trash.")) {
      try {
        for (const note of deletedNotes) {
          // Updated to use Electron API
          await window.electronAPI.permanentlyDeleteNote(note.id);
        }
        setDeletedNotes([]);
      } catch (error) {
        console.error("Failed to empty trash:", error);
      }
    }
  };

  return (
    <div className="mt-6 border-t border-gray-700 pt-4">
      <button 
        className="flex items-center w-full text-left text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="trash-content"
      >
        <span>Trash Bin</span>
        {isOpen ? (
          <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="mt-2">
          {restoreError && (
            <div className="p-2 text-red-400 text-sm bg-red-900/20 rounded mb-2">
              {restoreError}
            </div>
          )}
          
          {deletedNotes.length > 0 ? (
            <>
              <div className="flex justify-end px-2 py-1">
                <button 
                  onClick={handleEmptyTrash}
                  className="text-xs text-red-400 hover:text-red-500"
                >
                  Empty Trash
                </button>
              </div>
              <ul className="space-y-1">
                {deletedNotes.map((note) => (
                  <li 
                    key={note.id} 
                    className="flex flex-col px-2 py-1 text-gray-300 hover:bg-gray-700 rounded group"
                  >
                    <div className="flex items-center w-full">
                      <span className="truncate flex-1">{note.title || "Sans titre"}</span>
                      <button 
                        onClick={() => handleRestore(note.id, note.notebook_id)}
                        className="text-green-400 hover:text-green-500 ml-2 p-1 rounded hover:bg-green-900/20"
                        title={`Restore to ${getNotebookName(note.notebook_id)}`}
                      >
                        <span role="img" aria-label="Restore">↩️</span>
                      </button>
                      <button 
                        onClick={() => handlePermanentDelete(note.id)}
                        className="text-red-400 hover:text-red-500 ml-2 p-1 rounded hover:bg-red-900/20"
                        title="Delete permanently"
                      >
                        <span role="img" aria-label="Delete">🗑️</span>
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      From: {getNotebookName(note.notebook_id)}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="px-2 py-1 text-gray-400 text-sm">Trash is empty</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrashBin;