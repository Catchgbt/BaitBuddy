import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Zap, Map, Cloud, Box, Circle, CheckCircle2 } from "lucide-react";
import CompactWeatherDisplay from "@/components/home/CompactWeatherDisplay";

const STATUS = {
  OPEN: 1,
  DONE: 2,
};

const tasks = [
  { id: 'wetter', label: 'Wetter-Check', icon: <Cloud className="w-5 h-5 text-blue-300" />, page: 'Weather' },
  { id: 'spots', label: 'Spots-Planung', icon: <Map className="w-5 h-5 text-green-300" />, page: 'Map' },
  { id: 'ausruestung', label: 'Ausrüstung packen', icon: <Box className="w-5 h-5 text-orange-300" />, page: 'Gear' },
  { id: 'ki', label: 'KI-Tipp einholen', icon: <Zap className="w-5 h-5 text-purple-300" />, page: 'AI' },
];

function ChecklistItem({ label, icon, page, status, onStatusChange }) {
  const isDone = status === STATUS.DONE;

  const cycleStatus = () => {
    onStatusChange(isDone ? STATUS.OPEN : STATUS.DONE);
  };
  
  const StatusIcon = isDone ? CheckCircle2 : Circle;

  return (
    <div className="flex items-center gap-4 rounded-xl bg-gray-800/50 p-3 border border-gray-700/50">
      <div className="flex-shrink-0">{icon}</div>
      <div className={`flex-1 text-white ${isDone ? 'line-through text-gray-400' : ''}`}>
        {label}
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="text-xs">
          <Link to={createPageUrl(page)}>Öffnen</Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={cycleStatus} className="text-gray-400 hover:text-white">
          <StatusIcon className={`w-5 h-5 ${isDone ? 'text-emerald-400' : 'text-gray-500'}`} />
        </Button>
      </div>
    </div>
  );
}

export default function StartSection() {
  const [taskStatuses, setTaskStatuses] = useState(() => {
    const initial = {};
    tasks.forEach(task => initial[task.id] = STATUS.OPEN);
    return initial;
  });

  const handleStatusChange = (id, newStatus) => {
    setTaskStatuses(prev => ({ ...prev, [id]: newStatus }));
  };
  
  const doneCount = Object.values(taskStatuses).filter(s => s === STATUS.DONE).length;
  const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Schnell-Check für deinen Trip</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-emerald-400">Fortschritt</span>
              <span className="text-sm text-gray-300">{doneCount} / {tasks.length} erledigt</span>
            </div>
            <div className="w-full bg-gray-700/50 rounded-full h-2.5">
              <div 
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          <div className="space-y-3">
            {tasks.map((task) => (
              <ChecklistItem
                key={task.id}
                label={task.label}
                icon={task.icon}
                page={task.page}
                status={taskStatuses[task.id]}
                onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">Live-Wetter am Standort</CardTitle>
        </CardHeader>
        <CardContent>
          <CompactWeatherDisplay />
        </CardContent>
      </Card>
    </div>
  );
}