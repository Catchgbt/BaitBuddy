import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Edit, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = { type: "", number: "", valid_until: "", photo_url: "", notes: "" };

const soon = (d) => {
  if (!d) return false;
  const diff = new Date(d).getTime() - Date.now();
  return diff > 0 && diff < 14 * 24 * 3600 * 1000;
};

export default function LicensesSection() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["licenses"],
    queryFn: () => base44.entities.License.list("-valid_until"),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => base44.entities.License.create(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["licenses"] });
      const previous = queryClient.getQueryData(["licenses"]);
      queryClient.setQueryData(["licenses"], (old = []) => [{ id: `tmp-${Date.now()}`, ...payload }, ...old]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["licenses"], ctx.previous);
      toast.error("Fehler beim Speichern.");
    },
    onSuccess: () => toast.success("Lizenz gespeichert."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["licenses"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => base44.entities.License.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ["licenses"] });
      const previous = queryClient.getQueryData(["licenses"]);
      queryClient.setQueryData(["licenses"], (old = []) =>
        old.map((l) => (l.id === id ? { ...l, ...payload } : l))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["licenses"], ctx.previous);
      toast.error("Fehler beim Aktualisieren.");
    },
    onSuccess: () => toast.success("Lizenz aktualisiert."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["licenses"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.License.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["licenses"] });
      const previous = queryClient.getQueryData(["licenses"]);
      queryClient.setQueryData(["licenses"], (old = []) => old.filter((l) => l.id !== id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["licenses"], ctx.previous);
      toast.error("Fehler beim Loeschen.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["licenses"] }),
  });

  const save = () => {
    if (editing === "new") {
      createMutation.mutate(form);
    } else {
      updateMutation.mutate({ id: editing, payload: form });
    }
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const upload = async (file) => {
    const { file_url } = await UploadFile({ file });
    setForm((prev) => ({ ...prev, photo_url: file_url }));
  };

  return (
    <Card className="glass-morphism border-gray-800 rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Lizenzen</CardTitle>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => { setEditing("new"); setForm(EMPTY_FORM); }}
          >
            Neue Lizenz
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {editing && (
          <div className="p-4 rounded-xl bg-gray-800/40 mb-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                placeholder="Typ*"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white"
              />
              <Input
                placeholder="Nummer*"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white"
              />
              <Input
                type="date"
                aria-label="Gueltig bis"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white"
              />
              <Input
                placeholder="Notizen"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white"
              />
              <div className="md:col-span-2">
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Lizenzbild hochladen"
                  onChange={(e) => e.target.files[0] && upload(e.target.files[0])}
                />
                {form.photo_url && (
                  <img src={form.photo_url} alt="Lizenz" className="mt-2 h-24 rounded-xl object-cover" />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" aria-label="Bearbeitung abbrechen" onClick={() => setEditing(null)}>
                <X aria-hidden="true" className="w-4 h-4 mr-1" />Abbrechen
              </Button>
              <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">
                Speichern
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {isLoading && <div className="text-gray-400 text-sm">Lade Lizenzen...</div>}
          {items.map((l) => (
            <div key={l.id} className="p-3 rounded-xl bg-gray-800/40 flex items-center justify-between">
              <div>
                <div className="text-white font-semibold">{l.type} - {l.number}</div>
                <div className="text-gray-300 text-sm flex items-center gap-2">
                  <Calendar aria-hidden="true" className="w-4 h-4" />
                  Gueltig bis: {l.valid_until}
                </div>
                {soon(l.valid_until) && (
                  <div className="text-amber-400 text-xs mt-1">Erinnerung: laeuft bald ab.</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`${l.type} bearbeiten`}
                  onClick={() => { setEditing(l.id); setForm({ type: l.type || "", number: l.number || "", valid_until: l.valid_until || "", photo_url: l.photo_url || "", notes: l.notes || "" }); }}
                >
                  <Edit aria-hidden="true" className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label={`${l.type} loeschen`}
                  onClick={() => deleteMutation.mutate(l.id)}
                >
                  <Trash2 aria-hidden="true" className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {items.length === 0 && !isLoading && (
            <div className="text-gray-400">Noch keine Lizenzen.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}