require("dotenv").config();
const express = require('express');
const app = express();
const cors = require("cors");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.izk2qgm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const jobsAndInternsCollection = client.db("proHireDB").collection("jobsAndInterns");
        const usersCollection = client.db("proHireDB").collection("users");

        // POST APIs
        app.post('/jobsAndInterns', async (req, res) => {
            const newJobAndIntern = req.body;
            const result = await marathonsCollection.insertOne(newJobAndIntern);
            res.send(result);
        })

        // GET APIs
        app.get('/jobsAndInterns', async (req, res) => {
            let cursor = jobsAndInternsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // PUT APIs


        // PATCH APIs


        // DELETE APIs

    } finally {
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('ProHire Server is hiring')
})

app.listen(port, () => {
    console.log(`ProHire Server listening on port ${port}`)
})