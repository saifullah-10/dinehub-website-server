const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// mongoDB

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.kpsyb7k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const database = client.db("restaurent");
const restaurent = database.collection("all_foods");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    // app.get("/update", (req, res) => {
    //   const uid = req.query.uid;
    //   const count = 0;
    //   console.log(uid);
    //   restaurent.updateMany({}, [{ $set: { uid: uid, count: count } }]);
    // });

    app.get("/foods/search", async (req, res) => {
      const query = req.query.q;
      try {
        const foods = await restaurent
          .find({
            food_name: { $regex: query, $options: "i" },
          })
          .toArray();
        console.log(foods);
        res.status(200).send(foods);
      } catch (err) {
        res.status(500).send(err);
      }
    });

    app.get("/fooddetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const food = await restaurent.findOne(query);
      console.log(food);
      res.send(food);
    });

    app.get("/homecard", async (req, res) => {
      const elementAmount = req.query.elements;
      const cursor = await restaurent
        .find()
        .limit(parseInt(elementAmount))
        .toArray();
      res.send(cursor);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("server is running");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
