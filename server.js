require("dotenv").config();

const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TWELVE_DATA_API_KEY;

app.use(express.static(__dirname));

app.get("/api/velas", async (req, res) => {
  try {
    const { symbol, interval } = req.query;

    if (!symbol || !["1min", "5min"].includes(interval)) {
      return res.status(400).json({ message: "Par o intervalo inválido" });
    }

    if (!API_KEY) {
      return res.status(500).json({ message: "Falta API KEY del servidor" });
    }

    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("outputsize", "30");
    url.searchParams.set("apikey", API_KEY);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.values) {
      return res.status(400).json({
        message: data.message || "Error de Twelve Data"
      });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: "Error de conexión" });
  }
});

app.listen(PORT, () => {
  console.log(`TRADING BOT funcionando en puerto ${PORT}`);
});
