const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
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
    res.send({ message: 'File deleted successfully' });
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
  if (!bucket) {
    return res.status(500).send('Could not access GridFS Bucket');
  }

  bucket.find({_id: new ObjectId(req.params.id)}).toArray((err, files) => {
    if (err) {
      return res.status(500).send(error.message);
    }
    if (!files[0] || files.length === 0) {
      return res.status(404).send('No file found');
    }

    res.setHeader('Content-Disposition', 'attachment; filename="' + files[0].filename + '"');
    
    const downloadStream = bucket.openDownloadStream(files[0]._id);
    downloadStream.on('error', function(error) {
      res.status(404).send('File not found');
    });
    downloadStream.pipe(res);
  });
});

const port = 5000;
app.listen(port, () => console.log(`Server started on port ${port}`));