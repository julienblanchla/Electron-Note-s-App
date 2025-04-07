const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Notebooks
  getNotebooks: async () => ipcRenderer.invoke('getNotebooks'),
  addNotebook: async (title) => ipcRenderer.invoke('addNotebook', title),
  deleteNotebook: async (id) => ipcRenderer.invoke('deleteNotebook', id),
  
  // Notes
  getNotes: async (notebookId) => ipcRenderer.invoke('getNotes', notebookId),
  addNote: async (title, notebookId) => ipcRenderer.invoke('addNote', title, notebookId),
  updateNoteContent: async (noteId, content) => ipcRenderer.invoke('updateNoteContent', noteId, content),
  updateNoteTitle: async (noteId, title) => ipcRenderer.invoke('updateNoteTitle', noteId, title),
  deleteNote: async (noteId) => ipcRenderer.invoke('deleteNote', noteId),
  updateNoteNotebook: async (noteId, newNotebookId) => ipcRenderer.invoke('updateNoteNotebook', noteId, newNotebookId),
  
  // Trash
  getDeletedNotes: async () => ipcRenderer.invoke('getDeletedNotes'),
  restoreNote: async (noteId) => ipcRenderer.invoke('restoreNote', noteId),
  permanentlyDeleteNote: async (noteId) => ipcRenderer.invoke('permanentlyDeleteNote', noteId),
  
  // Images
  saveImage: async (noteId, imageData, name, type) => 
    ipcRenderer.invoke('saveImage', noteId, imageData, name, type),
  getImage: async (imageId) => ipcRenderer.invoke('getImage', imageId)
});
