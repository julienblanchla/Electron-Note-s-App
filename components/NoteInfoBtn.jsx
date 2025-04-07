import { useState } from "react";
import PropTypes from 'prop-types';

export default function NoteInfoBtn({ title, content, triggerText }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Bouton discret pour ouvrir la modal */}
      <button
        onClick={() => setIsOpen(true)}
        className="text-blue-500 text-sm hover:underline"
      >
        {triggerText}
      </button>

      {isOpen && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-white border border-gray-300 rounded-md shadow-lg w-80 z-50">
          {/* Barre de titre de la modal */}
          <div className="bg-gray-200 px-3 py-2 rounded-t-md flex justify-between items-center">
            <span className="font-semibold">{title}</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-600 hover:text-red-500 text-lg font-bold"
            >
              ✖
            </button>
          </div>

          {/* Contenu de la modal */}
          <div className="p-4 text-sm text-gray-800 whitespace-pre-wrap">
            {content}
          </div>
        </div>
      )}
    </>
  );
}

NoteInfoBtn.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.node.isRequired,
  triggerText: PropTypes.string.isRequired
};
