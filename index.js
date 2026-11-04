import express from "express";
import cors from "cors";
import { MongoClient,ObjectId } from 'mongodb';
import 'dotenv/config'
import { createRemoteJWKSet, jwtVerify } from "jose";


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

const joinedCollection = db.collection("joinedEvents");


const JWKS = createRemoteJWKSet(
  new URL("http://localhost:3000/api/auth/jwks")
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      msg: "Unauthorized: Token missing",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      msg: "Unauthorized: Token missing",
    });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);

    // Store verified user information
    req.user = payload;

    console.log("Authenticated user:", req.user.email);

    // Continue to the protected route
    next();

  } catch (error) {
    console.error("JWT verification failed:", error.message);

    return res.status(401).json({
      msg: "Unauthorized: Invalid or expired token",
    });
  }
};




app.get("/", (req, res) => {
  res.send("Server is running");
});


// create a new event
// http://localhost:5000/events
// protected
app.post("/events", verifyToken,  async(req, res) => {
    
    const authHeader = req.headers.authorization;
    console.log("Authorization header:", authHeader);
    

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



// Get events created by a particular user
// protected
app.get("/user-events/:email", verifyToken, async (req, res) => {
  
    const { email } = req.params;

    const result = await eventsCollection.find({ creatorEmail: email }).toArray();

    res.send(result);
  
});


// Get a single event by ID
app.get("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID",
      });
    }

    const event = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).send({
        message: "Event not found",
      });
    }

    res.status(200).send(event);
  } catch (error) {
    console.error("Error fetching event:", error);

    res.status(500).send({
      message: "Failed to fetch event",
    });
  }
});


// protected
app.patch("/events/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { _id, ...updatedData } = req.body;

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Event not found",
      });
    }

    
    res.status(200).send({
      message: "Event updated successfully",
    });

  } catch (error) {
    console.error("Error updating event:", error);

    res.status(500).send({
      message: "Failed to update event",
    });
  }
});


// protected
app.delete("/events/:id", verifyToken, async (req, res) => {
   const { id } = req.params;

   const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });

   res.json("Deleted Successfully",result);
})


// protected
app.post("/joined-events", verifyToken, async (req, res) => {
  try {
    const data = req.body;

    const result = await joinedCollection.insertOne({
      eventId: new ObjectId(data.eventId),
      userEmail: data.userEmail,
      joinedAt: new Date(),
    });

    console.log("Joined event created:", result.insertedId);

    res.status(201).json({
      message: "Joined event created successfully",
    });
  } catch (error) {
    console.error("Error creating joined event:", error);
    res.status(500).json({
      message: "Failed to join event",
    });
  }
});





// protected
app.get("/joined-events/:email", verifyToken, async (req, res) => {
  const { email } = req.params;

  // Find events joined by this user
  const joinedEvents = await joinedCollection
    .find({ userEmail: email })
    .toArray();

  // Get the actual event details
  const events = [];

  for (const joined of joinedEvents) {
    const event = await eventsCollection.findOne({
      _id: joined.eventId,
    });

    if (event) {
      events.push(event);
    }
  }

  res.send(events);
});






app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});