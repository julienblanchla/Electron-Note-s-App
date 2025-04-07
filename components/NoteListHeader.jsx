// src/components/NoteListHeader.jsx
import React, { useState } from "react";
import { useAppContext } from "../AppContext"; // Updated import path

const NoteListHeader = () => {
  const { createEmptyNote, sortNotesByTitle, sortNotesByDate } = useAppContext();
  const [isAscending, setIsAscending] = useState(true);
  const [creationAscending, setCreationAscending] = useState(true);
  const [modificationAscending, setModificationAscending] = useState(true);

  const handleTitleSort = () => {
    sortNotesByTitle();
    setIsAscending(!isAscending);
  };

  const handleCreationSort = () => {
    sortNotesByDate('created_at');
    setCreationAscending(!creationAscending);
  };

  const handleModificationSort = () => {
    sortNotesByDate('updated_at');
    setModificationAscending(!modificationAscending);
  };

  return (
    <div className="flex items-center justify-between p-2 bg-gray-700 space-x-2">
      <button
        onClick={createEmptyNote}
        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
      >
        + Nouvelle note
      </button>

      <div className="flex gap-2">
        <button
          onClick={handleTitleSort}
          className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 px-3 py-1 rounded flex items-center gap-2"
        >
          <span>{isAscending ? "🔤" : "🔤↓"}</span>
        </button>
        <button
          onClick={handleCreationSort}
          className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 px-3 py-1 rounded flex items-center gap-2"
          title="Trier par date de création"
        >
          <span>{creationAscending ? "📅" : "📅↓"}</span>
        </button>
        <button
          onClick={handleModificationSort}
          className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 px-3 py-1 rounded flex items-center gap-2"
          title="Trier par date de modification"
        >
          <span>{modificationAscending ? "✏️" : "✏️↓"}</span>
        </button>
      </div>
    </div>
  );
};

export default NoteListHeader;
