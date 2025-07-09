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
        const applicationsCollection = client.db("proHireDB").collection("applications");
        const usersCollection = client.db("proHireDB").collection("users");

        // POST APIs
        app.post('/jobsAndInterns', async (req, res) => {
            const newJobAndIntern = req.body;
            const result = await jobsAndInternsCollection.insertOne(newJobAndIntern);
            res.send(result);
        })

        app.post('/applications', async (req, res) => {
            const newApplication = req.body;
            // Add a timestamp for when the application was received
            newApplication.appliedAt = new Date();
            // Set an initial status for the application
            newApplication.status = "Pending"; // Or "Submitted", etc.

            try {
                const result = await applicationsCollection.insertOne(newApplication);
                res.status(201).send({
                    insertedId: result.insertedId,
                    message: "Application submitted successfully!"
                });
            } catch (error) {
                console.error("Error submitting application:", error);
                res.status(500).send({ message: "Failed to submit application. Please try again later." });
            }
        });

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

        // app.get('/allListings', async (req, res) => {
        //     const page = parseInt(req.query.page) || 1; // Default to page 1
        //     const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page

        //     const skip = (page - 1) * limit;

        //     try {
        //         const totalListings = await jobsAndInternsCollection.countDocuments({}); // Get total count for pagination info
        //         const listings = await jobsAndInternsCollection.find({})
        //             .skip(skip)
        //             .limit(limit)
        //             .toArray();

        //         res.send({
        //             currentPage: page,
        //             totalPages: Math.ceil(totalListings / limit),
        //             totalItems: totalListings,
        //             listings: listings
        //         });
        //     } catch (error) {
        //         console.error("Error fetching all listings with pagination:", error);
        //         res.status(500).send({ message: "Failed to fetch listings" });
        //     }
        // });

        app.get('/allListings', async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Build filter object from query parameters
            const filter = {};
            if (req.query.jobType) {
                filter.jobType = req.query.jobType;
            }
            if (req.query.employmentType) {
                filter.employmentType = req.query.employmentType;
            }
            if (req.query.industry) {
                filter.industry = req.query.industry;
            }
            if (req.query.paid) {
                filter.paid = req.query.paid;
            }

            try {
                // Apply filters to both count and find queries
                const totalListings = await jobsAndInternsCollection.countDocuments(filter);
                const listings = await jobsAndInternsCollection.find(filter)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({
                    currentPage: page,
                    totalPages: Math.ceil(totalListings / limit),
                    totalItems: totalListings,
                    listings: listings
                });
            } catch (error) {
                console.error("Error fetching all listings with pagination and filters:", error);
                res.status(500).send({ message: "Failed to fetch listings" });
            }
        });

        // -----------------
        app.get('/myApplications', async (req, res) => {
            const applicantUserId = req.query.applicantUserId; // Expects the user's ID
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            if (!applicantUserId) {
                return res.status(400).send({ message: "Applicant User ID is required." });
            }

            const filter = { applicantUserId: applicantUserId }; // Start filtering by the user's ID

            // Apply filters based on query parameters from the frontend
            if (req.query.status) {
                filter.status = req.query.status; // Filters by the exact status string (e.g., "Pending", "Accepted", "Rejected")
            }
            if (req.query.jobType) {
                filter.jobType = req.query.jobType;
            }
            if (req.query.employmentType) {
                filter.employmentType = req.query.employmentType;
            }
            // Note: No need to remove `companyName` or `jobTitle` filters here if they were never intended for this specific endpoint.
            // The backend will only apply filters that are present in `req.query`.

            try {
                const totalApplications = await applicationsCollection.countDocuments(filter);
                const applications = await applicationsCollection.find(filter)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({
                    currentPage: page,
                    totalPages: Math.ceil(totalApplications / limit),
                    totalItems: totalApplications,
                    applications: applications
                });
            } catch (error) {
                console.error("Error fetching user applications:", error);
                res.status(500).send({ message: "Failed to fetch applications." });
            }
        });

        app.get('/myPostedJobs', async (req, res) => {
            const employerEmail = req.query.employerEmail; // Expects the recruiter's email
            if (!employerEmail) {
                return res.status(400).send({ message: "Employer email is required." });
            }
            try {
                // Find jobs where 'addedBy' matches the employerEmail
                const postedJobs = await jobsAndInternsCollection.find({ addedBy: employerEmail })
                    .project({ title: 1, companyName: 1 }) // Only return title and companyName
                    .toArray();
                res.send(postedJobs);
            } catch (error) {
                console.error("Error fetching posted jobs:", error);
                res.status(500).send({ message: "Failed to fetch posted jobs." });
            }
        });

        // 2. GET /applicationsByJob: To fetch applications for a specific job ID (for recruiter)
        // app.get('/applicationsByJob', async (req, res) => {
        //     const jobId = req.query.jobId;
        //     const page = parseInt(req.query.page) || 1;
        //     const limit = parseInt(req.query.limit) || 10;
        //     const skip = (page - 1) * limit;

        //     if (!jobId) {
        //         return res.status(400).send({ message: "Job ID is required." });
        //     }

        //     const filter = { jobId: jobId }; // Filter by the specific job ID

        //     // --- NEW: Status filtering logic for recruiter's view ---
        //     // If the recruiter filters by a simplified status, map it to actual backend statuses
        //     if (req.query.status) {
        //         if (req.query.status === 'Pending') {
        //             // If frontend requests 'Pending', include actual 'Pending', 'Reviewed', 'Interview'
        //             filter.status = { $in: ['Pending', 'Reviewed', 'Interview'] };
        //         } else {
        //             // For 'Accepted' and 'Rejected', filter by exact status
        //             filter.status = req.query.status;
        //         }
        //     }
        //     // --- End NEW Status filtering logic ---

        //     try {
        //         const totalApplications = await applicationsCollection.countDocuments(filter);
        //         const applications = await applicationsCollection.find(filter)
        //             .skip(skip)
        //             .limit(limit)
        //             .toArray();

        //         res.send({
        //             currentPage: page,
        //             totalPages: Math.ceil(totalApplications / limit),
        //             totalItems: totalApplications,
        //             applications: applications
        //         });
        //     } catch (error) {
        //         console.error("Error fetching applications by job:", error);
        //         res.status(500).send({ message: "Failed to fetch applications for this job." });
        //     }
        // });

        app.get('/applicationsByJob', async (req, res) => {
            const jobId = req.query.jobId; // Specific job ID (if filtering)
            const employerEmail = req.query.employerEmail; // Employer's email (if showing all their jobs)
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const queryFilter = {}; // Initialize the main filter for applications collection

            try {
                let targetJobIds = [];

                if (jobId) {
                    // If a specific jobId is provided, filter by that
                    targetJobIds.push(jobId);
                } else if (employerEmail) {
                    // If employerEmail is provided (for "all my jobs" view),
                    // first find all job IDs posted by this employer
                    const postedJobs = await jobsAndInternsCollection.find(
                        { addedBy: employerEmail },
                        { projection: { _id: 1 } } // Only fetch the _id
                    ).toArray();
                    targetJobIds = postedJobs.map(job => job._id.toString()); // Convert ObjectIds to strings
                } else {
                    // Neither jobId nor employerEmail provided, return bad request
                    return res.status(400).send({ message: "Job ID or Employer Email is required." });
                }

                // If no jobs found for the employer, return empty results
                if (targetJobIds.length === 0) {
                    return res.send({
                        currentPage: page,
                        totalPages: 0,
                        totalItems: 0,
                        applications: []
                    });
                }

                // Set the jobId filter based on whether it's a single job or multiple
                queryFilter.jobId = { $in: targetJobIds };

                // Apply status filter if present
                if (req.query.status) {
                    if (req.query.status === 'Pending') {
                        queryFilter.status = { $in: ['Pending', 'Reviewed', 'Interview'] };
                    } else {
                        queryFilter.status = req.query.status;
                    }
                }

                const totalApplications = await applicationsCollection.countDocuments(queryFilter);
                const applications = await applicationsCollection.find(queryFilter)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({
                    currentPage: page,
                    totalPages: Math.ceil(totalApplications / limit),
                    totalItems: totalApplications,
                    applications: applications
                });
            } catch (error) {
                console.error("Error fetching applications by job/employer:", error);
                res.status(500).send({ message: "Failed to fetch applications." });
            }
        });

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
        app.patch('/applications/:id/status', async (req, res) => {
            const id = req.params.id;
            const { status } = req.body; // Expects { status: "Accepted" | "Rejected" | "Pending" }

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid Application ID format." });
            }
            // --- CRITICAL: Validate new status against ONLY the three allowed states ---
            if (!status || !['Pending', 'Accepted', 'Rejected'].includes(status)) {
                return res.status(400).send({ message: "Invalid status provided. Must be 'Pending', 'Accepted', or 'Rejected'." });
            }
            // --- End CRITICAL Validation ---

            try {
                const result = await applicationsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: status } }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: "Application not found." });
                }
                res.send({ message: "Application status updated successfully.", modifiedCount: result.modifiedCount });
            } catch (error) {
                console.error("Error updating application status:", error);
                res.status(500).send({ message: "Failed to update application status." });
            }
        });


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