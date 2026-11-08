
require("dotenv").config();

const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TWELVE_DATA_API_KEY;

app.use(express.static(__dirname));

app.get("/api/velas", async (req, res) => {

  try {

    let { symbol, interval } = req.query;

    if (!symbol || !interval) {
      return res.status(400).json({
        error: "Falta el par de divisas o el período."
      });
    }

    // PERÍODOS PERMITIDOS
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

    // FORMATO DEL PAR
    let cleanSymbol = symbol
      .trim()
      .replace(/\s/g, "")
      .toUpperCase();

    if (/^[A-Z]{6}$/.test(cleanSymbol)) {
      cleanSymbol =
        cleanSymbol.slice(0, 3) +
        "/" +
        cleanSymbol.slice(3, 6);
    }

    if (!/^[A-Z]{3}\/[A-Z]{3}$/.test(cleanSymbol)) {
      return res.status(400).json({
        error: "Par inválido. Ejemplo: EUR/USD."
      });
    }

    // CONSULTA A TWELVE DATA
    const url = new URL(
      "https://api.twelvedata.com/time_series"
    );

    url.searchParams.set("symbol", cleanSymbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("outputsize", "500");
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("apikey", API_KEY);

    const response = await fetch(url);
    const data = await response.json();

    if (
      !response.ok ||
      data.status === "error" ||
      !Array.isArray(data.values)
    ) {
      console.error("ERROR TWELVE DATA:", data);

      return res.status(400).json({
        error: data.message || "Error obteniendo las velas."
      });
    }

    // CONVERTIR Y ORDENAR LAS VELAS
    const velas = data.values
      .map(v => ({
        datetime: v.datetime,
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
        volume: Number(v.volume || 0)
      }))
      .filter(v =>
        Number.isFinite(v.open) &&
        Number.isFinite(v.high) &&
        Number.isFinite(v.low) &&
        Number.isFinite(v.close)
      )
      .sort((a, b) =>
        new Date(a.datetime + "Z") -
        new Date(b.datetime + "Z")
      );

    // DEVOLVER DATOS
    return res.json({
      symbol: cleanSymbol,
      interval: interval,
      total: velas.length,
      values: velas
    });

  } catch (error) {

    console.error("ERROR SERVIDOR:", error);

    return res.status(500).json({
      error: "Error interno del servidor."
    });

  }

});

app.listen(PORT, () => {
  console.log(
    `TRADING BOT funcionando en puerto ${PORT}`
  );
});
