from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from transformers import pipeline, BartForConditionalGeneration, BartTokenizer
import torch

app = FastAPI()

# Initialize Summarizer Pipeline
summarizer = pipeline("summarization", model="facebook/bart-large-cnn", tokenizer="facebook/bart-large-cnn")

# Initialize Sentiment Analyzer Pipeline
sentiment_analyzer = pipeline("sentiment-analysis")

# Model and Tokenizer loading for Bart (if you prefer to load manually instead of using pipeline)
model = BartForConditionalGeneration.from_pretrained("facebook/bart-large-cnn")
tokenizer = BartTokenizer.from_pretrained("facebook/bart-large-cnn")

# Define a Request body class for receiving news content
class NewsData(BaseModel):
    content: str

@app.post("/summarize")
async def summarize_news(news_data: NewsData):
    try:
        # Ensure content length is manageable for the model
        max_input_length = 1024  # Change as needed based on your model's max input length
        input_text = news_data.content
        
        # Tokenize and truncate if necessary
        inputs = tokenizer.encode(input_text, return_tensors="pt", truncation=True, max_length=max_input_length)
        
        # Generate summary with truncation if input exceeds length
        summary_ids = model.generate(inputs, max_length=130, min_length=30, do_sample=False)
        summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)

        return {"summary": summary}
    except Exception as e:
        # Handle any errors
        raise HTTPException(status_code=500, detail=f"Error in summarization: {str(e)}")

@app.post("/sentiment")
async def analyze_sentiment(news_data: NewsData):
    try:
        # Analyze sentiment
        sentiment = sentiment_analyzer(news_data.content)

        return {"sentiment": sentiment}
    except Exception as e:
        # Handle any errors
        raise HTTPException(status_code=500, detail=f"Error in sentiment analysis: {str(e)}")

# Error Handling for Requests
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": f"HTTP error occurred: {exc.detail}"},
    )

# Error Handling for Uncaught Exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": f"An unexpected error occurred: {str(exc)}"},
    )
