import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Package, Euro, Mail, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useFeatureTracking } from "@/hooks/useFeatureTracking";

const CATEGORIES = [
  "Rute",
  "Rolle",
  "Köder",
  "Schnur",
  "Set",
  "Bekleidung",
  "Zubehör",
  "Sonstiges",
];

const CONDITIONS = ["neu", "wie neu", "gut", "gebraucht", "defekt"];

function centsToDisplay(cents, currency) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(
    cents / 100
  );
}

export default function UsedGearMarket() {
  useFeatureTracking("gear_market");
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Rute");
  const [condition, setCondition] = useState("gut");
  const [price, setPrice] = useState("0");
  const [negotiable, setNegotiable] = useState(false);
  const [location, setLocation] = useState("");
  const [shipping, setShipping] = useState(false);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Alle");
  const [conditionFilter, setConditionFilter] = useState("Alle");

  useEffect(() => {
    checkAuth();
    fetchListings();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.log("User not logged in");
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const listings = await base44.entities.GearListing.filter({ is_active: true });
      setItems(listings || []);
    } catch (error) {
      console.error(error);
      toast.error("Fehler beim Laden der Anzeigen");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Bitte einloggen!");
      return;
    }

    setUploading(true);

    try {
      const priceCents = Math.round(parseFloat(price) * 100);
      
      const imageUrls = [];
      if (images.length > 0) {
        const { UploadFile } = await import('@/integrations/Core');
        for (const file of images.slice(0, 6)) {
          const { file_url } = await UploadFile({ file });
          imageUrls.push(file_url);
        }
      }

      await base44.entities.GearListing.create({
        title,
        category,
        condition,
        price_cents: priceCents,
        currency: "EUR",
        negotiable,
        location,
        shipping_available: shipping,
        description,
        image_urls: imageUrls,
        is_active: true,
        seller_email: user.email
      });

      toast.success("Anzeige erfolgreich erstellt!");
      setTitle("");
      setDescription("");
      setPrice("0");
      setImages([]);
      if (fileRef.current) fileRef.current.value = "";
      fetchListings();
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Hochladen");
    }
    setUploading(false);
  };

  const deactivate = async (id) => {
    try {
      await base44.entities.GearListing.update(id, { is_active: false });
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success("Anzeige gelöscht");
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === "Alle" || item.category === categoryFilter;
      const matchesCondition = conditionFilter === "Alle" || item.condition === conditionFilter;
      
      return matchesSearch && matchesCategory && matchesCondition;
    });
  }, [items, searchQuery, categoryFilter, conditionFilter]);

  return (
    <div className="min-h-screen bg-gray-950 p-6 pb-32">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              Gebrauchtmarkt
            </h1>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
              BETA
            </span>
          </div>

          {!user && (
            <Button
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Einloggen
            </Button>
          )}
        </motion.div>

        {user && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Neue Anzeige erstellen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <Input
                  placeholder="Titel der Anzeige"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                  required
                />

                <div className="grid grid-cols-3 gap-3">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Kategorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Zustand" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Preis"
                      className="bg-gray-800 border-gray-700"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={negotiable}
                      onChange={(e) => setNegotiable(e.target.checked)}
                      className="rounded"
                    />
                    Verhandlungsbasis
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shipping}
                      onChange={(e) => setShipping(e.target.checked)}
                      className="rounded"
                    />
                    Versand möglich
                  </label>
                </div>

                <Input
                  placeholder="Standort (optional)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />

                <Textarea
                  placeholder="Beschreibung"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-gray-800 border-gray-700 h-24"
                />

                <Input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setImages(Array.from(e.target.files || []))}
                  className="bg-gray-800 border-gray-700"
                />
                <div className="text-xs text-gray-500">Maximal 6 Bilder</div>

                <Button 
                  type="submit" 
                  className="bg-cyan-600 hover:bg-cyan-700"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wird hochgeladen...
                    </>
                  ) : (
                    "Anzeige veröffentlichen"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Suche nach Titel oder Beschreibung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alle">Alle Kategorien</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={conditionFilter} onValueChange={setConditionFilter}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Zustand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alle">Alle Zustände</SelectItem>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Lade Anzeigen...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            Keine Anzeigen gefunden
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="bg-gray-900/50 border-gray-800 hover:border-cyan-500/50 transition-all overflow-hidden">
                  {item.image_urls && item.image_urls[0] ? (
                    <img
                      src={item.image_urls[0]}
                      alt={item.title}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="h-48 bg-gray-800 flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-600" />
                    </div>
                  )}

                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold text-white text-lg">{item.title}</h3>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {item.category}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {item.condition}
                      </span>
                    </div>

                    <div className="text-2xl font-bold text-cyan-400">
                      {centsToDisplay(item.price_cents, "EUR")}
                      {item.negotiable && (
                        <span className="text-xs text-gray-400 ml-2">VB</span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {item.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </div>
                      )}
                      {item.shipping_available && (
                        <span className="px-2 py-1 rounded bg-gray-800 text-gray-400">
                          Versand
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                      <a
                        href={`mailto:${item.seller_email || item.created_by}?subject=${encodeURIComponent(
                          "Interesse an " + item.title
                        )}`}
                        className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Mail className="w-4 h-4" />
                        Kontakt
                      </a>

                      {user && user.email === item.created_by && (
                        <Button
                          onClick={() => deactivate(item.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}