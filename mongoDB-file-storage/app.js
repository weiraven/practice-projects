const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const { MongoClient, GridFSBucket } = require('mongodb');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;
const client = new MongoClient(mongoURI);

const app = express();
const upload = multer({ dest: 'uploads/' }); // Temporarily store files

app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

let bucket; // Declare bucket globally

async function createGridFSBucket() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('megazord');
    bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    // Use the bucket to perform operations on files
  } catch (error) {
    console.error('Could not connect to MongoDB', error);
  }
}

createGridFSBucket().catch(console.error);

// Load form
app.get('/', (req, res) => {
  const success = req.query.success;
  res.render('index', { success: success });
});

// Handle file uploading
app.post('/upload', upload.single('file'), (req, res) => {
  if (!bucket) {
    return res.status(500).send('Could not access GridFS Bucket');
  }

  const filePath = path.join(__dirname, 'uploads', req.file.filename);
  const readStream = fs.createReadStream(filePath);
  const uploadStream = bucket.openUploadStream(req.file.originalname);

  readStream.pipe(uploadStream)
    .on('error', (error) => res.status(500).send(error))
    .on('finish', () => {
      // Delete the file from the temporary storage (optional)
      fs.unlink(filePath, (err) => {
        if (err) console.error('Failed to delete temp file', err);
      });
      // Redirect to index with success message
      res.redirect('/?success=true');
    });
});

const port = 5000;
app.listen(port, () => console.log(`Server started on port ${port}`));