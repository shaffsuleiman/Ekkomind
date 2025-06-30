# EkoMindAI

EkoMindAI is a cross-platform therapeutic assistant app. It leverages AI to provide mental wellness support, including chat, voice input, and personalized suggestions.

## Features

- AI-powered chat for mental wellness
- Voice input and transcription (OpenAI Whisper)
- Personalized suggestions and routines
- User authentication (Firebase)
- User profile management
- Responsive UI with bottom navigation

## Tech Stack

- **Frontend:** React Native (Expo), Firebase Auth & Firestore
- **Backend:** FastAPI, OpenAI API, Python
- **Storage:** Firebase Storage

## Folder Structure

```
frontend/   # React Native app
backend/    # FastAPI backend
```

## Getting Started

### Prerequisites

- Node.js & npm
- Python 3.9+
- Expo CLI (`npm install -g expo-cli`)
- Firebase project (for Auth/Firestore)
- OpenAI API key

### Frontend

1. Install dependencies:
    ```sh
    cd frontend
    npm install
    ```
2. Configure Firebase in `frontend/firebase.js`.
3. Start the app:
    ```sh
    npx expo start --clear
    ```

### Backend

1. Install dependencies:
    ```sh
    cd backend
    pip install -r requirements.txt
    ```
2. Set environment variables in `.env` (e.g., `OPENAI_API_KEY`).
3. Start the server:
    ```sh
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```

## Usage

- Sign up or log in.
- Chat with the AI or use voice input.
- View and edit your profile.
- Explore suggested routines.

## License

None

## API Endpoints

The backend Consists of the following main endpoints:

### `POST /chat`

Send a chat message and get an AI response.

**Request Body (JSON):**
```json
{
  "email": "user@example.com",
  "message": "Your message here",
  "model": "openai/gpt-4o-mini"
}
```

**Response:**
```json
{
  "message": "AI response text",
  "script_offered": false,
  "script_id": null,
  "script_metadata": null
}
```

---

### `POST /voiceinput`

Send a voice message (audio file) and get a transcribed and AI-processed response.

**Request (multipart/form-data):**
- `audio`: audio file (e.g., `.m4a`)
- `email`: user email
- `model`: model name (e.g., `openai/gpt-4o-mini`)

**Response:**
```json
{
  "transcribed_text": "Transcribed user speech",
  "message": "AI response text",
  "script_offered": false,
  "script_id": null,
  "script_metadata": null
}
```


```

---

> **Note:**  
> Update endpoint URLs and parameters as needed to match your backend implementation.
