# Cron-Container: ruft die Admin-Endpunkte des Backends zeitgesteuert auf.
# Ersetzt den "crons"-Block aus vercel.json.
FROM alpine:3.20
RUN apk add --no-cache curl tzdata
COPY cron/crontab /etc/crontabs/root
COPY cron/run-job.sh /usr/local/bin/run-job
RUN chmod +x /usr/local/bin/run-job
CMD ["crond", "-f", "-l", "2"]
