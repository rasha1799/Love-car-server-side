const express = require("express");
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;

const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

const admin = require("firebase-admin");

const serviceAccount = require("./r-car-7b87e-firebase-adminsdk-zo6cw-cef91fc109.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bcphh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}
async function run() {
  try {
    await client.connect();
    const packageCollection = client.db("Packages");
    const services = packageCollection.collection("services");
    const ordersCollection = packageCollection.collection("orders");
    const ordersFormCollection = packageCollection.collection("newOrders");
    const reviewCollection = packageCollection.collection("review");
    const usersCollection = packageCollection.collection("users");
    //get API
    app.get("/services", async (req, res) => {
      const cursor = services.find({});
      const service = await cursor.toArray();
      res.send(service);
    });
    //get API
    app.get("/review", async (req, res) => {
      const cursor = reviewCollection.find({});
      const review = await cursor.toArray();
      res.send(review);
    });

    //post API
    app.post("/services", async (req, res) => {
      const service = req.body;

      const result = await services.insertOne(service);
      res.json(result);
    });
    //post API
    app.post("/review", async (req, res) => {
      const review = req.body;

      const result = await reviewCollection.insertOne(review);
      res.json(result);
    });
    //post API
    app.post("/users", async (req, res) => {
      const user = req.body;

      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
    });
    //get API
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      console.log(req.headers);
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    //Update API
    app.put("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email };
      const options = { upsert: true };
      const update = { $set: user };
      const result = await usersCollection.updateOne(query, update, options);

      res.json(result);
    });

    //Put API
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role == "admin") {
          const query = { email: user.email };
          const update = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(query, update);
          res.json(result);
        } else {
          res.status(403).json({ message: "Invalid email address" });
        }
      }
    });

    //get my Orders
    app.get("/myOrders/:email", async (req, res) => {
      const result = await ordersFormCollection
        .find({ email: req.params.email })
        .toArray();
      res.send(result);
    });
    //get my Orders
    app.get("/allOrders", async (req, res) => {
      const result = await ordersFormCollection.find({}).toArray();
      res.send(result);
    });
    //add order to database
    app.post("/addOrders", (req, res) => {
      ordersCollection.insertOne(req.body).then((result) => {
        console.log(result);
        res.send(result);
      });
    });
    //Delete api
    app.delete("/deleteOrders/:id", async (req, res) => {
      const result = await ordersFormCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });

      res.send(result);
    });
    //Delete api
    app.delete("/deleteProducts/:id", async (req, res) => {
      const result = await services.deleteOne({ _id: ObjectId(req.params.id) });
      console.log(result);
      res.send(result);
    });

    app.post("/addOrdersForm", (req, res) => {
      ordersFormCollection.insertOne(req.body).then((result) => {
        res.send(result);
      });
    });
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("running server");
});

app.listen(port, () => {
  console.log("listening on port", port);
});
