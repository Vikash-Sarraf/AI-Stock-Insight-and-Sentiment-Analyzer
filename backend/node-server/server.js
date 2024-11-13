require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

// Create Express app
const app = express();
app.use(express.json());

const pythonApiUrl = process.env.PYTHON_API_URL; // URL of the FastAPI service
const eventRegistryApiUrl = 'https://eventregistry.org/api/v1/article/getArticles'; // EventRegistry API URL

// Function to fetch financial news using EventRegistry API
async function fetchNews() {
    try {
        const response = await axios.post(eventRegistryApiUrl, {
            action: "getArticles",
            keyword: ["stocks", "finance", "market", "economy"],
            lang: ["eng"],
            keywordLoc: "body,title",
            ignoreSourceGroupUri: "paywall/paywalled_sources",
            articlesPage: 1,
            articlesCount: 10, 
            articlesSortBy: "date",
            articlesSortByAsc: false,
            dataType: ["news","pr"], 
            resultType: "articles",
            apiKey: process.env.NEWS_API_KEY 
        });
        console.log("result-\n"+response.data.articles.results);
        return response.data.articles.results; // Return articles
    } catch (error) {
        console.error('Error fetching news:', error.message);
        return [];
    }
}

// Function to summarize news
async function summarizeNews(news) {
    try {
        // Extracting body text of the article
        const content = news.body; // 'body' is the field that contains the article content
        const response = await axios.post(`${pythonApiUrl}/summarize`, {
            content: content
        });
        console.log("Summarize response:", response.data); // Log the summary response
        return response.data.summary; // Return the summary
    } catch (error) {
        console.error('Error summarizing news:', error.message);
        return { summary: 'Error summarizing content.' };
    }
}

// Function to analyze sentiment of news
async function analyzeSentiment(news) {
    try {
        // Extracting title text of the article (you can use body or other relevant fields as well)
        const content = news.title; // Using 'title' for sentiment analysis
        const response = await axios.post(`${pythonApiUrl}/sentiment`, {
            content: content
        });
        console.log("Sentiment response:", response.data); // Log the sentiment response
        return response.data; // Return the sentiment
    } catch (error) {
        console.error('Error analyzing sentiment:', error.message);
        return { sentiment: 'Error analyzing sentiment.' };
    }
}

// Route to summarize news content (manual trigger)
app.post('/summarize', async (req, res) => {
    try {
        const response = await axios.post(`${pythonApiUrl}/summarize`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error in summarization:', error.message);
        res.status(500).json({ error: 'Failed to summarize content' });
    }
});

// Route to analyze sentiment of news content (manual trigger)
app.post('/sentiment', async (req, res) => {
    try {
        const response = await axios.post(`${pythonApiUrl}/sentiment`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error in sentiment analysis:', error.message);
        res.status(500).json({ error: 'Failed to analyze sentiment' });
    }
});

// Function to process all the retrieved news articles
async function processArticles(news) {
    try {
        for (const article of news) {
            console.log(`Processing article: ${article.title}`);
            
            // Summarize each article
            const summary = await summarizeNews(article);
            console.log('Summary:', summary);

            // Analyze sentiment of each article
            const sentiment = await analyzeSentiment(article);
            console.log('Sentiment:', sentiment);

            // You can now store or process the results further (e.g., save to a database)
            // Example: log the results to the console for now
            console.log('Processed News:', {
                title: article.title,
                summary: summary,
                sentiment: sentiment
            });
        }
    } catch (err) {
        console.error('Error during article processing:', err);
    }
}

// Example: Fetch news and analyze every 30 minutes
const fetchAndProcessNews = async () => {
    try {
        // Fetch news
        const news = await fetchNews();
        if (news.length === 0) return;

        // Process all articles (summarize and analyze sentiment)
        await processArticles(news);
    } catch (err) {
        console.error('Error during scheduled task:', err);
    }
};

// Run fetch and process immediately when the server starts
fetchAndProcessNews();

// Schedule the cron job to run every day at midnight
cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled cron job...');
    await fetchAndProcessNews();
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Node.js server running on port ${PORT}`);
});
