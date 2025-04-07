import { useState, useEffect } from "react";

// This hook is an alternative way to access notes/notebooks functionality
// You can use either this hook OR the AppContext approach (not both)
export function useNotebooks() {
  const [notebooks, setNotebooks] = useState([]);
  const [allNotes, setAllNotes] = useState([]); // stores the full list
  const [notes, setNotes] = useState([]);       // filtered list for display
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState(1); // 1 for ascending, -1 for descending

  const fetchNotebooks = async () => {
    try {
      const data = await window.electronAPI.getNotebooks();
      setNotebooks(data);
    } catch (error) {
      console.error("Error fetching notebooks:", error);
    }
  };

  const fetchNotes = async (notebookId, clearSelection = true) => {
    setSelectedNotebook(notebookId);
    if (clearSelection) {
      setSelectedNote(null);
    }
    try {
      const data = await window.electronAPI.getNotes(notebookId);
      setAllNotes(data);
      if (searchQuery) {
        setNotes(
          data.filter((note) =>
            note.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );
      } else {
        setNotes(data);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const addNotebook = async (title) => {
    try {
      const newNotebook = await window.electronAPI.addNotebook(title);
      setNotebooks([...notebooks, newNotebook]);
      selectNotebook(newNotebook.id);
    } catch (error) {
      console.error("Error creating notebook:", error);
    }
  };

  const addNote = async (title) => {
    if (!selectedNotebook) return;
    try {
      const newNote = await window.electronAPI.addNote(title, selectedNotebook);
      setShowCreateNoteModal(false);
      setNotes([newNote, ...notes]);
      selectNote(newNote.id);
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  // Function to create an empty note
  const createEmptyNote = async () => {
    if (!selectedNotebook) return;
    try {
      const newNote = await window.electronAPI.addNote("New Note", selectedNotebook);
      setShowCreateNoteModal(false);
      setNotes([newNote, ...notes]);
      selectNote(newNote.id);
    } catch (error) {
      console.error("Error creating empty note:", error);
    }
  };

  const selectNote = (noteId) => {
    setSelectedNote(noteId);
  };

  const updateNoteTitle = async (noteId, newTitle) => {
    try {
      await window.electronAPI.updateNoteTitle(noteId, newTitle);
      const currentTime = new Date().toISOString();
      setAllNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === noteId
            ? { ...note, title: newTitle, updated_at: currentTime }
            : note
        )
      );
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === noteId
            ? { ...note, title: newTitle, updated_at: currentTime }
            : note
        )
      );
    } catch (error) {
      console.error("Error updating note title:", error);
    }
  };

  const updateNoteContent = async (noteId, newContent) => {
    try {
      await window.electronAPI.updateNoteContent(noteId, newContent);
      const currentTime = new Date().toISOString();
      setAllNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === noteId
            ? { ...note, content: newContent, updated_at: currentTime }
            : note
        )
      );
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === noteId
            ? { ...note, content: newContent, updated_at: currentTime }
            : note
        )
      );
    } catch (error) {
      console.error("Error updating note content:", error);
    }
  };

  const deleteNotebook = async (notebookId) => {
    try {
      await window.electronAPI.deleteNotebook(notebookId);
      setNotebooks((prev) => prev.filter((nb) => nb.id !== notebookId));
      // If the deleted notebook was selected, clear its notes.
      if (selectedNotebook === notebookId) {
        setSelectedNotebook(null);
        setNotes([]);
        setAllNotes([]);
      }
    } catch (error) {
      console.error("Error deleting notebook:", error);
    }
  };

  const openCreateNoteModal = () => {
    setShowCreateNoteModal(true);
  };

  const closeCreateNoteModal = () => {
    setShowCreateNoteModal(false);
  };

  // Sorting functions
  const sortNotesByTitle = () => {
    const sortedNotes = [...notes].sort((a, b) => {
      const titleA = (a.title || "").toLowerCase();
      const titleB = (b.title || "").toLowerCase();
      return sortDirection * titleA.localeCompare(titleB);
    });
    setNotes(sortedNotes);
    setSortDirection(sortDirection * -1);
  };

  const sortNotesByDate = (dateField) => {
    const sortedNotes = [...notes].sort((a, b) => {
      const dateA = new Date(a[dateField]);
      const dateB = new Date(b[dateField]);
      return sortDirection * (dateB - dateA);
    });
    setNotes(sortedNotes);
    setSortDirection(sortDirection * -1);
  };

  const searchNotes = (query) => {
    setSearchQuery(query);
    if (!query) {
      setNotes(allNotes);
    } else {
      const filtered = allNotes.filter((note) =>
        note.title.toLowerCase().includes(query.toLowerCase())
      );
      setNotes(filtered);
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const deleteNote = async (noteId) => {
    try {
      await window.electronAPI.deleteNote(noteId);
      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
      setAllNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
      if (selectedNote === noteId) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const updateNoteNotebook = async (noteId, newNotebookId) => {
    try {
      await window.electronAPI.updateNoteNotebook(noteId, newNotebookId);
      // If the note is in the current view, remove it
      if (selectedNotebook !== newNotebookId) {
        setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
        setAllNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
        if (selectedNote === noteId) {
          setSelectedNote(null);
        }
      }
    } catch (error) {
      console.error("Error updating note notebook:", error);
    }
  };

  const selectNotebook = (notebookId) => {
    setSelectedNotebook(notebookId);
    fetchNotes(notebookId);
  };

  return {
    notebooks,
    allNotes,
    notes,
    selectedNotebook,
    selectedNote,
    showCreateNoteModal,
    searchQuery,
    sortDirection,
    selectNotebook,
    selectNote,
    addNotebook,
    addNote,
    createEmptyNote,
    updateNoteContent,
    updateNoteTitle,
    updateNoteNotebook,
    deleteNotebook,
    openCreateNoteModal,
    closeCreateNoteModal,
    searchNotes,
    deleteNote,
    sortNotesByTitle,
    sortNotesByDate
  };
}