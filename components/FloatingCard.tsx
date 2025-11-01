import React from 'react';
import { Card } from '../types';
import { getCardBackgroundColor } from '../utils/gameLogic';

interface FloatingCardProps {
    cardValue: Card;
    maxCardValue: number;
    position: { x: number; y: number };
}

const FloatingCard: React.FC<FloatingCardProps> = ({ cardValue, maxCardValue, position }) => {
    const isVisible = cardValue !== null;

    const style: React.CSSProperties = {
        left: `${position.x}px`,
        top: `${position.y}px`,
        ...getCardBackgroundColor(cardValue, maxCardValue)
    };

    return (
        <div id="floating-card" className={isVisible ? 'visible' : ''} style={style}>
            <div className="card-value w-full h-full">
                {cardValue}
            </div>
        </div>
    );
};

export default FloatingCard;