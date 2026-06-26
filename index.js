const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 8088;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { slugify } = require("./utils/slugify");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:4173",
      "https://vacation-rental-client.vercel.app",
      "https://rental.abujakaria.dev",
      "https://vacation-rental-aj.web.app",
    ],
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.evyh5.mongodb.net/?appName=Cluster0`;
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.evyh5.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

client
  .connect()
  .then(() => {
    client.db("admin").command({ ping: 1 }).catch(console.dir);
    console.log("Connected to DB");
  })
  .catch(console.dir);

const roomCollection = client.db("rental").collection("rooms");
const reviewCollection = client.db("rental").collection("reviews");
const serviceCollection = client.db("rental").collection("services");
const blogCollection = client.db("rental").collection("blogs");
const subscribeCollection = client.db("rental").collection("subscribed");
const bookingCollection = client.db("rental").collection("bookings");
const usersCollection = client.db("rental").collection("users");
const questionCollection = client.db("rental").collection("questions");
const roomRatingCollection = client.db("rental").collection("roomRatings");
const blogRatingCollection = client.db("rental").collection("blogRatings");

app.get("/", (req, res) => {
  res.send(`Server is running on ${port}`);
});

// get all rooms
app.get("/rooms", async (req, res) => {
  const rooms = await roomCollection.find({}).toArray();
  res.send(rooms);
});

// create a room
app.post("/room", async (req, res) => {
  const room = req.body;
  if (!room?.name || !room?.image) {
    return res.status(400).json({ message: "Name and image are required" });
  }
  const result = await roomCollection.insertOne(room);
  res.status(201).json(result);
});

// update a room
app.put("/room/:id", async (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  const query = { _id: ObjectId(id) };
  const updateDoc = { $set: updates };
  const options = { upsert: false };
  const result = await roomCollection.updateOne(query, updateDoc, options);
  if (result.matchedCount === 0) {
    return res.status(404).json({ message: "Room not found" });
  }
  res.json(result);
});

// delete a room
app.delete("/room/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const result = await roomCollection.deleteOne(query);
  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Room not found" });
  }
  res.json(result);
});

// get all reviews (supports ?homepage=true filter)
app.get("/reviews", async (req, res) => {
  const filter = {};
  if (req.query.homepage === "true") {
    filter.showOnHomepage = true;
  }
  const reviews = await reviewCollection.find(filter).toArray();
  res.send(reviews);
});

// Add a review
app.post("/reviews", async (req, res) => {
  const review = req.body;
  review.showOnHomepage = false;
  review.createdAt = new Date().toISOString();
  const result = await reviewCollection.insertOne(review);
  res.send(result);
});

// Toggle review homepage visibility (admin)
app.put("/review/toggle/:id", async (req, res) => {
  const id = req.params.id;
  const { showOnHomepage } = req.body;
  const result = await reviewCollection.updateOne(
    { _id: ObjectId(id) },
    { $set: { showOnHomepage: !!showOnHomepage } }
  );
  res.json(result);
});

// Delete a review (admin)
app.delete("/review/:id", async (req, res) => {
  const id = req.params.id;
  const result = await reviewCollection.deleteOne({ _id: ObjectId(id) });
  res.json(result);
});

// get all service
app.get("/services", async (req, res) => {
  const services = await serviceCollection.find({}).toArray();
  res.send(services);
});

// get all blogs
app.get("/blogs", async (req, res) => {
  const blogs = await blogCollection.find({}).toArray();
  res.send(blogs);
});

// create a blog
app.post("/blog", async (req, res) => {
  const blog = req.body;
  if (!blog?.title || !blog?.image || !blog?.description || !blog?.post) {
    return res
      .status(400)
      .json({ message: "Title, image, description, and post content are required" });
  }
  const result = await blogCollection.insertOne(blog);
  res.status(201).json(result);
});

// update a blog
app.put("/blog/:id", async (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  const query = { _id: ObjectId(id) };
  const updateDoc = { $set: updates };
  const result = await blogCollection.updateOne(query, updateDoc);
  if (result.matchedCount === 0) {
    return res.status(404).json({ message: "Blog not found" });
  }
  res.json(result);
});

// delete a blog
app.delete("/blog/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const result = await blogCollection.deleteOne(query);
  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Blog not found" });
  }
  res.json(result);
});

// get room details
app.get("/room/:slug", async (req, res) => {
  const slug = req.params.slug;
  if (ObjectId.isValid(slug)) {
    const query = { _id: ObjectId(slug) };
    const result = await roomCollection.findOne(query);
    if (result) return res.send(result);
  }
  
  const rooms = await roomCollection.find({}).toArray();
  const result = rooms.find(r => slugify(r.name) === slug);
  if (result) return res.send(result);
  
  res.status(404).send({message: "Room not found"});
});

// insert a email to subscribe collection
app.post("/subscribe", async (req, res) => {
  const email = req.query.email;
  const exist = await subscribeCollection.findOne({ email });
  if (!exist) {
    const result = await subscribeCollection.insertOne({ email });
    res.send(result);
  } else {
    res.send({ message: "Already Subscribed" });
  }
});
// insert a user to user collection
app.post("/signup", async (req, res) => {
  const userInfo = req.body;
  const email = userInfo.email;
  console.log(email);
  const exist = await usersCollection.findOne({ email });
  if (!exist) {
    const result = await usersCollection.insertOne({
      email: userInfo.email,
      name: userInfo.name,
      role: userInfo.role,
      DOB: userInfo.DOB,
      image: userInfo.image,
      createdAt: new Date().toISOString(),
    });
    res.send(result);
  } else {
    res.send({ message: "Already have an account" });
  }
});

// get specific blog detail
app.get("/blogdetail/:slug", async (req, res) => {
  const slug = req.params.slug;
  let targetBlog = null;

  if (ObjectId.isValid(slug)) {
    targetBlog = await blogCollection.findOne({ _id: ObjectId(slug) });
  }
  
  if (!targetBlog) {
    const blogs = await blogCollection.find({}).toArray();
    targetBlog = blogs.find(b => slugify(b.title) === slug);
  }

  if (targetBlog) {
    await blogCollection.updateOne({ _id: targetBlog._id }, { $inc: { readCount: 1 } });
    targetBlog.readCount = (targetBlog.readCount || 0) + 1;
    return res.send(targetBlog);
  }
  
  res.status(404).send({message: "Blog not found"});
});

// insert a booking
app.post("/bookOne", async (req, res) => {
  const booking = req.body;
  const result = await bookingCollection.insertOne(booking);
  res.send(result);
});

// Get a user's bookings
app.get("/mybookings", async (req, res) => {
  const email = req.query.email;
  const bookings = await bookingCollection.find({ email }).toArray();
  res.send(bookings);
});

// Delete a user's booking
app.delete("/mybooking/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const result = await bookingCollection.deleteOne(query);
  res.send(result);
});

// Get all bookings
app.get("/allbookings", async (req, res) => {
  const result = await bookingCollection.find({}).toArray();
  res.send(result);
});

// Get users (optionally filtered by role)
app.get("/users", async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : {};
  const result = await usersCollection.find(filter).toArray();
  res.send(result);
});

// Get user by email
app.get("/user/:email", async (req, res) => {
  const email = req.params.email;
  const result = await usersCollection.findOne({ email });
  res.send(result || {});
});

// Update user profile
app.put("/user/profile/:email", async (req, res) => {
  const email = req.params.email;
  const profileData = req.body;
  const query = { email: email };

  const setFields = {};
  if (profileData.name !== undefined) setFields.name = profileData.name;
  if (profileData.phone !== undefined) setFields.phone = profileData.phone;
  if (profileData.photoURL !== undefined) setFields.photoURL = profileData.photoURL;

  const updateDoc = {
    $set: setFields,
  };

  const options = { upsert: true };
  const result = await usersCollection.updateOne(query, updateDoc, options);
  res.json(result);
});

// Proxy authenticated file payload to Cloudinary (auto detects image/PDF)
app.post("/upload-file", async (req, res) => {
  try {
    const { fileBase64 } = req.body;
    if (!fileBase64) return res.status(400).send({ error: "Missing file string" });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const timestamp = Math.floor(Date.now() / 1000);
    // Signature formula: sha1(timestamp=XX... + api_secret)
    const strToSign = `timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(strToSign).digest("hex");

    const data = new URLSearchParams();
    data.append("file", fileBase64);
    data.append("api_key", apiKey);
    data.append("timestamp", timestamp);
    data.append("signature", signature);

    const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: data,
    });

    const cloudinaryData = await cloudinaryRes.json();

    if (!cloudinaryRes.ok) {
      return res.status(400).send(cloudinaryData);
    }

    res.send({ secure_url: cloudinaryData.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Backend upload proxy failed" });
  }
});

