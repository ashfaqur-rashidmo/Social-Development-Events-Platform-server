import express from "express";
import cors from "cors";
import { MongoClient,ObjectId } from 'mongodb';
import 'dotenv/config'


const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URI);


export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    throw err;
  }
}


const mongoClient = await connectToMongoDB();

const db = mongoClient.db("social-events");

const eventsCollection = db.collection("events");


app.get("/", (req, res) => {
  res.send("Server is running");
});

// create a new event
// http://localhost:5000/events
app.post("/events", async(req, res) => {
    const data = req.body;
    const result = await eventsCollection.insertOne(data);
    console.log("Event created:", result);
    console.log("Event data:", data);
    res.send("Event created successfully");
})

// get the event data from DB in upcoming events page
// http://localhost:5000/upcoming-events
app.get("/upcoming-events", async (req, res) => {
  const result = await eventsCollection.find({}).toArray();
  res.send(result);
})

// create a single event page with the event id
app.get("/events/:id", async (req, res) => {
  const {id} = req.params;
  const result = await eventsCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});