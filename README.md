# MAYKEL Audio Uploader

> **Convert and upload audio directly to Roblox Creator.**

**MAYKEL Audio Uploader** es una aplicación web moderna y profesional diseñada para convertir, procesar y subir archivos de audio directamente a Roblox utilizando **Roblox Open Cloud Assets API**.

---

## ✨ Características Principales

- 📁 **Soporte de Formatos**: Carga archivos locales en **MP3, WAV, OGG y FLAC** (con drag & drop intuitivo).
- 🎬 **Integración YouTube**: Pega enlaces de `youtube.com`, `youtu.be`, `m.youtube.com` o `music.youtube.com` con detección y validación instantánea.
- 👤 **Creador Flexible**: Elige subir como **User** (con tu User ID) o como **Group** (con tu Group ID).
- ⚡ **Presets de Velocidad**:
  - `Lento 2.1x`
  - `Default 2.33x`
  - `Rápido 2.5x`
  - `Más rápido 2.7x`
  - `Ultra 2.9x`
- 🎛️ **Configuración Avanzada de Audio**:
  - **Velocidad**: Slider de `2.10x` a `2.90x` (default `2.33x`).
  - **Amplificación / Volumen**: Slider de `-20 dB` a `+20 dB` (default `-4 dB`).
  - **Duración Máxima**: Slider de `10s` a `400s` (default `400s`).
  - **Vista Previa**: Escucha el resultado procesado en tu navegador antes de subir.
- 🔧 **Motor de Conversión FFmpeg**:
  - Sample Rate: `44100 Hz`
  - Canales: `2 (Stereo)`
  - Bitrate: `192 kbps`
  - Formato final: `MP3`
- 🚀 **Roblox Open Cloud Assets API v1**:
  - Subida directa mediante `POST /assets` con `assetType: Audio`.
  - Descripción oficial: `"Uploaded via MAYKEL Web"`.
  - Polling de estado de operaciones (`GET /operations/{operationId}`).
  - Verificación de estado de moderación (`APPROVED` / `REJECTED`).
  - Extracción y copia de **Asset ID**.
- 📜 **Historial de Subidas**:
  - Registro de los últimos **50 uploads** con fecha, audio, velocidad, estado y botón para copiar Asset ID.
  - Búsqueda y filtrado rápido.
- 🔒 **Seguridad y Privacidad**:
  - La Roblox Open Cloud API Key nunca se expone ni se almacena en el navegador (`localStorage`). Se procesa exclusivamente en el backend.
  - Limpieza automática de archivos temporales.

---

## 🛠️ Requisitos Previos

- **Node.js**: v18 o superior
- **FFmpeg**: Instalado y accesible en el `PATH` del sistema
- **Roblox Open Cloud API Key**: Creada en [Roblox Creator Hub](https://create.roblox.com/dashboard/credentials) con permisos:
  - API: `Assets API`
  - Permisos: `Read & Write`

---

## 🚀 Instalación y Ejecución

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Ejecutar en modo desarrollo**:
   ```bash
   npm run dev
   ```
   El servidor iniciará en `http://localhost:3000`.

3. **Construir para producción**:
   ```bash
   npm run build
   ```

4. **Iniciar en producción**:
   ```bash
   npm start
   ```

---

## 🔑 Cómo Obtener tu API Key de Roblox

1. Ve a [Roblox Creator Credentials](https://create.roblox.com/dashboard/credentials).
2. Haz clic en **Create API Key**.
3. En **Access Permissions**, selecciona **Assets API** y marca **Read** y **Write**.
4. En **IP Restrictions**, selecciona *No IP restrictions* o añade la IP de tu servidor.
5. Copia la API Key e ingrésala en el panel **Cuenta Roblox** de MAYKEL Audio Uploader.

---

## 📝 Licencia

Desarrollado para la comunidad de creadores de Roblox.