// Update user role
app.put("/user/role/:id", async (req, res) => {
  const id = req.params.id;
  const { role } = req.body;
  const query = { _id: ObjectId(id) };
  const updateDoc = { $set: { role } };
  const result = await usersCollection.updateOne(query, updateDoc);
  res.json(result);
});

// Suspend user
app.put("/user/suspend/:id", async (req, res) => {
  const id = req.params.id;
  const { reason } = req.body;
  const query = { _id: ObjectId(id) };
  const updateDoc = { $set: { isSuspended: true, suspendReason: reason } };
  const result = await usersCollection.updateOne(query, updateDoc);
  res.json(result);
});

// Unsuspend user
app.put("/user/unsuspend/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const updateDoc = { $set: { isSuspended: false, suspendReason: null } };
  const result = await usersCollection.updateOne(query, updateDoc);
  res.json(result);
});

// Edit booking data
app.put("/booking/edit/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const updatedData = req.body;
  const updateDoc = {
    $set: {
      checkIn: updatedData.checkIn,
      checkOut: updatedData.checkOut,
      adult: updatedData.adult,
      child: updatedData.child,
      quantity: updatedData.quantity,
      totalDays: updatedData.totalDays,
      rentCost: updatedData.rentCost,
      // Add any other editable fields here
    },
  };
  const result = await bookingCollection.updateOne(query, updateDoc);
  res.send(result);
});

