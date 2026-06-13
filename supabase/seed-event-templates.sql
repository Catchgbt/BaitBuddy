-- Seed Event Templates
-- Diese Datei kann manuell ausgeführt werden oder über einen Seed-Hook in production

DELETE FROM event_templates WHERE template_id IN (
  'biggest_pike_week', 'biggest_carp_month', 'most_catches_week',
  'biggest_catch_week', 'photo_contest_week', 'zander_night_week',
  'biggest_catfish_month', 'fastest_catch_hour', 'species_challenge_month',
  'night_fishing_challenge'
);

INSERT INTO event_templates (template_id, name, description, icon, duration_days, scoring_method, target_species, base_points, max_participants, requires_photo, is_active) VALUES

-- Original Templates
('biggest_pike_week', 'Größter Hecht der Woche', 'Wer fängt diese Woche den längsten Hecht? Der längste Hecht gewinnt!', '🎣', 7, 'points', 'Hecht', 100, 100, false, true),
('biggest_carp_month', 'Größter Karpfen des Monats', 'Wer hat den dicksten Karpfen? Längste oder schwerste Exemplare zählen.', '🎣', 30, 'points', 'Karpfen', 100, 150, false, true),
('most_catches_week', 'Fängiger Angler der Woche', 'Wer fängt die meisten Fische diese Woche? Quantität statt Qualität!', '📊', 7, 'points', null, 100, 100, false, true),
('biggest_catch_week', 'Größter Fang der Woche', 'Der längste Fisch dieser Woche gewinnt - egal welche Art!', '🏆', 7, 'points', null, 100, 100, false, true),
('photo_contest_week', 'Foto-Wettbewerb der Woche', 'Reiche dein bestes Fangfoto ein. Community voted auf die besten Fotos!', '📸', 7, 'points', null, 100, 100, true, true),
('zander_night_week', 'Zander-Night-Challenge', 'Nachts auf Zander fangen! Wer hat den größten?', '🌙', 7, 'points', 'Zander', 120, 50, false, true),

-- Neue Templates
('biggest_catfish_month', 'Raubfisch-Monster des Monats', 'Größter Wels oder Zander im Monat. Absolute Größe zählt!', '🐈', 30, 'points', 'Wels', 150, 80, false, true),
('fastest_catch_hour', 'Schnellste Fangstunde', 'Wer fängt die meisten Fische in einer Stunde? Extremes Speedfishing!', '⚡', 1, 'points', null, 50, 50, false, true),
('species_challenge_month', 'Arten-Herausforderung', 'Fange so viele verschiedene Fischarten wie möglich in 30 Tagen!', '🐟', 30, 'points', null, 100, 120, false, true),
('night_fishing_challenge', 'Nacht-Angler-Challenge', 'Nur Fänge zwischen 20:00 und 06:00 Uhr zählen!', '🌛', 14, 'points', null, 110, 60, false, true);
