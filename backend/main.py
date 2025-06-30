# api.py
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import tempfile
import aiofiles
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import openai
from openai import OpenAI

# Import your existing backend
from backend import TherapeuticChatbot, OPENROUTER_API_KEY

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="EkoMindAI API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your app's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the chatbot
chatbot = TherapeuticChatbot()

# Initialize OpenAI client for Whisper
# You'll need to set OPENAI_API_KEY in your environment variables
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Define request model
class ChatRequest(BaseModel):
    email: str
    message: str
    model: Optional[str] = "openai/gpt-4o-mini"

# Define response model
class ChatResponse(BaseModel):
    message: str
    script_offered: bool = False
    script_id: Optional[str] = None
    script_metadata: Optional[Dict[str, Any]] = None

# Define voice response model (extends ChatResponse)
class VoiceResponse(ChatResponse):
    transcribed_text: Optional[str] = None

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Use email as session ID to maintain conversation history
        session_id = request.email
        
        # Process the message using your existing backend
        response = chatbot.process_message(
            user_message=request.message,
            session_id=session_id,
            model=request.model
        )
        
        # Handle different response formats
        if isinstance(response, dict) and "script_offered" in response:
            # Script was offered
            return ChatResponse(
                message=response.get("response", ""),
                script_offered=True,
                script_id=response.get("script_id", ""),
                script_metadata=response.get("metadata", {})
            )
        else:
            # Normal text response
            return ChatResponse(
                message=response if response else "I'm sorry, I couldn't process that request.",
                script_offered=False
            )
            
    except Exception as e:
        import traceback
        print(f"Error processing message: {e}")
        print(traceback.format_exc())
        return ChatResponse(
            message="I'm having trouble processing your message. Please try again.",
            script_offered=False
        )

@app.post("/voiceinput", response_model=VoiceResponse)
async def voice_input(
    audio: UploadFile = File(...),
    email: str = Form(...),
    model: Optional[str] = Form("openai/gpt-4o-mini")
):
    """
    Endpoint to handle voice input:
    1. Receives audio file
    2. Transcribes using OpenAI Whisper
    3. Processes transcribed text through chat system
    4. Returns response with transcribed text
    """
    try:
        # Validate audio file
        if not audio.content_type or not audio.content_type.startswith('audio/'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload an audio file."
            )
        
        # Check if OpenAI API key is configured
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key not configured for voice transcription"
            )
        
        # Create temporary file to store uploaded audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as temp_file:
            # Read and write audio content to temp file
            content = await audio.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Transcribe audio using OpenAI Whisper
            print(f"🎤 Transcribing audio file: {audio.filename}")
            
            with open(temp_file_path, "rb") as audio_file:
                transcription = openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            
            # Extract transcribed text
            transcribed_text = transcription.strip() if transcription else ""
            print(f"🎤 Transcribed text: '{transcribed_text}'")
            
            # Check if transcription is empty
            if not transcribed_text:
                return VoiceResponse(
                    message="I couldn't hear anything clearly. Please try speaking again.",
                    script_offered=False,
                    transcribed_text=""
                )
            
            # Process transcribed text through existing chat system
            session_id = email
            response = chatbot.process_message(
                user_message=transcribed_text,
                session_id=session_id,
                model=model
            )
            
            # Handle different response formats
            if isinstance(response, dict) and "script_offered" in response:
                # Script was offered
                return VoiceResponse(
                    message=response.get("response", ""),
                    script_offered=True,
                    script_id=response.get("script_id", ""),
                    script_metadata=response.get("metadata", {}),
                    transcribed_text=transcribed_text
                )
            else:
                # Normal text response
                return VoiceResponse(
                    message=response if response else "I'm sorry, I couldn't process that request.",
                    script_offered=False,
                    transcribed_text=transcribed_text
                )
                
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except OSError:
                pass  # File might already be deleted
                
    except openai.APIError as e:
        print(f"OpenAI API Error: {e}")
        return VoiceResponse(
            message="I'm having trouble processing your voice message. Please try again or type your message.",
            script_offered=False,
            transcribed_text=""
        )
    except Exception as e:
        import traceback
        print(f"Error processing voice input: {e}")
        print(traceback.format_exc())
        return VoiceResponse(
            message="I'm having trouble processing your voice message. Please try again.",
            script_offered=False,
            transcribed_text=""
        )

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "api_key_configured": bool(OPENROUTER_API_KEY),
        "openai_key_configured": bool(os.getenv("OPENAI_API_KEY"))
    }

# Test endpoint for voice transcription
@app.post("/test-transcription")
async def test_transcription(audio: UploadFile = File(...)):
    """
    Test endpoint to verify voice transcription is working
    """
    try:
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key not configured"
            )
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Transcribe
            with open(temp_file_path, "rb") as audio_file:
                transcription = openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            
            return {
                "transcribed_text": transcription.strip(),
                "file_size": len(content),
                "content_type": audio.content_type
            }
            
        finally:
            try:
                os.unlink(temp_file_path)
            except OSError:
                pass
                
    except Exception as e:
        import traceback
        print(f"Error in test transcription: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run the FastAPI server
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)