// Update booking status
app.put("/booking/update/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const updatedStatus = req.body;
  const updateDoc = {
    $set: {
      status: updatedStatus.status,
    },
  };
  if (updatedStatus.roomNumber !== undefined) {
    updateDoc.$set.roomNumber = updatedStatus.roomNumber;
  }
  const options = { upsert: true };
  const result = await bookingCollection.updateOne(query, updateDoc, options);
  res.send(result);
});

// Update booking payment status
app.put("/booking/update/paymentStatus/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const updatedPayment = req.body;
  const updatePayStatus = {
    $set: {
      payment: updatedPayment.payment,
    },
  };
  const options = { upsert: true };
  const result = await bookingCollection.updateOne(query, updatePayStatus, options);
  res.send(result);
});

// Contact form email
app.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // Check if Gmail credentials are configured
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: "Email service is not configured." });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"${name}" <${process.env.GMAIL_USER}>`,
    replyTo: email,
    to: process.env.GMAIL_USER,
    subject: `[VacationRental Contact] ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #F43F5E, #E11D48); padding: 24px; border-radius: 12px 12px 0 0;">
          <h2 style="color: white; margin: 0;">New Contact Message</h2>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 80px;"><strong>From:</strong></td>
              <td style="padding: 8px 0; font-size: 14px;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Subject:</strong></td>
              <td style="padding: 8px 0; font-size: 14px;">${subject}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <div style="font-size: 14px; line-height: 1.6; color: #374151;">
            <p style="margin: 0;"><strong>Message:</strong></p>
            <p style="margin: 8px 0 0; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">Sent from VacationRental Contact Form</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Email sent successfully!" });
  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ error: "Failed to send email. Please try again later." });
  }
});

// ===== Questions / Q&A =====

// Create a question (user)
app.post("/question", async (req, res) => {
  const { title, category, tags, details, userEmail, userName } = req.body;
  if (!title || !details || !userEmail) {
    return res.status(400).json({ error: "Title, details, and email are required." });
  }
  const question = {
    title,
    category: category || "Other",
    tags: Array.isArray(tags) ? tags : [],
    details,
    userEmail,
    userName: userName || "",
    status: "pending",
    reply: "",
    repliedAt: null,
    createdAt: new Date().toISOString(),
  };
  const result = await questionCollection.insertOne(question);
  res.json(result);
});

// Get all questions (admin)
app.get("/questions", async (req, res) => {
  const questions = await questionCollection.find({}).toArray();
  res.json(questions);
});

// Get questions by user email
app.get("/myquestions", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email is required." });
  const questions = await questionCollection.find({ userEmail: email }).toArray();
  res.json(questions);
});

