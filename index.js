const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const cors = require('cors');
app.use(cors());
require('dotenv').config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.evyh5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();

        const roomCollection = client.db("rental").collection("rooms");
        const reviewCollection = client.db("rental").collection("reviews");
        const serviceCollection = client.db("rental").collection("services");
        const blogCollection = client.db("rental").collection("blogs");
        const subscribeCollection = client.db("rental").collection("subscribed");
        const bookingCollection = client.db("rental").collection("bookings");

        app.get('/', (req, res) => {
            res.send(`Server is running on ${port}`)
        });
        // get all rooms
        app.get('/rooms', async (req, res) => {
            const rooms = await roomCollection.find({}).toArray();
            res.send(rooms);
        });

        // get all reviews
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewCollection.find({}).toArray();
            res.send(reviews);
        });

        // get all service
        app.get('/services', async (req, res) => {
            const services = await serviceCollection.find({}).toArray();
            res.send(services);
        });

        // get all blogs
        app.get('/blogs', async (req, res) => {
            const blogs = await blogCollection.find({}).toArray();
            res.send(blogs);
        });

        // get room details
        app.get('/room/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await roomCollection.findOne(query);
            res.send(result)
        });

        // insert a email to subscribe collection
        app.post('/subscribe', async (req, res) => {
            const email = req.query.email;
            const exist = await subscribeCollection.findOne({ email });
            if (!exist) {
                const result = await subscribeCollection.insertOne({ email });
                res.send(result)
            }
            else {
                res.send({ message: 'Already Subscribed' })
            }
        });

        // get specific blog detail 
        app.get('/blogdetail/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await blogCollection.findOne(query);
            res.send(result);
        });

        // insert a booking
        app.post('/bookOne', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });

        // Get a user's bookings
        app.get('/mybookings', async (req, res) => {
            const email = req.query.email;
            const bookings = await bookingCollection.find({ email }).toArray();
            res.send(bookings);
        });

        // Delete a user's booking
        app.delete('/mybooking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result)
        });

        // Get all bookings
        app.get('/allbookings', async (req, res) => {
            const result = await bookingCollection.find({}).toArray();
            res.send(result);
        });

        // Update booking status
        app.put('/booking/update/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const updatedStatus = req.body;
            const updateDoc = {
                $set: {
                    status: updatedStatus.status
                }
            };
            const options = { upsert: true };
            const result = await bookingCollection.updateOne(query, updateDoc, options);
            res.send(result);

        });

        // Update booking payment status
        app.put('/booking/update/paymentStatus/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const updatedPayment = req.body;
            const updatePayStatus = {
                $set: {
                    payment: updatedPayment.payment
                }
            };
            const options = { upsert: true };
            const result = await bookingCollection.updateOne(query, updatePayStatus, options);
            res.send(result);
        })




    }

    finally {
        // await client.close();
    }

} run().catch(console.dir);


app.listen(port, () => {
    console.log('Server is running on port ' + port);
})
