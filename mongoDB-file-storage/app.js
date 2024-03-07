const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
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
    return res.status(500).json({ error: 'Could not access GridFS Bucket' });
  }

  const filePath = path.join(__dirname, 'uploads', req.file.filename);
  const readStream = fs.createReadStream(filePath);
  const uploadStream = bucket.openUploadStream(req.file.originalname);

  uploadStream.on('error', (error) => {
    console.error('Upload Stream Error:', error);
    res.status(500).json({ error: 'Error uploading file' });
  });

  readStream.pipe(uploadStream).on('finish', () => {
    // Optionally, delete the file from the temporary storage
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Failed to delete temp file:', err);
      }
      
      // Respond with JSON including a success message
      res.json({ message: 'File uploaded successfully!' });
    });
  });
});


// Fetch list of stored files
app.get('/files', async (req, res) => {
  if (!bucket) {
    return res.status(500).send('Could not access GridFS Bucket');
  }

  try {
    const files = await bucket.find().toArray();
    res.json(files.map(file => {
      return {
        filename: file.filename,
        fileId: file._id,
      };
    }));
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Delete file endpoint
app.delete('/files/:id', async (req, res) => {
  try {
    await bucket.delete(new ObjectId(req.params.id));
    res.send({ message: 'File has been deleted!' });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// File view endpoint
app.get('/files/view/:id', (req, res) => {
  if (!bucket) {
    return res.status(500).send('Could not access GridFS Bucket');
  }

  const viewStream = bucket.openDownloadStream(new ObjectId(req.params.id));

  viewStream.on('error', function(error) {
    res.status(404).send('File not found');
  });

  viewStream.pipe(res);
});

// File download endpoint
app.get('/files/download/:id', (req, res) => {
  const fileId = new ObjectId(req.params.id);

  bucket.openDownloadStream(fileId)
    .on('file', (file) => {
      // Attempt to set a more accurate Content-Type based on the file's original extension
      const contentType = mime.lookup(file.filename) || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    })
    .on('error', (error) => {
      console.error('Stream error:', error);
      return res.status(404).send('File not found');
    })
    .pipe(res);
});

const port = 5000;
app.listen(port, () => console.log(`Server started on port ${port}`));