// Admin reply to a question
app.put("/question/reply/:id", async (req, res) => {
  const id = req.params.id;
  const { reply } = req.body;
  if (!reply) return res.status(400).json({ error: "Reply is required." });
  const result = await questionCollection.updateOne(
    { _id: ObjectId(id) },
    { $set: { reply, status: "answered", repliedAt: new Date().toISOString() } }
  );
  res.json(result);
});

// ===== Room Ratings =====

// Submit a room rating (user must have a checkout booking for this room)
app.post("/room-rating", async (req, res) => {
  const { roomId, roomName, email, userName, rating, comment } = req.body;
  if (!roomId || !email || !rating) {
    return res.status(400).json({ error: "roomId, email, and rating are required." });
  }

  // Check user has a checked-out booking for this room
  const hasCheckout = await bookingCollection.findOne({
    email,
    roomName: roomName,
    status: "Checkout",
  });
  if (!hasCheckout) {
    return res.status(403).json({ error: "You can only rate rooms you have checked out from." });
  }

  // One rating per user per room
  const existing = await roomRatingCollection.findOne({ roomId, email });
  if (existing) {
    // Update existing rating
    const result = await roomRatingCollection.updateOne(
      { _id: existing._id },
      { $set: { rating: parseInt(rating), comment: comment || "", updatedAt: new Date().toISOString() } }
    );
    return res.json({ ...result, updated: true });
  }

  const doc = {
    roomId,
    roomName: roomName || "",
    email,
    userName: userName || "",
    rating: parseInt(rating),
    comment: comment || "",
    createdAt: new Date().toISOString(),
  };
  const result = await roomRatingCollection.insertOne(doc);
  res.json(result);
});

// Get all ratings for a room
app.get("/room-ratings/:roomId", async (req, res) => {
  const ratings = await roomRatingCollection.find({ roomId: req.params.roomId }).toArray();
  res.json(ratings);
});

// Get average rating summary for a room
app.get("/room-rating-summary/:roomId", async (req, res) => {
  const ratings = await roomRatingCollection.find({ roomId: req.params.roomId }).toArray();
  if (ratings.length === 0) return res.json({ avg: 0, count: 0 });
  const sum = ratings.reduce((a, r) => a + r.rating, 0);
  res.json({ avg: parseFloat((sum / ratings.length).toFixed(1)), count: ratings.length });
});

// Get average rating summaries for ALL rooms (batch)
app.get("/room-rating-summaries", async (req, res) => {
  const all = await roomRatingCollection.find({}).toArray();
  const map = {};
  all.forEach((r) => {
    if (!map[r.roomId]) map[r.roomId] = { sum: 0, count: 0 };
    map[r.roomId].sum += r.rating;
    map[r.roomId].count += 1;
  });
  const result = {};
  Object.keys(map).forEach((id) => {
    result[id] = { avg: parseFloat((map[id].sum / map[id].count).toFixed(1)), count: map[id].count };
  });
  res.json(result);
});

// ===== Blog Ratings =====

// Submit a blog rating
app.post("/blog-rating", async (req, res) => {
  const { blogId, email, rating } = req.body;
  if (!blogId || !email || !rating) {
    return res.status(400).json({ error: "blogId, email, and rating are required." });
  }

  const existing = await blogRatingCollection.findOne({ blogId, email });
  if (existing) {
    const result = await blogRatingCollection.updateOne(
      { _id: existing._id },
      { $set: { rating: parseInt(rating), updatedAt: new Date().toISOString() } }
    );
    return res.json({ ...result, updated: true });
  }

  const doc = {
    blogId,
    email,
    rating: parseInt(rating),
    createdAt: new Date().toISOString(),
  };
  const result = await blogRatingCollection.insertOne(doc);
  res.json(result);
});

// Get average rating summary for a blog
app.get("/blog-rating-summary/:blogId", async (req, res) => {
  const ratings = await blogRatingCollection.find({ blogId: req.params.blogId }).toArray();
  if (ratings.length === 0) return res.json({ avg: 0, count: 0 });
  const sum = ratings.reduce((a, r) => a + r.rating, 0);
  res.json({ avg: parseFloat((sum / ratings.length).toFixed(1)), count: ratings.length });
});

// Get user specific rating for a blog
app.get("/blog-rating/:blogId", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.json(null);
  const rating = await blogRatingCollection.findOne({ blogId: req.params.blogId, email });
  res.json(rating);
});

app.listen(port, () => {
  console.log("Server is running on port " + port);
});

module.exports = app;
