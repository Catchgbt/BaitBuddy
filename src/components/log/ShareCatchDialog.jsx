import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Facebook, Twitter, Send, MessageCircle, Download, Copy, Share2, Instagram, Music2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

function buildCaption(catchItem) {
  const parts = ['Mein neuer Fang'];
  if (catchItem.species) parts.push(catchItem.species);
  const stats = [];
  if (catchItem.length_cm) stats.push(`${catchItem.length_cm} cm`);
  if (catchItem.weight_kg) stats.push(`${catchItem.weight_kg} kg`);
  if (catchItem.bait_used) stats.push(`Koeder: ${catchItem.bait_used}`);
  if (catchItem.catch_time) {
    try {
      stats.push(format(new Date(catchItem.catch_time), 'dd.MM.yyyy', { locale: de }));
    } catch {}
  }
  const head = parts.join(': ');
  const body = stats.length ? `\n${stats.join(' | ')}` : '';
  return `${head}${body}\n\n#angeln #catchgbt #fishing #petriheil`;
}

async function downloadImage(url, filename) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    return true;
  } catch (err) {
    console.error('Image download failed', err);
    return false;
  }
}

async function shareNative(catchItem, caption) {
  if (!navigator.share) return false;
  try {
    if (catchItem.photo_url && navigator.canShare) {
      try {
        const res = await fetch(catchItem.photo_url, { mode: 'cors' });
        const blob = await res.blob();
        const file = new File([blob], `fang-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'Mein Fang', text: caption, files: [file] });
          return true;
        }
      } catch {}
    }
    await navigator.share({ title: 'Mein Fang', text: caption });
    return true;
  } catch (err) {
    if (err?.name === 'AbortError') return true;
    return false;
  }
}

export default function ShareCatchDialog({ catchItem, open, onOpenChange }) {
  const [caption, setCaption] = useState(() => buildCaption(catchItem || {}));

  React.useEffect(() => {
    if (open) setCaption(buildCaption(catchItem || {}));
  }, [open, catchItem]);

  if (!catchItem) return null;

  const shareUrl = catchItem.photo_url || window.location.href;
  const encodedText = encodeURIComponent(caption);
  const encodedUrl = encodeURIComponent(shareUrl);

  const handleNative = async () => {
    const ok = await shareNative(catchItem, caption);
    if (ok) onOpenChange(false);
    else toast.info('Native Freigabe nicht verfuegbar, waehle eine Plattform.');
  };

  const handleFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, '_blank', 'noopener');
  };
  const handleTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank', 'noopener');
  };
  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, '_blank', 'noopener');
  };
  const handleTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank', 'noopener');
  };

  const handleInstagram = async () => {
    if (!catchItem.photo_url) {
      toast.error('Kein Foto zum Teilen vorhanden.');
      return;
    }
    await navigator.clipboard.writeText(caption).catch(() => {});
    const ok = await downloadImage(catchItem.photo_url, `fang-${Date.now()}.jpg`);
    if (ok) {
      toast.success('Bild heruntergeladen, Text kopiert. Oeffne Instagram und fuege es ein.');
    }
  };

  const handleTikTok = async () => {
    if (!catchItem.photo_url) {
      toast.error('Kein Foto zum Teilen vorhanden.');
      return;
    }
    await navigator.clipboard.writeText(caption).catch(() => {});
    const ok = await downloadImage(catchItem.photo_url, `fang-${Date.now()}.jpg`);
    if (ok) {
      toast.success('Bild heruntergeladen, Text kopiert. Oeffne TikTok und fuege es ein.');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(caption);
    toast.success('Text kopiert');
  };

  const handleDownload = async () => {
    if (!catchItem.photo_url) {
      toast.error('Kein Foto vorhanden.');
      return;
    }
    const ok = await downloadImage(catchItem.photo_url, `fang-${Date.now()}.jpg`);
    if (ok) toast.success('Bild gespeichert');
    else toast.error('Download fehlgeschlagen');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">Fang teilen</DialogTitle>
        </DialogHeader>

        {catchItem.photo_url && (
          <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
            <img src={catchItem.photo_url} alt="Fang" className="w-full h-44 object-cover" />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs text-gray-400 uppercase tracking-wider">Beschreibung</label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            className="bg-gray-800 border-gray-700 text-gray-100 text-sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button onClick={handleNative} className="bg-cyan-600 hover:bg-cyan-500 col-span-3">
            <Share2 className="w-4 h-4 mr-2" />
            Geraete-Freigabe
          </Button>

          <Button onClick={handleFacebook} variant="outline" className="border-gray-700 hover:border-blue-500/50 flex-col h-auto py-3 gap-1">
            <Facebook className="w-5 h-5 text-blue-400" />
            <span className="text-xs">Facebook</span>
          </Button>
          <Button onClick={handleTwitter} variant="outline" className="border-gray-700 hover:border-sky-500/50 flex-col h-auto py-3 gap-1">
            <Twitter className="w-5 h-5 text-sky-400" />
            <span className="text-xs">X / Twitter</span>
          </Button>
          <Button onClick={handleWhatsApp} variant="outline" className="border-gray-700 hover:border-green-500/50 flex-col h-auto py-3 gap-1">
            <MessageCircle className="w-5 h-5 text-green-400" />
            <span className="text-xs">WhatsApp</span>
          </Button>
          <Button onClick={handleTelegram} variant="outline" className="border-gray-700 hover:border-cyan-500/50 flex-col h-auto py-3 gap-1">
            <Send className="w-5 h-5 text-cyan-400" />
            <span className="text-xs">Telegram</span>
          </Button>
          <Button onClick={handleInstagram} variant="outline" className="border-gray-700 hover:border-pink-500/50 flex-col h-auto py-3 gap-1">
            <Instagram className="w-5 h-5 text-pink-400" />
            <span className="text-xs">Instagram</span>
          </Button>
          <Button onClick={handleTikTok} variant="outline" className="border-gray-700 hover:border-fuchsia-500/50 flex-col h-auto py-3 gap-1">
            <Music2 className="w-5 h-5 text-fuchsia-400" />
            <span className="text-xs">TikTok</span>
          </Button>
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-800">
          <Button onClick={handleCopy} variant="ghost" className="flex-1 text-gray-300">
            <Copy className="w-4 h-4 mr-2" />
            Text kopieren
          </Button>
          {catchItem.photo_url && (
            <Button onClick={handleDownload} variant="ghost" className="flex-1 text-gray-300">
              <Download className="w-4 h-4 mr-2" />
              Bild speichern
            </Button>
          )}
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          Hinweis: Instagram und TikTok unterstuetzen kein direktes Web-Posting. Bild wird gespeichert und Text in die Zwischenablage kopiert, sodass du es in der jeweiligen App einfuegen kannst.
        </p>
      </DialogContent>
    </Dialog>
  );
}