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
      
      html = html.replace(
        /<img src="image:\/\/([a-zA-Z0-9-]+)"([^>]*)>/g,
        (match, imageId, restAttributes) => {
          if (loadedImagesRef.current[imageId]) {
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
      const regex = /!\[.*?\]\(image:\/\/([a-zA-Z0-9-]+)\)/g;
      let match;
      const idsToLoad = [];
      
      while ((match = regex.exec(content)) !== null) {
        const id = match[1];
        if (!loadedImagesRef.current[id]) {
          idsToLoad.push(id);
        }
      }
      
      if (idsToLoad.length === 0) return;
      
      console.log(`Chargement de ${idsToLoad.length} nouvelles images`);
      
      try {
        // Removed dynamic import, use regular import instead
        let imagesLoaded = false;
        
        for (const imageId of idsToLoad) {
          try {
            console.log(`Chargement de l'image ${imageId}`);
            const imageData = await getImage(imageId);
            
            if (imageData && imageData.length > 0) {
              const blob = new Blob([imageData], { type: "image/png" });
              const url = URL.createObjectURL(blob);
              loadedImagesRef.current[imageId] = url;
              imagesLoaded = true;
            } else {
              console.warn(`Aucune donnée pour l'image ${imageId}`);
            }
          } catch (error) {
            console.error(`Erreur lors du chargement de l'image ${imageId}:`, error);
          }
        }
        
        if (imagesLoaded) {
          setForceRefresh(prev => prev + 1);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des images:", error);
      }
    };
    
    loadAllImages();
  }, [content]);

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
    if (!file.type.startsWith("image/")) {
      setImageError("Veuillez sélectionner une image valide");
      return;
    }
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setImageError("L'image est trop volumineuse (max 2Mo)");
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const imageData = Array.from(uint8Array);

      const imageId = await saveImage(selectedNote, imageData, file.name, file.type);
      const imageMarkdown = `![${file.name}](image://${imageId})`;
      console.log(`Markdown de l'image inséré: ${imageMarkdown}`);
      
      const blob = new Blob([uint8Array], { type: file.type });
      const url = URL.createObjectURL(blob);
      loadedImagesRef.current[imageId] = url;
      
      setForceRefresh(prev => prev + 1);

      const textarea = textareaRef.current;
      if (textarea) {
        const startPos = textarea.selectionStart;
        const endPos = textarea.selectionEnd;
        const newContent = content.substring(0, startPos) + imageMarkdown + content.substring(endPos);
        setContent(newContent);
        await handleUpdateNoteContent(selectedNote, newContent);
        lastManualSaveRef.current = newContent;
        setTimeout(() => {
          textarea.focus();
          const newCursorPos = startPos + imageMarkdown.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      } else {
        const newContent = content + "\n\n" + imageMarkdown;
        setContent(newContent);
        await handleUpdateNoteContent(selectedNote, newContent);
        lastManualSaveRef.current = newContent;
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Erreur lors de l'upload de l'image:", error);
      setImageError("Erreur lors de l'upload de l'image");
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

  return (
    <div className="flex-none min-w-0 p-4 flex flex-col bg-gray-800 overflow-hidden">
      {selectedNote ? (
        <>
          <div className="mb-4">
            {/* Formatting and image buttons container */}
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
