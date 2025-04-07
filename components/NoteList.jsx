// src/components/NoteList.jsx
import React, { useState, useEffect } from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { useAppContext } from "../AppContext"; // Updated import path
import NoteListHeader from "./NoteListHeader";

const NoteList = () => {
  const { notes, selectedNote, selectNote, deleteNote, selectedNotebook } = useAppContext();
  const [contextMenu, setContextMenu] = useState(null);

  // Hide context menu when clicking anywhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleContextMenu = (e, noteId) => {
    e.preventDefault();
    setContextMenu({ noteId, x: e.clientX, y: e.clientY });
  };

  const handleDelete = () => {
    if (contextMenu && contextMenu.noteId) {
      deleteNote(contextMenu.noteId);
      setContextMenu(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 min-w-0 bg-gray-700 text-white flex flex-col relative">
      <NoteListHeader />
      <Droppable droppableId={`notes-${selectedNotebook}`}>
        {(provided) => (
          <ul 
            className="space-y-2 overflow-y-auto p-2" 
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {notes.map((note, index) => (
              <Draggable key={note.id} draggableId={String(note.id)} index={index}>
                {(provided) => (
                  <li
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onContextMenu={(e) => handleContextMenu(e, note.id)}
                    className={`cursor-pointer px-2 py-1 hover:bg-gray-600 ${
                      note.id === selectedNote ? "bg-gray-500 text-white" : ""
                    }`}
                  >
                    {/* Replaced button with a div so the entire area is draggable */}
                    <div
                      role="button"
                      tabIndex="0"
                      onClick={() => selectNote(note.id)}
                      onKeyDown={(e) => e.key === 'Enter' && selectNote(note.id)}
                      className="w-full text-left"
                    >
                      <div className="flex flex-col">
                        <div className="text-white font-medium">
                          {note.title || "(Sans titre)"}
                        </div>
                        <span>Modifié le: {formatDate(note.updated_at)}</span>
                      </div>
                    </div>
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
      {contextMenu && (
        <div
          className="fixed bg-white text-black border border-gray-300 rounded shadow-lg z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handleDelete}
            className="block px-4 py-2 hover:bg-gray-200 w-full text-left"
          >
            Delete note
          </button>
        </div>
      )}
    </div>
  );
};

export default NoteList;
