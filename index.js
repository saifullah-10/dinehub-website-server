const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 3000;
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};
//localhost:5000 and localhost:5173 are treated as same site.  so sameSite value must be strict in development server.  in production sameSite will be none
// in development server secure will false .  in production secure will be true

// middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://cardoctor-bd.web.app",
      "https://cardoctor-bd.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).send({ status: "unauthorized" });
    }
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).send({ status: "unauthorized" });
  }
};

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
const feedback = database.collection("feedback_gallery");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    // jwt section
    app.post("/jwt", async (req, res) => {
      const uid = req.body;
      console.log(uid);
      const token = jwt.sign(uid, process.env.JWT_SECRET, { expiresIn: "1h" });
      res
        .status(200)
        .cookie("token", token, cookieOptions)
        .send({ status: "success" });
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // res.status(200).send(decoded);
    });
    // jwt section

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

    app.get("/mypurchase/:uid", verifyToken, async (req, res) => {
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
            const payable =
              parseFloat(items.orderQuantity) * parseFloat(food.price);
            food.totalPayable = payable.toFixed(2);
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

    app.get("/myfoods/:uid", verifyToken, async (req, res) => {
      const uid = req.params.uid;

      try {
        const foods = await restaurent
          .find({ uid: uid })
          .sort({ $natural: -1 })
          .toArray();

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

    app.get("/allfoods", async (req, res) => {
      const cursor = await restaurent.find().sort({ $natural: -1 }).toArray();
      res.send(cursor);
    });

    app.get("/homecard", async (req, res) => {
      const elementAmount = req.query.elements;
      const cursor = await restaurent
        .aggregate([
          { $sort: { count: -1 } },
          { $limit: parseInt(elementAmount) },
        ])
        .toArray();

      res.send(cursor);
    });

    app.get("/feedbackdata", async (req, res) => {
      try {
        const cursor = await feedback.find().sort({ $natural: -1 }).toArray();
        res.send(cursor);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    app.post("/feedback", async (req, res) => {
      const feedbackData = req.body;
      try {
        const sendInfo = await feedback.insertOne(feedbackData);
        res.status(200).send(sendInfo);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    app.post("/updatefoods/:id", async (req, res) => {
      const id = req.params.id;
      const food = req.body;
      console.log(id, food);
      const query = { _id: new ObjectId(id) };

      try {
        const foodData = await restaurent.updateOne(query, { $set: food });

        res.status(200).send(foodData);
      } catch (error) {
        res.status(500).send(error);
      }
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
    app.post("/deleteaddfood/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const foodData = await restaurent.deleteOne(query);
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
