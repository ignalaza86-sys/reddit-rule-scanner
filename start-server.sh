#!/bin/bash
# Server watchdog - restarts Next.js when it crashes
LOG=/tmp/next-server.log
cd /home/z/my-project

echo "[$(date)] Starting server watchdog..." >> $LOG

while true; do
  # Check if server responds
  if ! curl -s -o /dev/null -m 5 "http://localhost:3000/" 2>/dev/null; then
    echo "[$(date)] Server down, restarting..." >> $LOG
    pkill -f "next start" 2>/dev/null
    sleep 2
    npx next start -p 3000 >> $LOG 2>&1 &
    disown -a
    sleep 8
    # Warm up the server
    curl -s -m 60 "http://localhost:3000/" > /dev/null 2>&1
    echo "[$(date)] Server restarted and warmed up" >> $LOG
  fi
  sleep 10
done
