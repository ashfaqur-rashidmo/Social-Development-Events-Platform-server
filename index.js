import express from "express";
import cors from "cors";
import { MongoClient } from 'mongodb';
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

