@echo off
rem Instalador de Repro Publicidad para Windows (ejecutar con doble clic)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0instalar-en-cliente.ps1\"' -Verb RunAs"