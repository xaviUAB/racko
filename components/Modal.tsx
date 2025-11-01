import React from 'react';

interface ModalProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onClose: () => void;
    isOpen: boolean;
}

const Modal: React.FC<ModalProps> = ({ title, message, confirmText, cancelText, onConfirm, onClose, isOpen }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300 animate-fadeIn">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 transform transition-all duration-300 animate-scaleIn">
                <h4 className={`text-2xl font-bold mb-3 ${onConfirm ? 'text-red-600' : 'text-indigo-600'}`}>{title}</h4>
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{message}</p>
                <div className="flex flex-col space-y-2">
                    {onConfirm && (
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className="w-full py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                            {confirmText || 'Confirmar'}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                        {cancelText || 'Tancar'}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
                .animate-scaleIn { animation: scaleIn 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default Modal;