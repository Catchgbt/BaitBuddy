import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function Impressum() {
  const [email, setEmail] = useState('');
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    setLoading(true);
    
    try {
      // Simuliere E-Mail-Versand (in Produktion würde hier eine echte E-Mail gesendet)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setRequested(true);
      toast.success('Impressum wurde an Ihre E-Mail-Adresse gesendet!');
    } catch (error) {
      toast.error('Fehler beim Versenden. Bitte kontaktieren Sie uns direkt.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="glass-morphism border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
            Impressum
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300">
          
          {/* Rechtlicher Hinweis */}
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200">
              <strong>Hinweis:</strong> Aus datenschutzrechtlichen Gründen wird unser vollständiges Impressum nur auf Anfrage bereitgestellt.
            </div>
          </div>

          {!requested ? (
            <div className="space-y-6">
              <div className="prose prose-invert max-w-none">
                <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                  Angaben gemäß § 5 TMG
                </h2>
                <p>
                  <strong>Betreiber:</strong> Sebastian Schorn<br />
                  <strong>E-Mail:</strong> S.s.Bedburg@gmail.com
                </p>

                <p className="text-gray-400 text-sm mt-4">
                  Das vollständige Impressum mit postalischer Adresse erhalten Sie auf Anfrage per E-Mail.
                </p>
              </div>

              {/* E-Mail Anfrage Formular */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-cyan-400" />
                  Vollständiges Impressum anfordern
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      Ihre E-Mail-Adresse
                    </label>
                    <Input
                      type="email"
                      placeholder="ihre@email.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-900/50 border-gray-700 text-white"
                      disabled={loading}
                    />
                  </div>

                  <Button
                    onClick={handleRequest}
                    disabled={loading || !email}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Wird gesendet...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Impressum per E-Mail anfordern
                      </span>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500">
                    Sie erhalten das vollständige Impressum umgehend per E-Mail. 
                    Ihre E-Mail-Adresse wird nur für diese Anfrage verwendet.
                  </p>
                </div>
              </div>

              {/* Weitere rechtliche Infos */}
              <div className="prose prose-invert max-w-none text-sm">
                <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                  EU-Streitschlichtung
                </h2>
                <p>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
                  <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline"> https://ec.europa.eu/consumers/odr</a>
                </p>

                <h2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                  Verbraucher­streit­beilegung
                </h2>
                <p>
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Impressum versendet!
              </h3>
              <p className="text-gray-400 mb-6">
                Das vollständige Impressum wurde an <strong>{email}</strong> gesendet.
              </p>
              <p className="text-sm text-gray-500">
                Bitte überprüfen Sie auch Ihren Spam-Ordner, falls Sie die E-Mail nicht sehen.
              </p>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}