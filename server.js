
require("dotenv").config();

const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TWELVE_DATA_API_KEY;

app.use(express.static(__dirname));

app.get("/api/velas", async (req, res) => {

  try {

    const { symbol, interval } = req.query;

    if (!symbol || !interval) {
      return res.status(400).json({
        error: "Falta el símbolo o el período."
      });
    }

    if (!["1min", "5min"].includes(interval)) {
      return res.status(400).json({
        error: "Período no válido."
      });
    }

    if (!API_KEY) {
      return res.status(500).json({
        error: "Falta TWELVE_DATA_API_KEY en Render."
      });
    }

    const cleanSymbol = symbol
      .replace(/\//g, "")
      .toUpperCase();

    const url = new URL("https://api.twelvedata.com/time_series");

    url.searchParams.set("symbol", cleanSymbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("outputsize", "500");
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("apikey", API_KEY);

    const response = await fetch(url);

    const data = await response.json();

    if (!response.ok || data.status === "error" || !data.values) {
      return res.status(400).json({
        error: data.message || "No se pudieron obtener las velas."
      });
    }

    const ahora = Date.now();

    const duracion = interval === "1min"
      ? 60000
      : 300000;

    const velas = data.values
      .map(v => ({
        ...v,
        timestamp: Date.parse(v.datetime.replace(" ", "T") + "Z")
      }))
      .filter(v =>
        Number.isFinite(v.timestamp) &&
        v.timestamp + duracion <= ahora
      )
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(({ timestamp, ...v }) => v);

    if (!velas.length) {
      return res.status(400).json({
        error: "No hay velas cerradas disponibles."
      });
    }

    res.json({
      symbol: cleanSymbol,
      interval,
      total: velas.length,
      values: velas
    });

  } catch (error) {

    console.error("ERROR:", error);

    res.status(500).json({
      error: "Error interno al obtener las velas."
    });

  }

});

app.listen(PORT, () => {
  console.log(`TRADING BOT funcionando en puerto ${PORT}`);
});
