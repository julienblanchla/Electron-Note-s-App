// src/components/NoteEditor.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import * as Showdown from "showdown";
import { useAppContext } from "../AppContext"; // Updated import path
import { getImage } from "../services/api"; // Use direct import instead of dynamic

const NoteEditor = () => {
  const { selectedNote, notes, updateNoteContent, updateNoteTitle, saveImage } = useAppContext();
  
  const noteObj = notes.find((n) => n.id === selectedNote) || {};
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const loadedImagesRef = useRef({});
  const [forceRefresh, setForceRefresh] = useState(0);

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [imageError, setImageError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const lastManualSaveRef = useRef("");

  const converter = new Showdown.Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true,
  });

  const wrapSelectedText = (before, after) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);

    const newText = before + selectedText + after;
    const newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = start + before.length;
      textareaRef.current.selectionEnd = end + before.length;
    }, 0);
  };

  const renderMarkdown = useCallback((text) => {
    try {
      let html = converter.makeHtml(text || '');
      
      // Remplacer les URLs d'images avec les données chargées
      html = html.replace(
        /<img src="image:\/\/([a-zA-Z0-9-_]+)"([^>]*)>/g,
        (match, imageId, restAttributes) => {
          if (loadedImagesRef.current[imageId]) {
            console.log(`Affichage de l'image ${imageId} avec URL:`, 
                       loadedImagesRef.current[imageId].substring(0, 30) + '...');
            return `<img src="${loadedImagesRef.current[imageId]}" class="db-image" ${restAttributes}>`;
          }
          return `<img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23aaa' stroke-width='2'><rect x='3' y='3' width='18' height='18' rx='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>" data-image-id="${imageId}" class="db-image image-loading" ${restAttributes}>`;
        }
      );
      
      return html;
    } catch (error) {
      console.error("Erreur lors de la conversion Markdown:", error);
      return `<div class="text-red-500">Erreur lors de la conversion Markdown: ${error.message}</div>`;
    }
  }, [converter, forceRefresh]);

  useEffect(() => {
    setContent(noteObj.content || "");
    setTitle(noteObj.title || "");
    hasInitializedRef.current = true;
    setForceRefresh((prev) => prev + 1);
  }, [selectedNote]);

  useEffect(() => {
    return () => {};
  }, [selectedNote]);

  useEffect(() => {
    return () => {
      Object.values(loadedImagesRef.current).forEach(url => {
        URL.revokeObjectURL(url);
      });
      loadedImagesRef.current = {};
    };
  }, []);

  useEffect(() => {
    const loadAllImages = async () => {
      if (!content) return;
      
      // Trouver toutes les références d'images dans le contenu markdown
      const regex = /!\[.*?\]\(image:\/\/([a-zA-Z0-9-_]+)\)/g;
      let match;
      const idsToLoad = [];
      
      while ((match = regex.exec(content)) !== null) {
        const id = match[1];
        if (!loadedImagesRef.current[id]) {
          idsToLoad.push(id);
        }
      }
      
      if (idsToLoad.length === 0) return;
      
      console.log(`Chargement de ${idsToLoad.length} images`);
      
      for (const imageId of idsToLoad) {
        try {
          console.log(`Tentative de chargement de l'image ${imageId}`);
          const imageData = await window.electronAPI.getImage(imageId);
          
          // Déboguer le format des données retournées
          console.log(`Image reçue - type:`, typeof imageData, 
                      `taille:`, imageData ? imageData.length : 0,
                      `est un tableau:`, Array.isArray(imageData));
          
          if (imageData && imageData.length > 0) {
            // Convertir les données en Uint8Array pour créer un Blob
            const uint8Array = new Uint8Array(imageData);
            const blob = new Blob([uint8Array]);
            const url = URL.createObjectURL(blob);
            
            loadedImagesRef.current[imageId] = url;
            console.log(`Image ${imageId} chargée avec succès`);
            
            // Forcer un rafraîchissement
            setForceRefresh(prev => prev + 1);
          } else {
            console.warn(`Aucune donnée pour l'image ${imageId}`);
          }
        } catch (error) {
          console.error(`Erreur lors du chargement de l'image ${imageId}:`, error);
        }
      }
    };
    
    if (selectedNote) {
      loadAllImages();
    }
  }, [content, selectedNote, getImage]);

  useEffect(() => {
    if (!selectedNote) return;
    const timeoutId = setTimeout(() => {
      handleUpdateNoteContent(selectedNote, content);
      lastManualSaveRef.current = content;
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [content, selectedNote]);

  useEffect(() => {
    if (!selectedNote) return;
    const timeoutId = setTimeout(() => {
      updateNoteTitle(selectedNote, title);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [title, selectedNote, updateNoteTitle]);

  const handleUpdateNoteContent = async (noteId, content) => {
    try {
      setIsSaving(true);
      await updateNoteContent(noteId, content);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImageError("");
    
    try {
      // Validation
      if (!file.type.startsWith("image/")) {
        setImageError("Veuillez sélectionner une image valide");
        return;
      }
      
      const MAX_SIZE = 2 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        setImageError("L'image est trop volumineuse (max 2Mo)");
        return;
      }
      
      console.log(`Traitement de l'image: ${file.name}, type: ${file.type}, taille: ${file.size} octets`);
      
      // Optimiser la lecture du fichier
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Créer un tableau normal pour transmission IPC (évite les références circulaires)
      const imageData = Array.from(uint8Array);
      
      console.log(`Envoi de l'image au processus principal, taille: ${imageData.length} octets`);
      
      // Sauvegarder l'image
      const imageId = await saveImage(selectedNote, imageData, file.name, file.type);
      console.log(`Image sauvegardée avec ID: ${imageId}`);
      
      // Créer le markdown pour l'image
      const imageMarkdown = `![${file.name}](image://${imageId})`;
      
      // Stocker l'image dans le cache local pour affichage immédiat
      const blob = new Blob([uint8Array], { type: file.type });
      const url = URL.createObjectURL(blob);
      loadedImagesRef.current[imageId] = url;
      console.log(`Image ${imageId} mise en cache immédiatement avec URL: ${url.substring(0, 30)}...`);
      
      // Mettre à jour le contenu avec l'image
      if (textareaRef.current) {
        const startPos = textareaRef.current.selectionStart;
        const endPos = textareaRef.current.selectionEnd;
        const newContent = content.substring(0, startPos) + imageMarkdown + content.substring(endPos);
        setContent(newContent);
        
        // Forcer une sauvegarde immédiate
        await updateNoteContent(selectedNote, newContent);
        
        // Mettre à jour la position du curseur
        setTimeout(() => {
          textareaRef.current.focus();
          const newCursorPos = startPos + imageMarkdown.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      } else {
        const newContent = content + "\n\n" + imageMarkdown;
        setContent(newContent);
        await updateNoteContent(selectedNote, newContent);
      }
      
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Forcer le rafraîchissement
      setForceRefresh(prev => prev + 1);
      
    } catch (error) {
      console.error("Erreur lors de l'upload de l'image:", error);
      setImageError(`Erreur: ${error.message || "Problème lors de l'upload"}`);
    }
  };

  const handleTabIndent = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + "    " + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.selectionStart = start + 4;
        textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  // Ajouter cet effet après les autres pour surveiller l'état des images chargées
  useEffect(() => {
    // Vérifier si le contenu contient des images
    const regex = /!\[.*?\]\(image:\/\/([a-zA-Z0-9-_]+)\)/g;
    let match;
    let hasImages = false;
    const loadedIds = [];
    
    // Vérifier quelles images sont dans le contenu
    while ((match = regex.exec(content)) !== null) {
      hasImages = true;
      const id = match[1];
      if (loadedImagesRef.current[id]) {
        loadedIds.push(id);
      }
    }
    
    // Seulement log si des images sont présentes
    if (hasImages) {
      console.log(`Contenu avec ${loadedIds.length} images chargées`);
      if (selectedNote) {
        console.log('État des images:', Object.keys(loadedImagesRef.current).length);
      }
    }
  }, [content, selectedNote, forceRefresh]);

  return (
    <div className="flex-none min-w-0 p-4 flex flex-col bg-gray-800 overflow-hidden">
      {selectedNote ? (
        <>
          <div className="mb-4">
            {/* Champ de titre amélioré */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-2 text-xl font-semibold rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 border-b-2 border-blue-500"
              placeholder="Cliquez pour modifier le titre de la note..."
              aria-label="Titre de la note"
            />
            
            {/* Indicateur de sauvegarde */}
            <div className="text-xs text-gray-400 mb-2 flex items-center">
              {isSaving ? (
                <span className="text-yellow-400 flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sauvegarde en cours...
                </span>
              ) : (
                <span className="text-green-400">Note sauvegardée</span>
              )}
            </div>
            
            {/* Barre d'outils existante */}
            <div className="flex mb-2 space-x-2">
              <button
                onClick={() => wrapSelectedText("**", "**")}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
                title="Bold"
              >
                B
              </button>
              <button
                onClick={() => wrapSelectedText("*", "*")}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded italic"
                title="Italic"
              >
                I
              </button>
              <button
                onClick={() => wrapSelectedText("~~", "~~")}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded line-through"
                title="Strikethrough"
              >
                S
              </button>
              <button
                onClick={() => wrapSelectedText("`", "`")}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded font-mono"
                title="Code"
              >
                Code
              </button>
              <button
                onClick={() => wrapSelectedText("\n```\n", "\n```")}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded font-mono"
                title="Code Block"
              >
                Bloc
              </button>
              <button
                onClick={handleImageUpload}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded flex items-center gap-1"
                title="Insert image (max 2MB)"
              >
                <span>📷</span>
                <span>Image</span>
              </button>
            </div>

            {/* Info button and error messages */}
            <div className="flex justify-between items-center">
              {imageError && <div className="text-red-500 text-xs mt-1">{imageError}</div>}
            </div>
          </div>

          <div className="flex-1 flex space-x-4 min-h-0">
            <div className="flex-1 flex flex-col border border-gray-700 rounded overflow-hidden">
              <div className="bg-gray-700 text-white px-3 py-1 text-sm font-medium">✍️ Éditeur</div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleTabIndent}
                className="flex-1 p-4 bg-gray-900 text-white resize-none focus:outline-none font-mono text-sm"
                placeholder="Écrivez votre note ici en Markdown..."
              />
            </div>

            <div className="flex-1 flex flex-col border border-gray-700 rounded overflow-hidden">
              <div className="bg-gray-700 text-white px-3 py-1 text-sm font-medium">
                👀 Prévisualisation
              </div>
              <div
                id="markdown-preview"
                className="flex-1 p-4 bg-gray-900 text-white overflow-auto markdown-body"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                key={`preview-${forceRefresh}`}
              />
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*"
          />

          {isSaving && (
            <div className="absolute bottom-4 right-4 bg-gray-700 text-white px-2 py-1 rounded text-sm">
              Sauvegarde en cours...
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-white">
          Sélectionnez une note pour commencer
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
