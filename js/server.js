const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());

app.get('/proxy/*', async (req, res) => {
    try {
        const url = req.params[0];
        const response = await fetch(`https://pub.drednot.io/${url}`);
        const data = await response.arrayBuffer();

        // Forward the original headers
        response.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });

        res.send(Buffer.from(data));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('Proxy server running on port 3000');
});
