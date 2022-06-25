const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

const cors = require('cors');
app.use(cors());
require('dotenv').config()

app.get('/', (req, res) => {
    res.send(`Server is running on ${port}`)
});

app.listen(port, () => {
    console.log('Server is running on port ' + port);
})

