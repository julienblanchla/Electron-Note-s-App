// src/components/CreateNotebookForm.jsx
import React, { useState } from "react";
import { useAppContext } from "../AppContext";

const CreateNotebookForm = () => {
  const { addNotebook } = useAppContext();
  const [title, setTitle] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addNotebook(title);
    setTitle("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2 mb-4">
      <input
        type="text"
        placeholder="Titre du notebook"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring focus:border-blue-300"
      />
      <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
        Créer
      </button>
    </form>
  );
};

export default CreateNotebookForm;
