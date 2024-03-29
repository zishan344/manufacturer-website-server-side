const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mep9k.mongodb.net/?retryWrites=true&w=majority`;
/* const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@main-shard-00-00-03xkr.mongodb.net:27017,main-shard-00-01-03xkr.mongodb.net:27017,main-shard-00-02-03xkr.mongodb.net:27017/main?ssl=true&replicaSet=Main-shard-0&authSource=admin&retryWrites=true
`; */
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
    const paymentCollection = client.db("carTools").collection("payments");
    // ver
    function verifyJwt(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: "UnAuthorized access" });
      }
      const token = authHeader.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
          return res.status(403).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    }

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden" });
      }
    };

    app.put("/users/admin/:email", verifyJwt, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch(
      "/users/removeAdmin/:email",
      verifyJwt,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        const updatedDoc = {
          $set: { role: "user" },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

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
    app.get("/product/:id", verifyJwt, async (req, res) => {
      const product = await productCollection.findOne({
        _id: ObjectId(req.params.id),
      });
      res.send(product);
    });

    // delete product
    app.delete("/product/:id", verifyJwt, verifyAdmin, async (req, res) => {
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
    app.get("/booking", verifyJwt, verifyAdmin, async (req, res) => {
      const products = await bookingCollection.find({}).toArray();
      res.send(products);
    });
    // get single user product
    app.get("/booking/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const products = await bookingCollection.find({ email }).toArray();
      res.send(products);
    });

    // get single booking
    app.get("/userBooking/:id", verifyJwt, async (req, res) => {
      const product = await bookingCollection.findOne({
        _id: ObjectId(req.params.id),
      });
      res.send(product);
    });

    // delete self booking
    app.delete("/booking/:id", verifyJwt, async (req, res) => {
      const singleProduct = await bookingCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.send(singleProduct);
    });

    // review collection
    //  post a review
    app.post("/review", async (req, res) => {
      const product = req.body;
      const result = await reviewCollection.insertOne(product);
      res.send(result);
    });

    // get all review
    app.get("/reviews", async (req, res) => {
      const products = await reviewCollection.find({}).toArray();
      res.send(products);
    });

    // get all user
    app.get("/allUser", verifyJwt, verifyAdmin, async (req, res) => {
      const users = await userCollection.find({}).toArray();
      res.send(users);
    });
    // get single user
    app.get("/user/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const users = await userCollection.findOne({ email: email });
      res.send(users);
    });

    // payment
    app.post("/create-payment-intent", verifyJwt, async (req, res) => {
      const service = req.body;
      const price = service.totalPrice;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });
    app.patch("/booking/:id", verifyJwt, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          status: "pending",
          transactionId: payment.transactionId,
        },
      };

      const result = await paymentCollection.insertOne(payment);
      const updatedBooking = await bookingCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedBooking);
    });
    app.patch("/order/:id", verifyJwt, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "delivered",
        },
      };
      const updatedBooking = await bookingCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedBooking);
    });
    app.put("/profile/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const cart = req.body;
      // console.log(cart);
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          location: cart?.location,
          education: cart?.education,
          phone: cart?.phone,
          linkedin: cart?.linkedin,
        },
      };
      const updatedProfile = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(updatedProfile);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Worldss!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

/* https://i.ibb.co/xqkv2Gj/bummper.jpg
https://i.ibb.co/R6NF14R/car-disk.jpg
https://i.ibb.co/VTdKwkt/car-headlight.png
https://i.ibb.co/J3NjXqF/disk.png
https://i.ibb.co/QvBWFVk/download.png
https://i.ibb.co/MnPCL7f/gas-padel.jpg
https://i.ibb.co/sQ2nTHJ/gas-padel-2.jpg
https://i.ibb.co/DL0DvHr/oil-filter.jpg
https://i.ibb.co/nCHt3MB/pngwing-com.png
https://i.ibb.co/JKHMJXj/side-miror.jpg
https://i.ibb.co/G3JFQGL/Steering-Wheel.png
https://i.ibb.co/zFkm2GR/Wiper-blade.jpg */
