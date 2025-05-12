const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3001;

// ✅ Latest working token
const AUTH_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQ3MDU4NjM3LCJpYXQiOjE3NDcwNTgzMzcsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjYyNjIxYmQxLTk2ZWQtNGM0Zi05YjEzLWJiNTE1ZDI4ZWQxMSIsInN1YiI6InBpbm5pbnRpYW5qdTIwMDVAZ21haWwuY29tIn0sImVtYWlsIjoicGlubmludGlhbmp1MjAwNUBnbWFpbC5jb20iLCJuYW1lIjoicGlubmludGkgYW5qdSBjaG93ZGFyeSIsInJvbGxObyI6ImFpZTIyMTcwIiwiYWNjZXNzQ29kZSI6IlN3dXVLRSIsImNsaWVudElEIjoiNjI2MjFiZDEtOTZlZC00YzRmLTliMTMtYmI1MTVkMjhlZDExIiwiY2xpZW50U2VjcmV0IjoiUWJ3bVd5Zm13eFZUZkV0dyJ9.mUFclVq6KyAU5VhPYquT-obtwYFk2y1JZB7dFEEczCc";

const BASE_URL = "http://20.244.56.144/evaluation-service";

app.use(express.json());

// ✅ Root Route
app.get('/', (req, res) => {
  res.send('Affordmed Backend Running');
});

// ✅ Average Stock Price API
app.get('/stocks/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const { minutes, aggregation } = req.query;

  try {
    const response = await axios.get(`${BASE_URL}/stocks/${ticker}?minutes=${minutes}`, {
      headers: {
        Authorization: AUTH_TOKEN
      }
    });

    const priceHistory = response.data;

    if (!Array.isArray(priceHistory) || priceHistory.length === 0) {
      return res.status(404).json({ error: 'No price data found for this stock and interval.' });
    }

    if (aggregation === 'average') {
      const sum = priceHistory.reduce((acc, entry) => acc + entry.price, 0);
      const average = sum / priceHistory.length;

      return res.json({
        averageStockPrice: parseFloat(average.toFixed(6)),
        priceHistory
      });
    } else {
      return res.status(400).json({ error: 'Invalid or unsupported aggregation type. Only "average" is supported.' });
    }

  } catch (err) {
    if (err.response) {
      console.error("Test Server Error:", err.response.status);
      console.error("Message:", err.response.data);
    } else {
      console.error("Internal Error:", err.message);
    }
    res.status(500).json({ error: 'Failed to fetch stock data from test server.' });
  }
});

// ✅ Correlation Calculation Function
function calculateCorrelation(xArr, yArr) {
  const n = Math.min(xArr.length, yArr.length);
  const x = xArr.slice(0, n).map(p => p.price);
  const y = yArr.slice(0, n).map(p => p.price);

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  const covariance = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0) / (n - 1);
  const stdDevX = Math.sqrt(x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0) / (n - 1));
  const stdDevY = Math.sqrt(y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0) / (n - 1));

  const correlation = covariance / (stdDevX * stdDevY);
  return parseFloat(correlation.toFixed(4));
}

// ✅ Correlation API
app.get('/stockcorrelation', async (req, res) => {
  const { minutes, ticker } = req.query;

  if (!Array.isArray(ticker) || ticker.length !== 2) {
    return res.status(400).json({ error: 'Exactly two ticker symbols are required.' });
  }

  const [tickerA, tickerB] = ticker;

  try {
    const [resA, resB] = await Promise.all([
      axios.get(`${BASE_URL}/stocks/${tickerA}?minutes=${minutes}`, {
        headers: { Authorization: AUTH_TOKEN }
      }),
      axios.get(`${BASE_URL}/stocks/${tickerB}?minutes=${minutes}`, {
        headers: { Authorization: AUTH_TOKEN }
      })
    ]);

    const historyA = resA.data;
    const historyB = resB.data;

    const avgA = historyA.reduce((sum, p) => sum + p.price, 0) / historyA.length;
    const avgB = historyB.reduce((sum, p) => sum + p.price, 0) / historyB.length;

    const correlation = calculateCorrelation(historyA, historyB);

    return res.json({
      correlation,
      stocks: {
        [tickerA]: {
          averagePrice: parseFloat(avgA.toFixed(6)),
          priceHistory: historyA
        },
        [tickerB]: {
          averagePrice: parseFloat(avgB.toFixed(6)),
          priceHistory: historyB
        }
      }
    });

  } catch (err) {
    if (err.response) {
      console.error('Correlation API failed:', err.response.status);
      console.error('Message:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
    res.status(500).json({ error: 'Failed to compute stock correlation' });
  }
});

// ✅ Start the server last
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
