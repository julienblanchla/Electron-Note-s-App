const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const isDev = require('electron-is-dev');
const fs = require('fs');

// Global database connection
let db;

function initDatabase() {
  try {
    // Déterminer le bon chemin de la base de données
    let dbPath;
    if (isDev) {
      dbPath = path.join(__dirname, 'notes.db');
    } else {
      dbPath = path.join(process.resourcesPath, 'notes.db');
    }
    
    console.log('Database path:', dbPath);
    
    // Ouvrir la base de données SQLite (synchrone avec better-sqlite3)
    db = new Database(dbPath, { 
      verbose: console.log 
    });
    
    // Create tables if they don't exist
    db.exec(`
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
        image_data BLOB NOT NULL,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
      );
    `);
    
    // Vérifier si des notebooks existent, sinon en créer un par défaut
    const notebookCount = db.prepare('SELECT COUNT(*) as count FROM notebooks').get();
    if (notebookCount.count === 0) {
      console.log('Creating default notebook');
      const notebookId = `nb_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      db.prepare('INSERT INTO notebooks (id, title) VALUES (?, ?)').run(notebookId, 'Mon Notebook');
    }
    
    console.log('Database initialized successfully');
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
    // Initialiser la base de données de manière synchrone
    initDatabase();
    
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

// Fermer proprement la connexion à la base de données
app.on('will-quit', () => {
  if (db) {
    console.log('Closing database connection...');
    db.close();
  }
});

// IPC handlers (avec better-sqlite3 - API synchrone)
ipcMain.handle('getNotebooks', () => {
  return db.prepare('SELECT * FROM notebooks ORDER BY title').all();
});

ipcMain.handle('addNotebook', (_, title) => {
  const uuid = `nb_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  db.prepare('INSERT INTO notebooks (id, title) VALUES (?, ?)').run(uuid, title);
  return { id: uuid, title };
});

ipcMain.handle('deleteNotebook', (_, id) => {
  db.prepare('DELETE FROM notebooks WHERE id = ?').run(id);
  return true;
});

ipcMain.handle('getNotes', (_, notebookId) => {
  return db.prepare(
    'SELECT * FROM notes WHERE notebook_id = ? AND deleted = 0 ORDER BY updated_at DESC'
  ).all(notebookId);
});

ipcMain.handle('addNote', (_, title, notebookId) => {
  const uuid = `note_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  db.prepare(
    'INSERT INTO notes (id, title, notebook_id) VALUES (?, ?, ?)'
  ).run(uuid, title, notebookId);
  
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

ipcMain.handle('updateNoteContent', (_, noteId, content) => {
  db.prepare(
    'UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(content, noteId);
  return true;
});

ipcMain.handle('updateNoteTitle', (_, noteId, title) => {
  db.prepare(
    'UPDATE notes SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(title, noteId);
  return true;
});

ipcMain.handle('deleteNote', (_, noteId) => {
  db.prepare('UPDATE notes SET deleted = 1 WHERE id = ?').run(noteId);
  return true;
});

ipcMain.handle('getDeletedNotes', () => {
  return db.prepare('SELECT * FROM notes WHERE deleted = 1').all();
});

ipcMain.handle('restoreNote', (_, noteId) => {
  db.prepare('UPDATE notes SET deleted = 0 WHERE id = ?').run(noteId);
  return true;
});

ipcMain.handle('permanentlyDeleteNote', (_, noteId) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(noteId);
  return true;
});

ipcMain.handle('updateNoteNotebook', (_, noteId, newNotebookId) => {
  db.prepare(
    'UPDATE notes SET notebook_id = ? WHERE id = ?'
  ).run(newNotebookId, noteId);
  return true;
});

ipcMain.handle('saveImage', (_, noteId, imageData, name, type) => {
  try {
    console.log(`Sauvegarde d'image pour la note ${noteId}, taille: ${imageData.length} octets, type: ${type}`);
    
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Convertir le tableau en Buffer pour better-sqlite3
    const buffer = Buffer.from(imageData);
    
    console.log(`Buffer créé avec succès, taille: ${buffer.length} octets`);
    
    // Vérifier si la table a bien une colonne image_data de type BLOB
    const tableInfo = db.prepare('PRAGMA table_info(images)').all();
    console.log('Structure de la table images:', tableInfo);
    
    // Utilisez image_data au lieu de data
    const stmt = db.prepare(
      'INSERT INTO images (id, note_id, image_data, filename, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)'
    );
    
    stmt.run(imageId, noteId, buffer, name, type, buffer.length);
    
    console.log(`Image ${imageId} sauvegardée avec succès`);
    return imageId;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'image:', error);
    throw error;
  }
});

ipcMain.handle('getImage', (_, imageId) => {
  try {
    console.log(`Récupération de l'image ${imageId}`);
    // Utilisez image_data au lieu de data
    const image = db.prepare('SELECT image_data FROM images WHERE id = ?').get(imageId);
    
    if (!image) {
      console.log(`Aucune image trouvée avec l'ID ${imageId}`);
      return null;
    }
    
    console.log(`Image ${imageId} récupérée, taille: ${image.image_data ? image.image_data.length : 0} octets`);
    return image.image_data;
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'image ${imageId}:`, error);
    throw error;
  }
});
