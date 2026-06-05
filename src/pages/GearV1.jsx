
import React, { useEffect, useMemo, useState } from "react";
import { GearCategory } from "@/entities/GearCategory";
import { GearItem } from "@/entities/GearItem";
import { Loadout } from "@/entities/Loadout";
import { PackSession } from "@/entities/PackSession";
import { GearRule } from "@/entities/GearRule";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, CheckSquare, Square, ChevronDown, ChevronRight, ShieldAlert, Save, ScanLine } from "lucide-react";

export default function GearV1() {
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [openCatIds, setOpenCatIds] = useState({});
  const [activeSession, setActiveSession] = useState(null); // PackSession
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", categoryId: "", qty: 1, unit: "stk", condition: "ok" });

  // NEW: filters + dialogs + rules
  const [filters, setFilters] = useState({ species: null, method: null, water: null, season: null, time: null, category: null });
  const [rules, setRules] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState({ missing: [], low: [], forbidden: [], warnings: [] });
  const [showSave, setShowSave] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: "", species: [], method: "Grund", water: "See", season: "Sommer", time: "Tag" });

  const speciesOptions = ["Karpfen","Hecht","Zander","Barsch"];
  const methodOptions = ["Grund","Spinn","Jig","Float"];
  const waterOptions = ["See","Fluss","Kanal","Meer"];
  const seasonOptions = ["Frühling","Sommer","Herbst","Winter"];
  const timeOptions = ["Morgen","Tag","Abend","Nacht"];

  const loadAll = async () => {
    const [c, it] = await Promise.all([GearCategory.list("name"), GearItem.list("-updated_date")]);
    setCats(c);
    setItems(it);
    // try to load open session
    const sessions = await PackSession.filter({ status: "open" }, "-updated_date", 1);
    setActiveSession(sessions[0] || null);
    try { setRules(await GearRule.list()); } catch { setRules([]); } // Load rules
  };

  useEffect(() => { loadAll(); }, []);

  // NEW: bootstrap seeds once (items, rules, loadouts)
  useEffect(() => {
    (async () => {
      // Categories already seeded earlier; ensure a few default items/rules/loadouts
      const itemCount = (await GearItem.list()).length;
      if (itemCount === 0) {
        const catByName = (n) => cats.find(c => c.name === n)?.id;
        const base = [
          { n: "Karpfenrute 3,5lbs", cat: "Ruten" },
          { n: "5000er Rolle", cat: "Rollen" },
          { n: "Mono 0,35mm", cat: "Schnüre" },
          { n: "Haken Gr.4", cat: "Vorfach/Haken" },
          { n: "Boilies 20mm", cat: "Köder" },
          { n: "Method-Feeder 60g", cat: "Bleie/Feeder" },
          { n: "Zange", cat: "Werkzeug" },
          { n: "Messer", cat: "Werkzeug" },
          { n: "Kescher", cat: "Landung" },
          { n: "Abhakmatte", cat: "Landung" },
          { n: "Stuhl", cat: "Komfort" },
          { n: "Brolly/Schirm", cat: "Komfort" },
          { n: "Powerbank 20k", cat: "Elektronik" },
          { n: "Kopflampe", cat: "Elektronik" },
          { n: "Deeper", cat: "Elektronik" },
          { n: "Erste Hilfe Set", cat: "Sicherheit" },
          { n: "Angelschein", cat: "Papiere/Lizenzen" },
          { n: "Müllbeutel", cat: "Sonstiges" },
          { n: "Stahlvorfach", cat: "Vorfach/Haken" }
        ];
        for (const it of base) {
          const categoryId = catByName(it.cat) || null;
          await GearItem.create({
            name: it.n, categoryId, qty: 1, unit: "stk", weight_g: 0, notes: "", tags: [],
            condition: "ok", requiredFor: { species: [], methods: [], waters: [], seasons: [], times: [] }, optional: {}
          });
        }
      }

      const ruleCount = (await GearRule.list()).length;
      if (ruleCount === 0) {
        const kescher = (await GearItem.filter({ name: "Kescher" }))[0];
        const matte = (await GearItem.filter({ name: "Abhakmatte" }))[0];
        const stahl = (await GearItem.filter({ name: "Stahlvorfach" }))[0];

        await GearRule.bulkCreate([
          {
            name: "Karpfen Grund See",
            applies: { species: ["Karpfen"], method: ["Grund"], water: ["See"], season: [], time: [] },
            requires: [
              ...(kescher ? [{ refType: "item", refId: kescher.id, qty: 1 }] : []),
              ...(matte ? [{ refType: "item", refId: matte.id, qty: 1 }] : [])
            ],
            forbidden: [],
            notes: "Hakenlöser mitführen"
          },
          {
            name: "Hecht Spinn Fluss",
            applies: { species: ["Hecht"], method: ["Spinn"], water: ["Fluss"], season: [], time: [] },
            requires: stahl ? [{ refType: "item", refId: stahl.id, qty: 1 }] : [],
            forbidden: [],
            notes: "Stahl/Titan Pflicht"
          },
          {
            name: "Zander Jig Kanal",
            applies: { species: ["Zander"], method: ["Jig"], water: ["Kanal"], season: [], time: [] },
            requires: [],
            forbidden: [],
            notes: "Fluoro 0,30–0,35; Jigs 10–21g empfohlen"
          }
        ]);
      }

      const loadoutCount = (await Loadout.list()).length;
      if (loadoutCount === 0) {
        const byName = async (n) => (await GearItem.filter({ name: n }))[0]?.id;
        const fromNames = async (arr) => {
          const out = [];
          for (const n of arr) { const id = await byName(n); if (id) out.push({ itemId: id, qty: 1 }); }
          return out;
        };
        await Loadout.bulkCreate([
          { name: "Karpfen See",
            items: await fromNames(["Karpfenrute 3,5lbs","5000er Rolle","Mono 0,35mm","Boilies 20mm","Kescher","Abhakmatte","Zange","Messer","Stuhl","Brolly/Schirm"]),
            meta: { species: ["Karpfen"], method: "Grund", water: "See", season: "Sommer", time: "Tag" } },
          { name: "Hecht Spinn Fluss",
            items: await fromNames(["5000er Rolle","Zange","Kopflampe","Powerbank 20k","Kescher","Stahlvorfach"]),
            meta: { species: ["Hecht"], method: "Spinn", water: "Fluss", season: "Herbst", time: "Morgen" } },
          { name: "Zander Jig Kanal",
            items: await fromNames(["5000er Rolle","Zange","Kopflampe","Powerbank 20k"]),
            meta: { species: ["Zander"], method: "Jig", water: "Kanal", season: "Herbst", time: "Abend" } }
        ]);
      }

      // reload after seeds
      await loadAll();
    })();
     
  }, [cats.length]); // after categories loaded

  const itemsByCat = useMemo(() => {
    const map = new Map();
    cats.forEach(c => map.set(c.id, []));
    items
      .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
      .filter(i => !filters.category || i.categoryId === filters.category)
      .forEach(i => {
        if (map.has(i.categoryId)) map.get(i.categoryId).push(i);
        else {
          // items ohne Kategorie als eigene Gruppe "Sonstiges"
          if (!map.get("uncat")) map.set("uncat", []);
          map.get("uncat").push(i);
        }
      });
    return map;
  }, [cats, items, search, filters.category]);

  const toggleCat = (id) => setOpenCatIds(prev => ({ ...prev, [id]: !prev[id] }));

  const isPacked = (itemId) => {
    if (!activeSession) return false;
    const found = (activeSession.items || []).find(x => x.itemId === itemId);
    return (found?.packedQty || 0) > 0;
  };

  const ensureSession = async () => {
    if (activeSession) return activeSession;
    const s = await PackSession.create({ items: [], status: "open" });
    setActiveSession(s);
    return s;
  };

  const togglePack = async (item) => {
    const sess = await ensureSession();
    const list = [...(sess.items || [])];
    const idx = list.findIndex(x => x.itemId === item.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], packedQty: list[idx].packedQty > 0 ? 0 : 1 };
    } else {
      list.push({ itemId: item.id, packedQty: 1 });
    }
    const updated = await PackSession.update(sess.id, { items: list });
    setActiveSession(updated);
  };

  const doneCount = useMemo(() => (activeSession?.items || []).filter(x => x.packedQty > 0).length, [activeSession]);
  const totalCount = useMemo(() => (activeSession?.items || []).length, [activeSession]);

  const addItem = async () => {
    if (!form.name.trim()) return;
    const payload = { ...form, qty: Number(form.qty) || 1 };
    await GearItem.create(payload);
    setForm({ name: "", categoryId: "", qty: 1, unit: "stk", condition: "ok" });
    setAdding(false);
    loadAll();
  };

  // NEW: compute validation report
  const computeReport = async () => {
    if (!activeSession) { setReport({ missing: [], low: [], forbidden: [], warnings: [] }); setShowReport(true); return; }

    const sess = await PackSession.get(activeSession.id); // Get latest session data
    const current = new Map((sess.items || []).map(i => [i.itemId, i.packedQty || 0]));

    // Derive a meta context from user choices (filters as proxy)
    const meta = {
      species: filters.species ? [filters.species] : [],
      method: filters.method || "Grund",
      water: filters.water || "See",
      season: filters.season || "Sommer",
      time: filters.time || "Tag"
    };

    const applicable = (rules || []).filter(r => {
      const ap = r.applies || {};
      const matchList = (val, arr) => {
        if (!arr || arr.length === 0) return true; // Rule applies if no specific criteria is set for this field
        if (Array.isArray(val)) {
          return val.some(v => arr.includes(v)); // Check if any of the meta species match rule species
        }
        return arr.includes(val); // Check if single meta value matches rule values
      };

      return (
        matchList(meta.species, ap.species) &&
        matchList(meta.method, ap.method) &&
        matchList(meta.water, ap.water) &&
        matchList(meta.season, ap.season) &&
        matchList(meta.time, ap.time)
      );
    });

    // build helper lookups
    const itemsAll = items; // Using the state `items` directly
    const itemsById = new Map(itemsAll.map(i => [i.id, i]));
    const sumQtyInCategory = (catId) => (sess.items || []).reduce((acc, i) => {
      const it = itemsById.get(i.itemId);
      return acc + ((it?.categoryId === catId) ? (i.packedQty || 0) : 0);
    }, 0);

    // missing
    const requiresFlat = applicable.flatMap(r => r.requires || []);
    const missing = requiresFlat
      .filter(req => {
        const need = req.qty || 1;
        if (req.refType === "item") return (current.get(req.refId) || 0) < need;
        if (req.refType === "category") return sumQtyInCategory(req.refId) < need;
        return false;
      })
      .map(req => ({ type: req.refType, refId: req.refId, need: req.qty || 1 }));

    // forbidden
    const forbiddenIds = new Set(applicable.flatMap(r => r.forbidden || []));
    const forbidden = [...forbiddenIds].filter(fid => (current.get(fid) || 0) > 0);

    // low
    const low = (sess.items || []).filter(si => {
      const it = itemsById.get(si.itemId);
      const min = it?.optional?.minQty ?? 0; // Default to 0 if minQty not set, so anything >0 is fine
      return (si.packedQty || 0) > 0 && (si.packedQty || 0) < min; // Only if packed, check if below min
    }).map(si => ({ itemId: si.itemId }));

    // warnings (collect notes)
    const warnings = applicable.map(r => r.notes).filter(Boolean);

    setReport({ missing, low, forbidden, warnings });
    setShowReport(true);
  };

  // NEW: save loadout from current session
  const saveCurrentAsLoadout = async () => {
    if (!activeSession || !saveForm.name.trim()) return;
    const sess = await PackSession.get(activeSession.id);
    const baseItems = (sess.items || []).map(i => ({ itemId: i.itemId, qty: i.packedQty > 0 ? i.packedQty : 1 }));
    await Loadout.create({
      name: saveForm.name,
      items: baseItems,
      meta: { species: saveForm.species, method: saveForm.method, water: saveForm.water, season: saveForm.season, time: saveForm.time }
    });
    setShowSave(false);
    // Optionally, reset saveForm or give feedback
    setSaveForm({ name: "", species: [], method: "Grund", water: "See", season: "Sommer", time: "Tag" });
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <Card className="glass-morphism border-gray-800 rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Ausrüstung v1</CardTitle>
              <div className="flex gap-2">
                <Input
                  value={search}
                  onChange={(e)=>setSearch(e.target.value)}
                  placeholder="Suche"
                  className="bg-gray-800/50 border-gray-700 text-white w-40 sm:w-56"
                />
                <Button onClick={()=>setAdding(a=>!a)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-1" /> Hinzufügen
                </Button>
              </div>
            </div>
            {/* NEW: Filter chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Select value={filters.category || ""} onValueChange={(v)=>setFilters(f=>({...f, category: v||null}))}>
                <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Alle</SelectItem>
                  {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.species || ""} onValueChange={(v)=>setFilters(f=>({...f, species: v||null}))}>
                <SelectTrigger className="w-36 bg-gray-800/50 border-gray-700 text-white"><SelectValue placeholder="Species" /></SelectTrigger>
                <SelectContent><SelectItem value={null}>Alle</SelectItem>{speciesOptions.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.method || ""} onValueChange={(v)=>setFilters(f=>({...f, method: v||null}))}>
                <SelectTrigger className="w-32 bg-gray-800/50 border-gray-700 text-white"><SelectValue placeholder="Methode" /></SelectTrigger>
                <SelectContent><SelectItem value={null}>Alle</SelectItem>{methodOptions.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.water || ""} onValueChange={(v)=>setFilters(f=>({...f, water: v||null}))}>
                <SelectTrigger className="w-32 bg-gray-800/50 border-gray-700 text-white"><SelectValue placeholder="Gewässer" /></SelectTrigger>
                <SelectContent><SelectItem value={null}>Alle</SelectItem>{waterOptions.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.season || ""} onValueChange={(v)=>setFilters(f=>({...f, season: v||null}))}>
                <SelectTrigger className="w-32 bg-gray-800/50 border-gray-700 text-white"><SelectValue placeholder="Saison" /></SelectTrigger>
                <SelectContent><SelectItem value={null}>Alle</SelectItem>{seasonOptions.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.time || ""} onValueChange={(v)=>setFilters(f=>({...f, time: v||null}))}>
                <SelectTrigger className="w-32 bg-gray-800/50 border-gray-700 text-white"><SelectValue placeholder="Zeit" /></SelectTrigger>
                <SelectContent><SelectItem value={null}>Alle</SelectItem>{timeOptions.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={computeReport}><ShieldAlert className="w-4 h-4 mr-1" /> Pack-Check</Button>
                <Button variant="outline" onClick={()=>setShowSave(true)}><Save className="w-4 h-4 mr-1" /> Loadout speichern</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {adding && (
              <div className="p-3 rounded-xl bg-gray-800/40 mb-3 grid sm:grid-cols-4 gap-2">
                <Input value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} placeholder="Name*" className="bg-gray-800/50 border-gray-700 text-white" />
                <select
                  value={form.categoryId || ""}
                  onChange={(e)=>setForm({...form, categoryId: e.target.value})}
                  className="bg-gray-800/50 border border-gray-700 text-white rounded-md px-3 py-2"
                >
                  <option value="">Kategorie wählen</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Input type="number" value={form.qty} onChange={(e)=>setForm({...form, qty: e.target.value})} placeholder="Menge" className="bg-gray-800/50 border-gray-700 text-white" />
                <Button onClick={addItem} className="bg-emerald-600 hover:bg-emerald-700">Speichern</Button>
              </div>
            )}

            {/* Pack-Progress */}
            {activeSession && (
              <div className="mb-3 flex items-center gap-3">
                <div className="text-gray-300 text-sm">Gepackt: {doneCount} / {totalCount}</div>
                <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${totalCount ? (doneCount/totalCount)*100 : 0}%` }} />
                </div>
                <Badge variant="outline" className="text-gray-300 border-gray-600">{Math.round(totalCount ? (doneCount/totalCount)*100 : 0)}%</Badge>
              </div>
            )}

            {/* Kategorien-Accordion and items */}
            <div className="divide-y divide-gray-800">
              {cats.map(c => {
                const list = itemsByCat.get(c.id) || [];
                return (
                  <div key={c.id} className="py-2">
                    <button onClick={()=>toggleCat(c.id)} className="w-full flex items-center justify-between text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{c.name}</span>
                        <Badge variant="outline" className="text-gray-300 border-gray-600">{list.length}</Badge>
                      </div>
                      {openCatIds[c.id] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>
                    {openCatIds[c.id] && (
                      <div className="mt-2 grid sm:grid-cols-2 gap-2">
                        {list.map(it => (
                          <div key={it.id} className="p-3 rounded-xl bg-gray-800/40 flex items-center justify-between">
                            <div>
                              <div className="text-white font-medium">{it.name}</div>
                              <div className="text-gray-400 text-xs">Menge: {it.qty ?? 1} {it.unit || "stk"}</div>
                            </div>
                            <Button size="sm" variant="outline" onClick={()=>togglePack(it)} className={isPacked(it.id) ? "border-emerald-500 text-emerald-400" : ""}>
                              {isPacked(it.id) ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />} Pack
                            </Button>
                          </div>
                        ))}
                        {list.length === 0 && <div className="text-gray-500 text-sm">Keine Items.</div>}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Unkategorisierte Items */}
              {itemsByCat.get("uncat") && (
                <div className="py-2">
                  <button onClick={()=>toggleCat("uncat")} className="w-full flex items-center justify-between text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">Sonstiges</span>
                      <Badge variant="outline" className="text-gray-300 border-gray-600">{itemsByCat.get("uncat").length}</Badge>
                    </div>
                    {openCatIds["uncat"] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </button>
                  {openCatIds["uncat"] && (
                    <div className="mt-2 grid sm:grid-cols-2 gap-2">
                      {itemsByCat.get("uncat").map(it => (
                        <div key={it.id} className="p-3 rounded-xl bg-gray-800/40 flex items-center justify-between">
                          <div>
                            <div className="text-white font-medium">{it.name}</div>
                            <div className="text-gray-400 text-xs">Menge: {it.qty ?? 1} {it.unit || "stk"}</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={()=>togglePack(it)} className={isPacked(it.id) ? "border-emerald-500 text-emerald-400" : ""}>
                            {isPacked(it.id) ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />} Pack
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* NEW: Bottom actions bar */}
        <div className="sticky bottom-4 z-10">
          <div className="glass-morphism border border-gray-800 rounded-2xl px-3 py-2 flex gap-2 justify-end">
            <Button variant="outline" onClick={computeReport}><ShieldAlert className="w-4 h-4 mr-1" /> Pack-Check</Button>
            <Button variant="outline" onClick={()=>setShowSave(true)}><Save className="w-4 h-4 mr-1" /> Loadout speichern</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><ScanLine className="w-4 h-4 mr-1" /> Start Fishing</Button>
          </div>
        </div>
      </div>

      {/* NEW: Pack Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pack-Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-300 mb-1">Fehlt</div>
              {report.missing.length === 0 ? <div className="text-gray-500 text-sm">Keine fehlenden Teile.</div> :
                report.missing.map((m, idx) => (
                  <div key={idx} className="text-sm text-white">
                    {m.type === "item"
                      ? (items.find(i => i.id === m.refId)?.name || m.refId)
                      : (cats.find(c => c.id === m.refId)?.name || m.refId)} (benötigt: {m.need})
                  </div>
                ))
              }
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-1">Niedrige Menge</div>
              {report.low.length === 0 ? <div className="text-gray-500 text-sm">Alle benötigten Mengen erfüllt.</div> :
                report.low.map((l, idx) => (
                  <div key={idx} className="text-sm text-white">{items.find(i => i.id === l.itemId)?.name || l.itemId}</div>
                ))
              }
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-1">Verboten</div>
              {report.forbidden.length === 0 ? <div className="text-gray-500 text-sm">Keine verbotenen Items gefunden.</div> :
                report.forbidden.map((fid, idx) => (
                  <div key={idx} className="text-sm text-white">{items.find(i => i.id === fid)?.name || fid}</div>
                ))
              }
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-1">Hinweise</div>
              {(report.warnings || []).length === 0 ? <div className="text-gray-500 text-sm">Keine Hinweise.</div> :
                report.warnings.map((w, idx) => (<div key={idx} className="text-sm text-white">{w}</div>))
              }
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowReport(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW: Save Loadout Dialog */}
      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Loadout speichern</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-gray-300">Name</Label>
              <Input value={saveForm.name} onChange={(e)=>setSaveForm(f=>({...f, name: e.target.value}))} className="bg-gray-800/50 border-gray-700 text-white" />
            </div>
            <div>
              <Label className="text-gray-300">Species</Label>
              <div className="grid grid-cols-2 gap-2">
                {speciesOptions.map(s => (
                  <label key={s} className="flex items-center gap-2 text-white">
                    <Checkbox checked={saveForm.species.includes(s)} onCheckedChange={(checked)=>{
                      setSaveForm(f=>({
                        ...f,
                        species: checked ? [...f.species, s] : f.species.filter(x=>x!==s)
                      }));
                    }} />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-gray-300">Methode</Label>
                <Select value={saveForm.method} onValueChange={(v)=>setSaveForm(f=>({...f, method: v}))}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{methodOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Gewässer</Label>
                <Select value={saveForm.water} onValueChange={(v)=>setSaveForm(f=>({...f, water: v}))}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{waterOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Saison</Label>
                <Select value={saveForm.season} onValueChange={(v)=>setSaveForm(f=>({...f, season: v}))}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{seasonOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Zeit</Label>
                <Select value={saveForm.time} onValueChange={(v)=>setSaveForm(f=>({...f, time: v}))}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{timeOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowSave(false)}>Abbrechen</Button>
            <Button onClick={saveCurrentAsLoadout} className="bg-emerald-600 hover:bg-emerald-700">Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
