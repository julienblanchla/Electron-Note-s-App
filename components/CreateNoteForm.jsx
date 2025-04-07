// src/components/CreateNoteForm.jsx
import React, { useState } from "react";
import { useAppContext } from "../AppContext"; // Updated import path

const CreateNoteForm = () => {
  const { addNote, closeCreateNoteModal } = useAppContext();
  const [title, setTitle] = useState("");

  const handleBlur = () => {
    if (title.trim() !== "") {
      addNote(title);
    }
    closeCreateNoteModal?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (title.trim() !== "") {
        addNote(title);
      }
      closeCreateNoteModal?.();
    }
  };

  return (
    <input
      type="text"
      placeholder="Titre de la note"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring focus:border-green-300 mb-2"
      autoFocus
    />
  );
};

export default CreateNoteForm;
