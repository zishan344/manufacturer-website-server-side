const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mep9k.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();
    const productCollection = client.db("carTools").collection("products");
    const bookingCollection = client.db("carTools").collection("booking");
    const reviewCollection = client.db("carTools").collection("reviews");
    const userCollection = client.db("carTools").collection("user");

    // ver

    // jwt
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const accessToken = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "5d",
      });
      res.send({ result: result, accessToken: accessToken });
    });

    //  post a product
    app.post("/product", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });
    // get all product
    app.get("/products", async (req, res) => {
      const products = await productCollection.find({}).toArray();
      res.send(products);
    });
    // find single product
    app.get("/product/:id", async (req, res) => {
      console.log(req.headers.authorization);
      const product = await productCollection.findOne({
        _id: ObjectId(req.params.id),
      });
      res.send(product);
    });

    // delete product
    app.delete("/product/:id", async (req, res) => {
      const singleProduct = await productCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.send(singleProduct);
    });

    //update product
    app.put("/product/:id", async (req, res) => {
      const productId = req.params.id;
      const body = req.body;
      const filter = { _id: ObjectId(productId) };
      const options = { upsert: true };
      const updateDoc = {
        $set: body,
      };
      const result = await productCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // booking collection
    // post booking
    app.post("/booking", async (req, res) => {
      const product = req.body;
      const result = await bookingCollection.insertOne(product);
      res.send(result);
    });
    // get all booking
    app.get("/booking", async (req, res) => {
      const products = await bookingCollection.find({}).toArray();
      res.send(products);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
