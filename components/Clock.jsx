import React from 'react';
import { useAppContext } from "../AppContext"; // Updated import path

const Clock = () => {
  const { selectedNote, notes } = useAppContext();
  const noteObj = notes.find((n) => n.id === selectedNote) || {};

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

  const createdAt = formatDate(noteObj.created_at);
  const updatedAt = formatDate(noteObj.updated_at);

  return (
    <div className="text-white text-right text-sm">
      {selectedNote ? (
        <div className="space-y-1">
          <div className="flex items-center justify-end gap-2">
            <span className="text-gray-400">Créée le:</span>
            <span>{createdAt}</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-gray-400">Modifiée le:</span>
            <span>{updatedAt}</span>
          </div>
        </div>
      ) : (
        <span className="text-gray-400">Sélectionnez une note</span>
      )}
    </div>
  );
};

export default Clock;
