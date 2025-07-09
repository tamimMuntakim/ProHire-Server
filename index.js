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
            const result = await jobsAndInternsCollection.insertOne(newJobAndIntern);
            res.send(result);
        })



        app.post("/users", async (req, res) => {
            const newUser = req.body;
            const user = await usersCollection.insertOne(newUser);
            res.send(user);
        });

        // GET APIs
        app.get('/jobsAndInterns', async (req, res) => {
            let cursor = jobsAndInternsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/jobsAndInterns/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id),
            };
            const result = await jobsAndInternsCollection.findOne(query);
            res.send(result);
        })

        app.get('/onlyJobs', async (req, res) => {
            let cursor = jobsAndInternsCollection.find({
                jobType: { $in: ["Full-time", "Part-time"] }
            });
            if (req.query?.limit == "true") {
                cursor = cursor.limit(6);
            }
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/onlyInterns', async (req, res) => {
            let cursor = jobsAndInternsCollection.find({
                jobType: "Internship"
            });
            if (req.query?.limit == "true") {
                cursor = cursor.limit(6);
            }
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get("/users", async (req, res) => {
            const email = req.query?.email;
            if (!email) {
                return res.status(400).json({ error: "Email query param is required" });
            }
            try {
                const user = await usersCollection.findOne({ email });

                if (user) {
                    res.status(200).json({ exists: true, user });
                } else {
                    res.status(404).json({ exists: false, user: null });
                }
            } catch (error) {
                console.error("Error fetching user:", error);
                res.status(500).json({ error: "Internal server error" });
            }
        });

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