
require("dotenv").config();

const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TWELVE_DATA_API_KEY;

app.use(express.static(__dirname));

app.get("/api/velas", async (req, res) => {

  try {

    let { symbol, interval } = req.query;

    // VALIDAR DATOS
    if (!symbol || !interval) {
      return res.status(400).json({
        error: "Ingresá un par de divisas y un período."
      });
    }

    // VALIDAR PERÍODOS
    const intervalosPermitidos = [
      "1min",
      "5min"
    ];

    if (!intervalosPermitidos.includes(interval)) {
      return res.status(400).json({
        error: "Período no válido."
      });
    }

    // VALIDAR API KEY
    if (!API_KEY) {
      return res.status(500).json({
        error: "Falta TWELVE_DATA_API_KEY en Render."
      });
    }

    // NORMALIZAR PAR
    let cleanSymbol = symbol
      .trim()
      .replace(/\s/g, "")
      .toUpperCase();

    // ACEPTAR EURUSD O EUR/USD
    if (!cleanSymbol.includes("/")) {

      if (/^[A-Z]{6}$/.test(cleanSymbol)) {
        cleanSymbol =
          cleanSymbol.substring(0, 3) +
          "/" +
          cleanSymbol.substring(3, 6);
      } else {
        return res.status(400).json({
          error: "Par de divisas inválido. Ejemplo: EUR/USD."
        });
      }

    }

    // VALIDAR FORMATO
    if (!/^[A-Z]{3}\/[A-Z]{3}$/.test(cleanSymbol)) {
      return res.status(400).json({
        error: "Formato incorrecto. Ejemplo: EUR/USD."
      });
    }

    // CONSULTAR TWELVE DATA
    const url = new URL(
      "https://api.twelvedata.com/time_series"
    );

    url.searchParams.set("symbol", cleanSymbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("outputsize", "500");
    url.searchParams.set("apikey", API_KEY);

    const response = await fetch(url);

    const data = await response.json();

    // CONTROLAR ERRORES DE API
    if (
      !response.ok ||
      data.status === "error" ||
      !data.values
    ) {
      console.error("TWELVE DATA:", data);

      return res.status(400).json({
        error: data.message || "No se pudieron obtener las velas."
      });
    }

    // FILTRAR VELAS CERRADAS
    const ahora = Date.now();

    const duracion =
      interval === "1min"
        ? 60000
        : 300000;

    const velas = data.values
      .map(v => {

        const fecha = new Date(
          v.datetime.replace(" ", "T") + "Z"
        ).getTime();

        return {
          ...v,
          timestamp: fecha
        };

      })
      .filter(v =>
        Number.isFinite(v.timestamp) &&
        v.timestamp + duracion <= ahora
      )
      .sort((a, b) =>
        a.timestamp - b.timestamp
      )
      .map(({ timestamp, ...v }) => v);

    if (velas.length === 0) {
      return res.status(400).json({
        error: "No hay velas cerradas disponibles."
      });
    }

    // RESPUESTA
    return res.json({
      symbol: cleanSymbol,
      interval: interval,
      total: velas.length,
      values: velas
    });

  } catch (error) {

    console.error("ERROR DEL SERVIDOR:", error);

    return res.status(500).json({
      error: "Error interno del servidor."
    });

  }

});

// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(
    `TRADING BOT funcionando en puerto ${PORT}`
  );
});
