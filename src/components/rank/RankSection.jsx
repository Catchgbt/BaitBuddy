
import React, { useEffect, useMemo, useState } from "react";
import { LeaderboardEntry, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy } from "lucide-react";

function formatName(u) {
  return u?.nickname || (u?.email ? u.email.split("@")[0] : "Angler");
}

export default function RankSection() {
  const [period, setPeriod] = useState("daily");
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => { (async () => {
    try {
      const e = await LeaderboardEntry.filter({ period }, "-points", 100);
      setEntries(e);
    } catch {
      setEntries([]);
    }
    try {
      setUsers(await User.list());
    } catch {
      setUsers([]);
    }
  })(); }, [period]);

  const byUser = useMemo(() => {
    const map = new Map();
    users.forEach(u => map.set(u.id, u));
    return map;
  }, [users]);

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" /> Ranking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 items-center mb-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700 text-white"><SelectValue placeholder="Zeitraum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Heute</SelectItem>
              <SelectItem value="monthly">Monat</SelectItem>
              <SelectItem value="all_time">All-Time</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">{entries.length} Einträge</Badge>
        </div>
        <div className="space-y-2">
          {entries.length === 0 && <div className="text-gray-400">Noch keine Ranking-Daten.</div>}
          {entries.map((e, idx) => (
            <div key={e.id} className="p-3 rounded-xl bg-gray-800/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center">{idx+1}</div>
                <div className="text-white">{formatName(byUser.get(e.user_id) || {})}</div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{e.points} Punkte</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
