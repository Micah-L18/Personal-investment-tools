import { Router } from 'express';
const router = Router();

router.get('/stock', (req, res) => {

    // utilizing yahoo https://query1.finance.yahoo.com/v8/finance/chart + ticker

    const { ticker } = req.query;
    // console.log(`Fetching stock data for ticker: ${ticker}`);
    const query = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;

    fetch(query)
        .then(response => response.json())
        .then(data => {
            res.send(data);
        })
        .catch(error => {
            console.error("Error fetching stock data:", error);
            res.status(500).send({ error: "Failed to fetch stock data" });
        });
});

export default router;