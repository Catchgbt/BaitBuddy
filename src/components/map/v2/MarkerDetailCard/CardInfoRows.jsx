import React from 'react';

function CardInfoRows({ infos = [] }) {
  if (!infos || infos.length === 0) return null;

  return (
    <div className="space-y-2">
      {infos.map((info, index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
        >
          {/* Icon */}
          <div className="text-xl flex-shrink-0 pt-0.5">
            {info.icon || '•'}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {info.label && (
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {info.label}
              </div>
            )}
            <div className="text-sm text-gray-200 break-words">
              {Array.isArray(info.value) ? (
                <ul className="mt-1 space-y-1">
                  {info.value.map((item, i) => (
                    <li key={i} className="text-xs">
                      • {item}
                    </li>
                  ))}
                </ul>
              ) : (
                info.value
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CardInfoRows;
