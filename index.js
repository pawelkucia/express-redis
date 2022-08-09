const express = require('express');
const axios = require('axios');
const cors = require('cors');
const Redis = require('redis');

const PORT = 3000;
const DEFAULT_EXPIRATION = 3600;

const redisClient = Redis.createClient(); // local redis server
const app = express();

app.use(cors());
// Body parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/photos', async (req, res) => {
    const albumId = req.query.albumId;

    const photos = await getFromCache(`photos?albumId=${albumId}`, async () => {
        const { data } = await axios.get("https://jsonplaceholder.typicode.com/photos", { params: { albumId } });
        return data;
    });

    res.json(photos);

    /*
    const photos = await redisClient.get(`photos?albumId=${albumId}`);

    if (photos != null) {
        console.log('From cache.');
        res.json(JSON.parse(photos));
    } else {
        console.log('From API.');
        const { data } = await axios.get("https://jsonplaceholder.typicode.com/photos", { params: { albumId } });
        await redisClient.setEx(`photos?albumId=${albumId}`, DEFAULT_EXPIRATION, JSON.stringify(data));
        res.json(data);
    }
    */
});

app.get('/photos/:id', async (req, res) => {
    const photo = await getFromCache(`photos:${req.params.id}`, async () => {
        const { data } = await axios.get(`https://jsonplaceholder.typicode.com/photos/${req.params.id}`);
        return data;
    });

    res.json(photo);
});

function getFromCache(key, cb) {
    return new Promise(async (resolve, reject) => {
        try {
            const data = await redisClient.get(key);

            if (data != null) {
                console.log('From cache.');
                resolve(JSON.parse(data));
            } else {
                console.log('From API.');
                let newData = await cb();
                await redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(newData));
                resolve(newData);
            }
        } catch (error) {
            reject(error);
        }
    });
}

try {
    app.listen(PORT, async () => {
        console.log(`Connected successfully on port ${PORT}`);

        // CConnect to DB
        await redisClient.connect();
        console.log('Redis DB connection: OK');
    });
} catch (error) {
    console.error(`Error occured: ${error}`);
}