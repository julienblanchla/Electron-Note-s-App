const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const isDev = require('electron-is-dev');

// Global database connection
let db;

async function initDatabase() {
  try {
    // Open the SQLite database
    db = await open({
      filename: path.join(__dirname, 'notes.db'),
      driver: sqlite3.Database
    });
    
    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS notebooks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        notebook_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted BOOLEAN DEFAULT FALSE,
        FOREIGN KEY(notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        data BLOB NOT NULL,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
      );
    `);
    
    console.log('Database initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

console.log('Starting app...');
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function createWindow() {
  try {
    await initDatabase();
    
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false // Pour le développement seulement
      }
    });

    // In development, load from the dev server
    if (isDev) {
      console.log('Running in development mode');
      win.loadURL('http://localhost:3000');
      win.webContents.openDevTools();
    } else {
      console.log('Running in production mode');
      win.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    win.webContents.on('did-fail-load', (e, code, desc) => {
      console.error('Failed to load:', code, desc);
    });
  } catch (error) {
    console.error('Error creating window:', error);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers (Replace Tauri functions)
ipcMain.handle('getNotebooks', async () => {
  return await db.all('SELECT * FROM notebooks ORDER BY title');
});

ipcMain.handle('addNotebook', async (_, title) => {
  const uuid = `nb_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  await db.run('INSERT INTO notebooks (id, title) VALUES (?, ?)', uuid, title);
  return { id: uuid, title };
});

ipcMain.handle('deleteNotebook', async (_, id) => {
  await db.run('DELETE FROM notebooks WHERE id = ?', id);
  return true;
});

ipcMain.handle('getNotes', async (_, notebookId) => {
  return await db.all(
    'SELECT * FROM notes WHERE notebook_id = ? AND deleted = 0 ORDER BY updated_at DESC', 
    notebookId
  );
});

ipcMain.handle('addNote', async (_, title, notebookId) => {
  const uuid = `note_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  await db.run(
    'INSERT INTO notes (id, title, notebook_id) VALUES (?, ?, ?)',
    uuid, title, notebookId
  );
  return { 
    id: uuid, 
    title, 
    notebook_id: notebookId,
    content: '', 
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted: 0
  };
});

ipcMain.handle('updateNoteContent', async (_, noteId, content) => {
  await db.run(
    'UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    content, noteId
  );
  return true;
});

ipcMain.handle('updateNoteTitle', async (_, noteId, title) => {
  await db.run(
    'UPDATE notes SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    title, noteId
  );
  return true;
});

ipcMain.handle('deleteNote', async (_, noteId) => {
  await db.run('UPDATE notes SET deleted = 1 WHERE id = ?', noteId);
  return true;
});

ipcMain.handle('getDeletedNotes', async () => {
  return await db.all('SELECT * FROM notes WHERE deleted = 1');
});

ipcMain.handle('restoreNote', async (_, noteId) => {
  await db.run('UPDATE notes SET deleted = 0 WHERE id = ?', noteId);
  return true;
});

ipcMain.handle('permanentlyDeleteNote', async (_, noteId) => {
  await db.run('DELETE FROM notes WHERE id = ?', noteId);
  return true;
});

ipcMain.handle('updateNoteNotebook', async (_, noteId, newNotebookId) => {
  await db.run(
    'UPDATE notes SET notebook_id = ? WHERE id = ?',
    newNotebookId, noteId
  );
  return true;
});

ipcMain.handle('saveImage', async (_, noteId, imageData, name, type) => {
  const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const buffer = Buffer.from(imageData);
  
  await db.run(
    'INSERT INTO images (id, note_id, data, filename, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)',
    imageId, noteId, buffer, name, type, buffer.length
  );
  
  return imageId;
});

ipcMain.handle('getImage', async (_, imageId) => {
  const image = await db.get('SELECT data FROM images WHERE id = ?', imageId);
  return image ? image.data : null;
});
