// AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import PropTypes from 'prop-types';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [notebooks, setNotebooks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);

  // Load notebooks on startup
  useEffect(() => {
    loadNotebooks();
  }, []);

  // Load notes when a notebook is selected
  useEffect(() => {
    if (selectedNotebook) {
      loadNotes(selectedNotebook);
    } else {
      setNotes([]);
    }
  }, [selectedNotebook]);

  // Notebook functions
  const loadNotebooks = async () => {
    try {
      const data = await window.electronAPI.getNotebooks();
      setNotebooks(data);
      
      // If there's at least one notebook, select the first one
      if (data.length > 0 && !selectedNotebook) {
        selectNotebook(data[0].id);
      }
    } catch (error) {
      console.error("Error loading notebooks:", error);
    }
  };

  const addNotebook = async (title) => {
    try {
      const newNotebook = await window.electronAPI.addNotebook(title);
      setNotebooks([...notebooks, newNotebook]);
      selectNotebook(newNotebook.id);
    } catch (error) {
      console.error("Error adding notebook:", error);
    }
  };

  const deleteNotebook = async (id) => {
    try {
      await window.electronAPI.deleteNotebook(id);
      const updatedNotebooks = notebooks.filter(nb => nb.id !== id);
      setNotebooks(updatedNotebooks);
      
      if (selectedNotebook === id) {
        setSelectedNotebook(updatedNotebooks.length > 0 ? updatedNotebooks[0].id : null);
      }
    } catch (error) {
      console.error("Error deleting notebook:", error);
    }
  };

  const selectNotebook = (id) => {
    setSelectedNotebook(id);
    setSelectedNote(null);
  };

  // Note functions
  const loadNotes = async (notebookId) => {
    try {
      const data = await window.electronAPI.getNotes(notebookId);
      setNotes(data);
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  };

  const addNote = async (title) => {
    if (!selectedNotebook) return;
    
    try {
      const newNote = await window.electronAPI.addNote(title, selectedNotebook);
      setNotes([newNote, ...notes]);
      selectNote(newNote.id);
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  const createEmptyNote = () => {
    addNote("New Note");
  };

  const updateNoteContent = async (noteId, content) => {
    try {
      await window.electronAPI.updateNoteContent(noteId, content);
      setNotes(notes.map(note => 
        note.id === noteId 
          ? { ...note, content, updated_at: new Date().toISOString() } 
          : note
      ));
    } catch (error) {
      console.error("Error updating note content:", error);
    }
  };

  const updateNoteTitle = async (noteId, title) => {
    try {
      await window.electronAPI.updateNoteTitle(noteId, title);
      setNotes(notes.map(note => 
        note.id === noteId 
          ? { ...note, title, updated_at: new Date().toISOString() } 
          : note
      ));
    } catch (error) {
      console.error("Error updating note title:", error);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await window.electronAPI.deleteNote(noteId);
      const updatedNotes = notes.filter(note => note.id !== noteId);
      setNotes(updatedNotes);
      
      if (selectedNote === noteId) {
        setSelectedNote(updatedNotes.length > 0 ? updatedNotes[0].id : null);
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const selectNote = (id) => {
    setSelectedNote(id);
  };

  // Image functions
  const saveImage = async (noteId, imageData, name, type) => {
    try {
      return await window.electronAPI.saveImage(noteId, imageData, name, type);
    } catch (error) {
      console.error("Error saving image:", error);
      throw error;
    }
  };

  // Notebook note management functions
  const updateNoteNotebook = async (noteId, newNotebookId) => {
    try {
      await window.electronAPI.updateNoteNotebook(noteId, newNotebookId);
      // Refresh notes list for both notebooks
      if (selectedNotebook) {
        loadNotes(selectedNotebook);
      }
    } catch (error) {
      console.error("Error moving note to another notebook:", error);
    }
  };

  // Sorting functions
  const sortNotesByTitle = () => {
    const sorted = [...notes].sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
    setNotes(sorted);
  };

  const sortNotesByDate = (dateField) => {
    const sorted = [...notes].sort((a, b) => {
      return new Date(b[dateField]) - new Date(a[dateField]);
    });
    setNotes(sorted);
  };

  // Modal functions
  const openCreateNoteModal = () => setIsCreateNoteModalOpen(true);
  const closeCreateNoteModal = () => setIsCreateNoteModalOpen(false);

  // Context value
  const contextValue = React.useMemo(() => ({
    notebooks,
    notes,
    selectedNotebook,
    selectedNote,
    isCreateNoteModalOpen,
    loadNotebooks,
    loadNotes,
    addNotebook,
    deleteNotebook,
    selectNotebook,
    addNote,
    createEmptyNote,
    updateNoteContent,
    updateNoteTitle,
    deleteNote,
    selectNote,
    saveImage,
    updateNoteNotebook,
    sortNotesByTitle,
    sortNotesByDate,
    openCreateNoteModal,
    closeCreateNoteModal
  }), [
    notebooks,
    notes,
    selectedNotebook,
    selectedNote,
    isCreateNoteModalOpen
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAppContext = () => useContext(AppContext);
