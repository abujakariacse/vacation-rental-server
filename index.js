const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion } = require('mongodb');

const cors = require('cors');
app.use(cors());
require('dotenv').config()

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.evyh5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();

        console.log('DB CONNECTED');
        app.get('/', (req, res) => {
            res.send(`Server is running on ${port}`)
        });

    }

    finally {
        // await client.close();
    }

} run().catch(console.dir);


app.listen(port, () => {
    console.log('Server is running on port ' + port);
})
