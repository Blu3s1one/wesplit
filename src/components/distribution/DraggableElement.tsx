import { useDraggable } from '@dnd-kit/core';
import type { Element as ElementType } from '../../db/schemas';

interface DraggableElementProps {
  element: ElementType;
}

export function DraggableElement({ element }: DraggableElementProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: element.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-2 bg-white dark:bg-gray-800 rounded border cursor-move hover:border-primary transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <p className="text-sm font-medium">{element.name}</p>
    </div>
  );
}
