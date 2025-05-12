
import React, { useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import {
  Chart as ChartJS,
  LineElement, CategoryScale, LinearScale, PointElement
} from 'chart.js';
import { HeatMapGrid } from 'react-grid-heatmap';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

// List of supported tickers
const STOCKS = ["NVDA", "PYPL", "TSLA", "AAPL", "AMZN"];

export default function StockChart({ showHeatmap = false }) {
  const [ticker, setTicker] = useState('NVDA');
  const [minutes, setMinutes] = useState(50);
  const [data, setData] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);

  const fetchData = async () => {
    if (!ticker) return alert("Enter a ticker symbol");
    try {
      const res = await axios.get(`http://localhost:3001/stocks/${ticker}?minutes=${minutes}&aggregation=average`);
      setData(res.data);
    } catch (err) {
      alert("Failed to fetch. Check ticker or backend.");
      console.error('Fetch error:', err.message);
    }
  };

  const fetchHeatmap = async () => {
    const matrix = [];
    for (let i = 0; i < STOCKS.length; i++) {
      const row = [];
      for (let j = 0; j < STOCKS.length; j++) {
        if (i === j) {
          row.push(1);
        } else {
          try {
            const res = await axios.get(`http://localhost:3001/stockcorrelation`, {
              params: { minutes, ticker: [STOCKS[i], STOCKS[j]] }
            });
            row.push(res.data.correlation);
          } catch (err) {
            console.error(`Error for ${STOCKS[i]} & ${STOCKS[j]}`, err.message);
            row.push(0);
          }
        }
      }
      matrix.push(row);
    }
    setHeatmapData(matrix);
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        {showHeatmap ? "📊 Correlation Heatmap" : "📈 Stock Price Chart"}
      </Typography>

      {!showHeatmap && (
        <>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Ticker (e.g. NVDA)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
            />
            <TextField
              label="Minutes"
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
            <Button variant="contained" onClick={fetchData}>Fetch</Button>
          </Box>

          {data && data.priceHistory && (
            <Line
              data={{
                labels: data.priceHistory.map(p =>
                  new Date(p.lastUpdatedAt).toLocaleTimeString()
                ),
                datasets: [
                  {
                    label: `${ticker} Price`,
                    data: data.priceHistory.map(p => p.price),
                    borderColor: 'blue',
                    fill: false,
                  },
                  {
                    label: 'Average Price',
                    data: Array(data.priceHistory.length).fill(data.averageStockPrice),
                    borderColor: 'red',
                    borderDash: [5, 5],
                    fill: false,
                  }
                ]
              }}
            />
          )}
        </>
      )}

      {showHeatmap && (
        <>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Minutes"
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
            <Button variant="contained" onClick={fetchHeatmap}>Generate Heatmap</Button>
          </Box>

          {heatmapData.length > 0 && (
            <Box mt={4} style={{ overflowX: 'auto' }}>
              <div style={{ width: '600px', margin: '0 auto' }}>
                <HeatMapGrid
                  data={heatmapData}
                  xLabels={STOCKS}
                  yLabels={STOCKS}
                  xLabelsStyle={() => ({ fontSize: '14px', padding: '8px' })}
                  yLabelsStyle={() => ({ fontSize: '14px', padding: '8px' })}
                  cellRender={(value) => (
                    <div title={`Correlation: ${value?.toFixed(4)}`} style={{
                      fontSize: '12px',
                      textAlign: 'center',
                      minWidth: '50px',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #ccc'
                    }}>
                      {value?.toFixed(2)}
                    </div>
                  )}
                  background={(x, y, value) => {
                    const abs = Math.min(Math.abs(value), 1);
                    const hue = value > 0 ? 120 : 0; // green or red
                    const lightness = 95 - abs * 60; // stronger contrast
                    return `hsl(${hue}, 100%, ${lightness}%)`;
                  }}
                />
              </div>
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
