import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import StockChart from './components/StockChart';
import { Container, AppBar, Toolbar, Button } from '@mui/material';

function App() {
  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit" component={Link} to="/">Stock Chart</Button>
          <Button color="inherit" component={Link} to="/heatmap">Heatmap</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ marginTop: 4 }}>
        <Routes>
          <Route index element={<StockChart />} />
          <Route path="/heatmap" element={<StockChart showHeatmap />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;
