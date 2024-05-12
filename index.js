const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(
  cors({
    origin: ["https://restaurant-ass-11.web.app", "http://localhost:5173"],
    credentials: true,
    // some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);
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
const orders = database.collection("orders");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    app.get("/purchase", async (req, res) => {
      const foodId = req.query.id;
      const quantity = req.query.quantity;
      const uid = req.query.uid;
      const date = req.query.date;

      restaurent.findOneAndUpdate(
        { _id: new ObjectId(foodId) },
        { $inc: { quantity: -quantity, count: 1 } }
      );
      const purchaseData = {
        uid: uid,
        foodId: foodId,
        orderQuantity: parseInt(quantity),
        date: date,
      };

      try {
        const sendInfo = await orders.insertOne(purchaseData);
        res.status(200).send(sendInfo);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    app.get("/mypurchase/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { uid: uid };
      try {
        const orderedFood = await orders.find(query).toArray();

        let foods = [];
        for (const items of orderedFood) {
          const foodId = new ObjectId(items.foodId);
          const food = await restaurent.findOne({ _id: foodId });

          if (food) {
            food.orderQuantity = items.orderQuantity;
            food.date = items.date;
            food.orderId = items._id;
            food.totalPayable =
              parseFloat(items.orderQuantity) * parseFloat(food.price);
            foods.push(food);
          } else {
            console.log(`Food with ID ${foodId} not found.`);
          }
        }

        res.status(200).send(foods);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    app.get("/myfoods/:uid", async (req, res) => {
      const uid = req.params.uid;

      try {
        const foods = await restaurent.find({ uid: uid }).toArray();

        res.status(200).send(foods);
      } catch (error) {
        res.status(500).send(error);
      }
    });
    app.get("/foods/search", async (req, res) => {
      const query = req.query.q;
      try {
        const foods = await restaurent
          .find({
            food_name: { $regex: query, $options: "i" },
          })
          .toArray();

        res.status(200).send(foods);
      } catch (err) {
        res.status(500).send(err);
      }
    });

    app.get("/fooddetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const food = await restaurent.findOne(query);

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

    app.post("/addFood", async (req, res) => {
      const food = req.body;
      try {
        const foodData = await restaurent.insertOne(food);
        res.status(200).send(foodData);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    app.delete("/deleteorder/:orderId", async (req, res) => {
      const order = req.params.orderId;

      const query = { _id: new ObjectId(order) };
      try {
        const deleteOrder = await orders.deleteOne(query);
        res.status(200).send(deleteOrder);
      } catch (error) {
        res.status(500).send(error);
      }
    });
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
