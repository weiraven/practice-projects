from dotenv import load_dotenv
from flask import Flask, request, render_template, jsonify, send_file, abort
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
from werkzeug.utils import secure_filename
import gridfs
import os

load_dotenv()

app = Flask(__name__)
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
print("Configured MongoDB URI:", app.config["MONGO_URI"])

mongo = PyMongo(app)
print("MongoDB Connection:", mongo.cx)
print("MongoDB Database:", mongo.db)

fs = None

def get_fs():
    global fs
    if fs is None:
        # Initialize GridFS only if the database connection has been established
        if mongo.db is not None:
            fs = gridfs.GridFS(mongo.db, collection='flask-uploads')
        else:
            raise Exception('Database not available')
    return fs

@app.route('/')
def index():
    return render_template('index.html')

### Uploading Files

@app.route('/upload', methods=['POST'])
def upload():
    try:
        fs = get_fs()
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        filename = secure_filename(file.filename)
        file_id = fs.put(file, filename=filename)
        return jsonify({'message': 'File uploaded successfully!', 'file_id': str(file_id)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

### File Listing

@app.route('/files', methods=['GET'])
def list_files():
    fs = get_fs()
    files = fs.find()
    results = [{'filename': file.filename, 'fileId': str(file._id)} for file in files]
    return jsonify(results)

### File Download

@app.route('/files/download/<file_id>', methods=['GET'])
def download(file_id):
    try:
        fs = get_fs()
        file_id = ObjectId(file_id)
        grid_out = fs.get(file_id)
        return send_file(grid_out, attachment_filename=grid_out.filename, as_attachment=True)
    except gridfs.errors.NoFile:
        abort(404)

### File View

@app.route('/files/view/<file_id>', methods=['GET'])
def view_file(file_id):
    try:
        fs = get_fs()
        file_id = ObjectId(file_id)
        grid_out = fs.get(file_id)
        return send_file(grid_out, attachment_filename=grid_out.filename)
    except gridfs.errors.NoFile:
        abort(404)

### Delete File

@app.route('/files/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    try:
        fs = get_fs()
        file_id = ObjectId(file_id)
        fs.delete(file_id)
        return jsonify({'message': 'File has been deleted!'})
    except gridfs.errors.NoFile:
        return jsonify({'error': 'File not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)