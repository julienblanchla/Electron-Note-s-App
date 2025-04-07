// API functions for the useNotebooks hook

export async function getNotebooks() {
  return window.electronAPI.getNotebooks();
}

export async function createNotebook(title) {
  return window.electronAPI.addNotebook(title);
}

export async function deleteNotebook(id) {
  return window.electronAPI.deleteNotebook(id);
}

export async function getNotes(notebookId) {
  return window.electronAPI.getNotes(notebookId);
}

export async function createNote(notebookId, title) {
  return window.electronAPI.addNote(title, notebookId);
}

export async function updateNoteContent(noteId, content) {
  return window.electronAPI.updateNoteContent(noteId, content);
}

export async function updateNoteTitle(noteId, title) {
  return window.electronAPI.updateNoteTitle(noteId, title);
}

export async function deleteNote(noteId) {
  return window.electronAPI.deleteNote(noteId);
}

export async function updateNoteNotebook(noteId, newNotebookId) {
  return window.electronAPI.updateNoteNotebook(noteId, newNotebookId);
}

export async function getDeletedNotes() {
  return window.electronAPI.getDeletedNotes();
}

export async function restoreNote(noteId) {
  return window.electronAPI.restoreNote(noteId);
}

export async function permanentlyDeleteNote(noteId) {
  return window.electronAPI.permanentlyDeleteNote(noteId);
}

// Image handling functions

export async function getImage(imageId) {
  try {
    return await window.electronAPI.getImage(imageId);
  } catch (error) {
    console.error(`Error fetching image ${imageId}:`, error);
    throw error;
  }
}

export async function saveImage(noteId, imageData, filename, mimeType) {
  try {
    return await window.electronAPI.saveImage(noteId, imageData, filename, mimeType);
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
}
