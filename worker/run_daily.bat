@echo off
rem Daily scrape + extraction, run by Windows Task Scheduler every morning.
cd /d "C:\Users\eesha\Downloads\coding\reddit-stock-dashboard\worker"
".venv\Scripts\python.exe" -u run_daily.py >> daily_run.log 2>&1
